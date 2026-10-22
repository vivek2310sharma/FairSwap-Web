"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { logger } from "@/lib/logger";

const NOTIFICATION_ACTION_ERROR = "We could not update your notifications. Please try again.";

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/notifications");
  if (!guard.allowed) {
    return {
      success: false,
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const { error } = await supabase.rpc("mark_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    logger.warn("notifications.mark_read_failed", {
      operation: "markNotificationReadAction",
      details: { rpc_error_code: error.code || "RPC_ERROR" },
    });
    return { success: false, error: NOTIFICATION_ACTION_ERROR };
  }

  revalidatePath("/account/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/notifications");
  if (!guard.allowed) {
    return {
      success: false,
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    logger.warn("notifications.mark_all_read_failed", {
      operation: "markAllNotificationsReadAction",
      details: { rpc_error_code: error.code || "RPC_ERROR" },
    });
    return { success: false, error: NOTIFICATION_ACTION_ERROR };
  }

  revalidatePath("/account/notifications");
  return { success: true };
}
