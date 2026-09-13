"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_notification_read", {
    notification_id: notificationId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/notifications");
  return { success: true };
}
