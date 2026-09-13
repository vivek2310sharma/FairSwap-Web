"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type AdminActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function assignStaffRoleAction(
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const targetUserId = formData.get("targetUserId") as string;
  const role = formData.get("role") as string;

  if (!targetUserId || !role) {
    return { error: "User ID and role are required." };
  }

  logger.info("admin.assign_staff_role_initiated", {
    operation: "admin_assign_staff_role",
    extra: { target_user_id: targetUserId, role },
  });

  const supabase = await createClient();

  // Call the exposed SECURITY INVOKER RPC in public, which delegates to app_security.impl_*
  const { error } = await supabase.rpc("admin_assign_staff_role", {
    p_target_user_id: targetUserId,
    p_new_role: role,
  });

  if (error) {
    logger.warn("admin.assign_staff_role_failed", {
      operation: "admin_assign_staff_role",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  logger.info("admin.assign_staff_role_completed", {
    operation: "admin_assign_staff_role",
    extra: { target_user_id: targetUserId, role },
  });

  revalidatePath("/admin/staff");
  revalidatePath("/admin/audit");
  return { success: true, message: "Staff role assigned successfully." };
}

export async function revokeStaffRoleAction(
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const targetUserId = formData.get("targetUserId") as string;

  if (!targetUserId) {
    return { error: "User ID is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_revoke_staff_role", {
    p_target_user_id: targetUserId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/staff");
  revalidatePath("/admin/audit");
  return { success: true, message: "Staff role revoked successfully." };
}

export async function updateAccountStatusAction(
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const targetUserId = formData.get("targetUserId") as string;
  const newStatus = formData.get("newStatus") as string;
  const reason = (formData.get("reason") as string) || "Administrative action";

  if (!targetUserId || !newStatus) {
    return { error: "User ID and new status are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_update_user_account_status", {
    p_target_user_id: targetUserId,
    p_new_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/audit");
  return { success: true, message: "User account status updated successfully." };
}

export async function resolvePrivacyRequestAction(
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const requestId = formData.get("requestId") as string;
  const newStatus = formData.get("newStatus") as string;
  const notes = (formData.get("notes") as string) || "Processed by staff";

  if (!requestId || !newStatus) {
    return { error: "Request ID and new status are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_resolve_privacy_request", {
    p_request_id: requestId,
    p_new_status: newStatus,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/audit");
  revalidatePath("/account/privacy");
  return { success: true, message: "Privacy request status updated." };
}
