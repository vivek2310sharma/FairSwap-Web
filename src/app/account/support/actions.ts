"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import {
  createSupportTicketInputSchema,
  mapSupportRpcError,
  SUPPORT_LIMITS,
  supportTicketIdSchema,
} from "@/lib/support/tickets";

export type SupportActionResult = {
  error?: string;
  success?: boolean;
  ticketId?: string;
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

  const { data, error } = await supabase.rpc("create_support_ticket", {
    category: parsed.data.category,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  if (error) {
    logger.warn("support.create_ticket_failed", {
      operation: "createSupportTicketAction",
      details: { rpc_error_code: error.code || "RPC_ERROR" },
    });
    return { error: mapSupportRpcError(error.message) };
  }

  const ticketId = supportTicketIdSchema.safeParse(data);
  revalidatePath("/account/support");
  return ticketId.success ? { success: true, ticketId: ticketId.data } : { success: true };
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

  const { error } = await supabase.rpc("customer_reply_support_ticket", {
    ticket_id: parsedId.data,
    content: cleanContent,
  });

  if (error) {
    logger.warn("support.customer_reply_failed", {
      operation: "customerReplySupportTicketAction",
      details: { rpc_error_code: error.code || "RPC_ERROR" },
    });
    return { error: mapSupportRpcError(error.message) };
  }

  revalidatePath(`/account/support/${ticketId}`);
  revalidatePath("/account/support");
  return { success: true };
}
