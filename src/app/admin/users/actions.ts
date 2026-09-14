"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateUserStatusSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID format"),
  newStatus: z.enum(["active", "suspended"], {
    errorMap: () => ({ message: "Status must be either 'active' or 'suspended'" }),
  }),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type UserModerationResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function updateUserAccountStatusAction(
  prevState: UserModerationResult | null,
  formData: FormData
): Promise<UserModerationResult> {
  const rawTargetUserId = formData.get("targetUserId");
  const rawNewStatus = formData.get("newStatus");
  const rawReason = formData.get("reason");

  const parseResult = updateUserStatusSchema.safeParse({
    targetUserId: rawTargetUserId,
    newStatus: rawNewStatus,
    reason: rawReason,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors.map((e) => e.message).join("; ");
    return { error: errorMsg };
  }

  const { targetUserId, newStatus, reason } = parseResult.data;

  logger.info("admin.update_user_account_status_initiated", {
    operation: "admin_update_user_account_status",
    extra: { target_user_id: targetUserId, new_status: newStatus },
  });

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_update_user_account_status", {
    p_target_user_id: targetUserId,
    p_new_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    logger.warn("admin.update_user_account_status_failed", {
      operation: "admin_update_user_account_status",
      error_code: error.code || "RPC_ERROR",
      message: error.message,
    });
    return { error: error.message };
  }

  logger.info("admin.update_user_account_status_completed", {
    operation: "admin_update_user_account_status",
    extra: { target_user_id: targetUserId, new_status: newStatus },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/admin/audit");

  return {
    success: true,
    message: `Account status updated to ${newStatus} successfully.`,
  };
}
