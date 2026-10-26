import "server-only";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { findingSchema, inboxPageSchema, inboxRequestSchema, messagesPageSchema, messagesRequestSchema, uuid, type Finding, type ChatError, type InboxPage, type MessagesPage, type Result } from "./contracts";

export function isChatV2Enabled(): boolean { return process.env.FAIRSWAP_CHAT_V2_INBOX_ENABLED === "true"; }
function classify(error: { code?: string }): ChatError {
  if (error.code === "42501") return "forbidden";
  if (error.code === "55000") return "disabled";
  if (error.code === "22023") return "invalid";
  return "unavailable";
}
async function session() {
  if (!isChatV2Enabled()) return { error: "disabled" as const };
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: "unauthenticated" as const };
  return { db, userId: data.user.id };
}
export async function readInbox(input: unknown): Promise<Result<InboxPage>> {
  const parsed = inboxRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  try {
    const auth = await session(); if (auth.error) return { error: auth.error };
    const request = parsed.data;
    const { data, error } = await auth.db.rpc("chat_v2_inbox", { tab: request.tab, page_size: 30,
      cursor_at: request.cursor?.at ?? null, cursor_id: request.cursor?.id ?? null,
      listing_id: request.listingId, query_text: request.query, unread_only: request.unread });
    if (error) return { error: classify(error) };
    const page = inboxPageSchema.safeParse(data);
    return page.success ? { data: page.data } : { error: "unavailable" };
  } catch { return { error: "unavailable" }; }
}
export async function readMessages(input: unknown): Promise<Result<MessagesPage>> {
  const parsed = messagesRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  try {
    const auth = await session(); if (auth.error) return { error: auth.error };
    const { conversationId, cursor } = parsed.data;
    const { data, error } = await auth.db.rpc("chat_v2_messages", { conversation_id: conversationId, page_size: 50,
      cursor_at: cursor?.at ?? null, cursor_id: cursor?.id ?? null });
    if (error) return { error: classify(error) };
    const page = messagesPageSchema.safeParse(data);
    if (!page.success || page.data.items.some(row => row.conversation_id !== conversationId)) return { error: "unavailable" };
    // Only IDs actually returned by the authorized RPC enter the findings query.
    const inbound = page.data.items.filter(row => row.sender_id !== auth.userId).map(row => row.id);
    let findings: MessagesPage["findings"] = [];
    if (inbound.length) {
      const result = await auth.db.from("message_safety_findings")
        .select("message_id,recipient_id,rule_version,rule_ids").eq("recipient_id", auth.userId).in("message_id", inbound);
      if (result.error) return { error: classify(result.error) };
      const rows = findingSchema.array().max(100).safeParse(result.data);
      if (!rows.success || rows.data.some(row => row.recipient_id !== auth.userId || !inbound.includes(row.message_id))) return { error: "unavailable" };
      findings = rows.data;
    }
    return { data: { ...page.data, findings } };
  } catch { return { error: "unavailable" }; }
}

/** Recheck older loaded messages as their findings can arrive after pagination. */
export async function readFindings(input: unknown): Promise<Result<Finding[]>> {
  const parsed = z.object({ conversationId: uuid, messageIds: z.array(uuid).min(1).max(100) }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  try {
    const auth = await session(); if (auth.error) return { error: auth.error };
    const { conversationId, messageIds } = parsed.data;
    const conversation = await auth.db.from("conversations").select("buyer_id,seller_id").eq("id", conversationId).single();
    if (conversation.error || !conversation.data || ![conversation.data.buyer_id, conversation.data.seller_id].includes(auth.userId)) return { error: "forbidden" };
    const messages = await auth.db.from("messages").select("id,sender_id").eq("conversation_id", conversationId).in("id", messageIds);
    if (messages.error) return { error: classify(messages.error) };
    const rows = z.array(z.object({ id: uuid, sender_id: uuid.nullable() })).max(100).safeParse(messages.data);
    if (!rows.success) return { error: "unavailable" };
    const inbound = rows.data.filter(row => row.sender_id !== auth.userId && messageIds.includes(row.id)).map(row => row.id);
    if (!inbound.length) return { data: [] };
    const result = await auth.db.from("message_safety_findings").select("message_id,recipient_id,rule_version,rule_ids")
      .eq("recipient_id", auth.userId).in("message_id", inbound);
    if (result.error) return { error: classify(result.error) };
    const findings = findingSchema.array().max(100).safeParse(result.data);
    if (!findings.success || findings.data.some(row => row.recipient_id !== auth.userId || !inbound.includes(row.message_id))) return { error: "unavailable" };
    return { data: findings.data };
  } catch { return { error: "unavailable" }; }
}
