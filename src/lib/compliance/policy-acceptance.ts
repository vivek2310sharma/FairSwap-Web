import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

export type PolicyAcceptanceStatus =
  | { status: "current" }
  | { status: "stale" }
  | { status: "error"; error: string };

export type PolicyAcceptanceGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      requiresPolicyReview: boolean;
      redirectTo?: string;
      error: string;
    };

/**
 * Checks whether the currently authenticated user has accepted the authoritative Public Beta policy baseline.
 * Explicitly distinguishes:
 * - 'current': baseline accepted in user_accounts or policy_acceptance_records
 * - 'stale': historical pilot user requiring one-time Public Beta re-acceptance
 * - 'error': RPC/database check failed (distinguished to avoid redirect loops during outages)
 */
export async function checkPolicyAcceptanceStatus(
  supabase: SupabaseClient
): Promise<PolicyAcceptanceStatus> {
  try {
    const { data, error } = await supabase.rpc("has_current_policy_acceptance");

    if (error) {
      logger.error("compliance.policy_acceptance_check_failed", {
        operation: "checkPolicyAcceptanceStatus",
        error_code: error.code || "RPC_ERROR",
      });
      return { status: "error", error: error.message || "Failed to verify policy acceptance." };
    }

    if (data === true) {
      return { status: "current" };
    }

    return { status: "stale" };
  } catch (err) {
    logger.error("compliance.policy_acceptance_check_exception", {
      operation: "checkPolicyAcceptanceStatus",
      error_code: (err as Error)?.name || "EXCEPTION",
    });
    return {
      status: "error",
      error: (err as Error)?.message || "Unexpected error verifying policy acceptance.",
    };
  }
}

/**
 * Reusable server-side acceptance guard for Server Actions and RPC-facing application mutations.
 * Enforces that stale pilot accounts cannot perform authenticated FairSwap mutations until
 * one-time Public Beta re-acceptance is complete.
 */
export async function requireCurrentPolicyAcceptance(
  supabase: SupabaseClient,
  currentPath: string = "/account"
): Promise<PolicyAcceptanceGuardResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const safeNext = sanitizeRedirectPath(currentPath, "/account");
    return {
      allowed: false,
      requiresPolicyReview: false,
      redirectTo: `/auth/sign-in?next=${encodeURIComponent(safeNext)}`,
      error: "Please sign in to continue.",
    };
  }

  const check = await checkPolicyAcceptanceStatus(supabase);

  if (check.status === "current") {
    return { allowed: true };
  }

  if (check.status === "stale") {
    const safeNext = sanitizeRedirectPath(currentPath, "/account");
    return {
      allowed: false,
      requiresPolicyReview: true,
      redirectTo: `/account/policy-review?next=${encodeURIComponent(safeNext)}`,
      error: "Please review and accept updated Public Beta policies to continue.",
    };
  }

  // check.status === "error"
  // Safe failure: reject mutation, but do NOT redirect to policy review to prevent redirect loops.
  return {
    allowed: false,
    requiresPolicyReview: false,
    error: "Unable to verify policy acceptance status. Please try again shortly.",
  };
}
