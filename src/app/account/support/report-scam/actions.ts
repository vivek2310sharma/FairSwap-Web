"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { SCAM_REPORT_COPY } from "@/lib/account/copy";
import {
  isDefinitiveRpcFailure,
  mapSupportRpcError,
  scamReportInputSchema,
  supportTicketIdSchema,
} from "@/lib/support/tickets";

export type ScamReportState = {
  error?: string;
  /** True only when the RPC returned a valid ticket id; `ticketId` is always set with it. */
  success?: boolean;
  ticketId?: string;
  /**
   * The request may or may not have created a ticket (network failure, or a response without a
   * valid id). The UI must not claim success and must tell the user to check their tickets first.
   */
  uncertain?: boolean;
  redirectTo?: string;
} | null;

const REPORT_PATH = "/account/support/report-scam";

/**
 * Files a general "Report a scam" request as a `safety` support ticket through the
 * existing `create_support_ticket` RPC. It is NOT a row in `public.reports`: that table
 * requires a listing, user or message target, and no dummy target is ever supplied.
 * The ticket is reviewed through the Admin support queue.
 *
 * The category is fixed here; any `category` value in the submitted form is ignored.
 * Subject and message are never logged.
 */
export async function submitScamReportAction(
  _prevState: ScamReportState,
  formData: FormData
): Promise<ScamReportState> {
  const parsed = scamReportInputSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, REPORT_PATH);
  if (!guard.allowed) {
    return { error: guard.error, redirectTo: guard.redirectTo };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      error: "Please sign in to report a scam.",
      redirectTo: `/auth/sign-in?next=${encodeURIComponent(REPORT_PATH)}`,
    };
  }
  const userId = userData.user.id;

  // The Backend lets suspended accounts file moderation appeals only, so refuse early with
  // a clear message. The RPC re-checks this; this is a UX guard, not the authority.
  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError || !account) {
    return { error: "We could not verify your account status. Please try again shortly." };
  }
  if (account.account_status !== "active") {
    return {
      error:
        account.account_status === "suspended"
          ? "Your account is suspended. You can only submit a moderation appeal from Help & safety."
          : "Your account cannot submit reports right now.",
    };
  }

  logger.info("support.scam_report_initiated", { operation: "submitScamReportAction" });

  let data: unknown;
  let error: { code?: string; message: string } | null;
  try {
    ({ data, error } = await supabase.rpc("create_support_ticket", {
      category: "safety",
      subject: parsed.data.subject,
      message: parsed.data.message,
    }));
  } catch {
    // The request may have reached the database before the connection failed.
    logger.warn("support.scam_report_outcome_unknown", {
      operation: "submitScamReportAction",
      details: { reason: "rpc_threw" },
    });
    revalidatePath("/account/support");
    return { error: SCAM_REPORT_COPY.uncertainBody, uncertain: true };
  }

  if (error) {
    if (!isDefinitiveRpcFailure(error)) {
      // No database error code (for example a dropped connection): the ticket may exist.
      logger.warn("support.scam_report_outcome_unknown", {
        operation: "submitScamReportAction",
        details: { reason: "rpc_error_without_code" },
      });
      revalidatePath("/account/support");
      return { error: SCAM_REPORT_COPY.uncertainBody, uncertain: true };
    }
    logger.warn("support.scam_report_failed", {
      operation: "submitScamReportAction",
      details: { rpc_error_code: error.code },
    });
    return { error: mapSupportRpcError(error.message) };
  }

  const ticketId = supportTicketIdSchema.safeParse(data);
  if (!ticketId.success) {
    // No error but no valid ticket id either: never claim success or invent a link.
    logger.error("support.scam_report_missing_ticket_id", undefined, {
      operation: "submitScamReportAction",
    });
    revalidatePath("/account/support");
    return { error: SCAM_REPORT_COPY.uncertainBody, uncertain: true };
  }

  revalidatePath("/account/support");
  return {
    success: true,
    ticketId: ticketId.data,
    redirectTo: `/account/support/${ticketId.data}`,
  };
}
