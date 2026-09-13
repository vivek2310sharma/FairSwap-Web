"use server";

import { createClient } from "@/lib/supabase/server";
import { orchestrateAccountDeletion } from "@/lib/privacy/deletion-orchestrator";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type PrivacyActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function processAccountDeletionAction(
  requestId: string
): Promise<PrivacyActionResult> {
  const supabase = await createClient();

  // Validate caller has administrator role with AAL2
  const { data: claimsData } = await supabase.auth.getClaims();
  const aal = claimsData?.claims?.aal as string | undefined;

  if (aal !== "aal2") {
    return { error: "Forbidden: requires active administrator with AAL2." };
  }

  const { data: staffRole } = await supabase.rpc("get_my_staff_role");
  if (staffRole !== "administrator") {
    return { error: "Forbidden: only administrators can process account deletions." };
  }

  logger.info("admin.account_deletion_triggered", {
    operation: "processAccountDeletionAction",
    extra: { request_id: requestId },
  });

  const result = await orchestrateAccountDeletion(requestId);

  if (!result.success) {
    return { error: result.error || "Account deletion failed" };
  }

  revalidatePath("/admin/audit");
  revalidatePath("/admin/staff");
  return { success: true, message: "Account deletion successfully orchestrated." };
}
