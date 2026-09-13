"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type SupportActionResult = {
  error?: string;
  success?: boolean;
  ticketId?: string;
  message?: string;
};

export async function createSupportTicketAction(
  input: { category: string; subject: string; message: string } | FormData
): Promise<SupportActionResult> {
  let category: string;
  let subject: string;
  let message: string;

  if (input instanceof FormData) {
    category = input.get("category") as string;
    subject = input.get("subject") as string;
    message = input.get("message") as string;
  } else {
    category = input.category;
    subject = input.subject;
    message = input.message;
  }

  if (!category || !subject || !message) {
    return { error: "Category, subject, and message are required." };
  }

  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  if (cleanSubject.length < 3 || cleanSubject.length > 150) {
    return { error: "Subject must be between 3 and 150 characters." };
  }
  if (cleanMessage.length < 1 || cleanMessage.length > 3000) {
    return { error: "Message must be between 1 and 3000 characters." };
  }

  const supabase = await createClient();

  logger.info("support.create_ticket_initiated", {
    operation: "createSupportTicketAction",
    extra: { category, subject: cleanSubject },
  });

  const { data, error } = await supabase.rpc("create_support_ticket", {
    category,
    subject: cleanSubject,
    message: cleanMessage,
  });

  if (error) {
    logger.warn("support.create_ticket_failed", {
      operation: "createSupportTicketAction",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/account/support");
  return { success: true, ticketId: data as string };
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

  const cleanContent = content.trim();
  if (!cleanContent) {
    return { error: "Reply cannot be empty." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("customer_reply_support_ticket", {
    ticket_id: ticketId,
    content: cleanContent,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/account/support/${ticketId}`);
  revalidatePath("/account/support");
  return { success: true };
}
