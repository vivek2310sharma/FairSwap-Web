"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { revalidatePath } from "next/cache";

const PolicyReacceptanceSchema = z.object({
  termsAccepted: z.literal("on", {
    errorMap: () => ({
      message:
        "You must accept the Terms of Service and Acceptable Use Policy, and acknowledge the Privacy Policy.",
    }),
  }),
  ageConfirmed: z.literal("on", {
    errorMap: () => ({
      message: "You must confirm that you are at least 18 years of age to continue.",
    }),
  }),
  next: z.string().optional(),
});

export type PolicyReacceptanceActionResult = {
  error?: string;
  success?: boolean;
};

export async function recordPolicyReacceptanceAction(
  prevState: PolicyReacceptanceActionResult | null,
  formData: FormData
): Promise<PolicyReacceptanceActionResult> {
  const parseResult = PolicyReacceptanceSchema.safeParse({
    termsAccepted: formData.get("termsAccepted"),
    ageConfirmed: formData.get("ageConfirmed"),
    next: formData.get("next"),
  });

  if (!parseResult.success) {
    logger.warn("compliance.policy_reacceptance_validation_failed", {
      operation: "recordPolicyReacceptanceAction",
    });
    const errorMsg = parseResult.error.errors.map((e) => e.message).join(" ");
    return { error: errorMsg };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/sign-in");
  }

  const { error: rpcError } = await supabase.rpc("record_policy_reacceptance", {
    terms_and_privacy_accepted: true,
    age_confirmed: true,
  });

  if (rpcError) {
    logger.error("compliance.policy_reacceptance_rpc_failed", {
      operation: "recordPolicyReacceptanceAction",
      error_code: rpcError.code || "RPC_ERROR",
    });
    return { error: "Failed to record policy re-acceptance. Please try again." };
  }

  logger.info("compliance.policy_reacceptance_recorded", {
    operation: "recordPolicyReacceptanceAction",
    user_id: user.id,
  });

  revalidatePath("/", "layout");

  const rawNext = formData.get("next");
  const safeNext = sanitizeRedirectPath(
    typeof rawNext === "string" ? rawNext : null,
    "/account"
  );
  redirect(safeNext);
}
