"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";

export type MessageActionResult = {
  error?: string;
  success?: boolean;
  conversationId?: string;
  messageId?: string;
  message?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
};

export async function startConversationAction(
  listingId: string,
  content: string,
  clientRequestId: string
): Promise<MessageActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/listings/${listingId}`);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "Please sign in to message the seller." };
  }

  const cleanContent = content.trim();
  if (!cleanContent) {
    return { error: "Message cannot be empty." };
  }

  logger.info("messaging.start_conversation_initiated", {
    operation: "startConversationAction",
    extra: { listing_id: listingId, buyer_id: userData.user.id },
  });

  const { data, error } = await supabase.rpc("start_conversation", {
    listing_id: listingId,
    content: cleanContent,
    client_request_id: clientRequestId,
  });

  if (error) {
    logger.warn("messaging.start_conversation_failed", {
      operation: "startConversationAction",
      error_code: error.code || "RPC_ERROR",
      extra: { listing_id: listingId },
    });
    return { error: error.message };
  }

  const convId = (data as { conversation_id?: string })?.conversation_id;

  revalidatePath("/account/messages");
  if (convId) {
    revalidatePath(`/account/messages/${convId}`);
  }

  return { success: true, conversationId: convId };
}

export async function sendMessageAction(
  conversationId: string,
  content: string,
  clientRequestId: string
): Promise<MessageActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/account/messages/${conversationId}`);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const cleanContent = content.trim();
  if (!cleanContent) {
    return { error: "Message cannot be empty." };
  }

  logger.info("messaging.send_message_initiated", {
    operation: "sendMessageAction",
    extra: { conversation_id: conversationId },
  });

  const { data, error } = await supabase.rpc("send_message", {
    conversation_id: conversationId,
    content: cleanContent,
    client_request_id: clientRequestId,
  });

  if (error) {
    logger.warn("messaging.send_message_failed", {
      operation: "sendMessageAction",
      error_code: error.code || "RPC_ERROR",
      extra: { conversation_id: conversationId },
    });
    return { error: error.message };
  }

  const msgId = typeof data === "object" && data ? (data as { message_id?: string; id?: string }).message_id || (data as { id?: string }).id : (data as string);

  revalidatePath(`/account/messages/${conversationId}`);
  revalidatePath("/account/messages");
  return { success: true, messageId: msgId };
}

export async function markConversationReadAction(
  conversationId: string,
  messageId: string
): Promise<MessageActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_conversation_read", {
    conversation_id: conversationId,
    message_id: messageId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/account/messages/${conversationId}`);
  revalidatePath("/account/messages");
  return { success: true };
}

export async function blockUserAction(
  blockedUserId: string,
  reason?: string
): Promise<MessageActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/messages");
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const { error } = await supabase.rpc("block_user", {
    blocked_user_id: blockedUserId,
    reason: reason || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/messages");
  return { success: true, message: "User blocked successfully." };
}

export async function unblockUserAction(
  blockedUserId: string
): Promise<MessageActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("unblock_user", {
    blocked_user_id: blockedUserId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account/messages");
  return { success: true, message: "User unblocked successfully." };
}
