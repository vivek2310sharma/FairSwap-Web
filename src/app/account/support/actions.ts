"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  createSupportTicketInputSchema,
  isDefinitiveRpcFailure,
  mapSupportRpcError,
  SUPPORT_GENERIC_NETWORK_MESSAGE,
  SUPPORT_LIMITS,
  SUPPORT_UNCERTAIN_MESSAGE,
  supportTicketIdSchema,
} from "@/lib/support/tickets";

export type SupportActionResult = {
  error?: string;
  success?: boolean;
  ticketId?: string;
  /** The request may or may not have created a ticket; the UI must not confirm success. */
  uncertain?: boolean;
  message?: string;
};

export async function createSupportTicketAction(
  input: { category: string; subject: string; message: string } | FormData
): Promise<SupportActionResult> {
  const raw =
    input instanceof FormData
      ? {
          category: input.get("category"),
          subject: input.get("subject"),
          message: input.get("message"),
        }
      : input;

  const parsed = createSupportTicketInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid support request." };
  }

  const supabase = await createClient();

  // Deliberately no subject/message in logs: tickets can contain personal or fraud details.
  logger.info("support.create_ticket_initiated", {
    operation: "createSupportTicketAction",
    details: { category: parsed.data.category },
  });

  let data: unknown;
  let error: { code?: string; message: string } | null;
  try {
    ({ data, error } = await supabase.rpc("create_support_ticket", {
      category: parsed.data.category,
      subject: parsed.data.subject,
      message: parsed.data.message,
    }));
  } catch {
    // The request may have reached the database before the connection failed.
    logger.warn("support.create_ticket_outcome_unknown", {
      operation: "createSupportTicketAction",
      details: { reason: "rpc_threw" },
    });
    revalidatePath("/account/support");
    return { error: SUPPORT_UNCERTAIN_MESSAGE, uncertain: true };
  }

  if (error) {
    if (!isDefinitiveRpcFailure(error)) {
      // No database error code (for example a dropped connection): the ticket may exist.
      logger.warn("support.create_ticket_outcome_unknown", {
        operation: "createSupportTicketAction",
        details: { reason: "rpc_error_without_code" },
      });
      revalidatePath("/account/support");
      return { error: SUPPORT_UNCERTAIN_MESSAGE, uncertain: true };
    }
    logger.warn("support.create_ticket_failed", {
      operation: "createSupportTicketAction",
      details: { rpc_error_code: error.code },
    });
    return { error: mapSupportRpcError(error.message) };
  }

  const ticketId = supportTicketIdSchema.safeParse(data);
  revalidatePath("/account/support");
  if (!ticketId.success) {
    // No error but no valid ticket id: never confirm success or invent a link.
    logger.error("support.create_ticket_missing_ticket_id", undefined, {
      operation: "createSupportTicketAction",
    });
    return { error: SUPPORT_UNCERTAIN_MESSAGE, uncertain: true };
  }

  return { success: true, ticketId: ticketId.data };
}

export async function customerReplySupportTicketAction(
  param1: string | { ticketId: string; content: string },
  param2?: string
): Promise<SupportActionResult> {
  let ticketId: string;
  let content: string;

  if (typeof param1 === "object" && param1 !== null) {
    ticketId = param1.ticketId;
    content = param1.content;
  } else {
    ticketId = param1;
    content = param2 || "";
  }

  const parsedId = supportTicketIdSchema.safeParse(ticketId);
  if (!parsedId.success) {
    return { error: "Invalid support ticket." };
  }

  const cleanContent = content.trim();
  if (!cleanContent) {
    return { error: "Reply cannot be empty." };
  }
  if (cleanContent.length > SUPPORT_LIMITS.messageMax) {
    return { error: `Reply cannot exceed ${SUPPORT_LIMITS.messageMax} characters.` };
  }

  const supabase = await createClient();

  let error: { code?: string; message: string } | null;
  try {
    ({ error } = await supabase.rpc("customer_reply_support_ticket", {
      ticket_id: parsedId.data,
      content: cleanContent,
    }));
  } catch {
    logger.warn("support.customer_reply_failed", {
      operation: "customerReplySupportTicketAction",
      details: { reason: "rpc_threw" },
    });
    return { error: SUPPORT_GENERIC_NETWORK_MESSAGE };
  }

  if (error) {
    logger.warn("support.customer_reply_failed", {
      operation: "customerReplySupportTicketAction",
      details: { rpc_error_code: error.code || "RPC_ERROR" },
    });
    return {
      error: isDefinitiveRpcFailure(error)
        ? mapSupportRpcError(error.message)
        : SUPPORT_GENERIC_NETWORK_MESSAGE,
    };
  }

  revalidatePath(`/account/support/${ticketId}`);
  revalidatePath("/account/support");
  return { success: true };
}
