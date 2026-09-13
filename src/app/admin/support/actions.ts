"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type AdminSupportActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function staffReplySupportTicketAction(
  ticketId: string,
  content: string,
  isInternalNote: boolean
): Promise<AdminSupportActionResult> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    return { error: "Reply content cannot be empty." };
  }

  const supabase = await createClient();

  logger.info("admin.support_reply_initiated", {
    operation: "staffReplySupportTicketAction",
    extra: { ticket_id: ticketId, is_internal_note: isInternalNote },
  });

  let error;
  if (isInternalNote) {
    const res = await supabase.rpc("admin_add_ticket_internal_note", {
      ticket_id: ticketId,
      content: cleanContent,
    });
    error = res.error;
  } else {
    const res = await supabase.rpc("admin_reply_support_ticket", {
      ticket_id: ticketId,
      content: cleanContent,
    });
    error = res.error;
  }

  if (error) {
    logger.warn("admin.support_reply_failed", {
      operation: "staffReplySupportTicketAction",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  return {
    success: true,
    message: isInternalNote ? "Internal note added." : "Reply sent to customer.",
  };
}

export async function updateTicketStatusAction(
  ticketId: string,
  status: "open" | "in_progress" | "awaiting_user" | "resolved" | "closed",
  priority: "low" | "normal" | "high" | "urgent",
  assignedTo?: string | null
): Promise<AdminSupportActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_update_ticket_status", {
    ticket_id: ticketId,
    status,
    priority,
    assigned_to: assignedTo || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  return { success: true, message: "Ticket updated successfully." };
}
