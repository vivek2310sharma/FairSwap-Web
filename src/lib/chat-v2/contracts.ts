import { z } from "zod";

export const uuid = z.string().uuid();
export const timestamp = z.string().datetime({ offset: true }).refine(value => !/\.\d{7,}/.test(value));
export const cursorSchema = z.object({ at: timestamp, id: uuid }).strict();
export type Cursor = z.infer<typeof cursorSchema>;
export const inboxRequestSchema = z.object({
  tab: z.enum(["all", "buying", "selling"]).default("all"),
  query: z.string().trim().max(100).default(""), unread: z.boolean().default(false),
  listingId: uuid.nullable().default(null), cursor: cursorSchema.nullable().default(null),
}).strict();
export type InboxRequest = z.infer<typeof inboxRequestSchema>;
const count = z.number().int().nonnegative().safe();
export const inboxItemSchema = z.object({
  id: uuid, conversation_id: uuid.nullable(), listing_id: uuid,
  is_group: z.boolean(), enquiry_count: count.min(1), unread_count: count,
  is_selling: z.boolean(), last_message_at: timestamp,
  listing: z.object({ title: z.string(), slug: z.string(), price_paise: count.nullable(), status: z.string(), cover_photo_id: uuid.nullable() }),
  peer_name: z.string().nullable(), preview: z.string().nullable(), preview_is_own: z.boolean().nullable(),
}).refine(row => row.is_group
  ? row.is_selling && row.enquiry_count >= 2 && row.conversation_id === null
  : row.enquiry_count === 1 && row.conversation_id === row.id, "Invalid conversation grouping");
export type InboxItem = z.infer<typeof inboxItemSchema>;
export const inboxPageSchema = z.object({
  items: z.array(inboxItemSchema).max(50), has_more: z.boolean(), next_cursor: cursorSchema.nullable(),
  counts: z.object({ all: count, buying: count, selling: count }),
}).refine(page => page.has_more === (page.next_cursor !== null) && page.counts.all === page.counts.buying + page.counts.selling);
export type InboxPage = z.infer<typeof inboxPageSchema>;
export const messageSchema = z.object({ id: uuid, conversation_id: uuid, sender_id: uuid.nullable(),
  content: z.string(), created_at: timestamp, client_request_id: uuid.nullable().optional() });
export type ChatMessage = z.infer<typeof messageSchema>;
export const messagesRequestSchema = z.object({ conversationId: uuid, cursor: cursorSchema.nullable().default(null) }).strict();
export const messagesPageSchema = z.object({ items: z.array(messageSchema).max(100), has_more: z.boolean(),
  next_cursor: cursorSchema.nullable(), peer_read_cursor: cursorSchema.nullable(),
}).refine(page => page.has_more === (page.next_cursor !== null));
export const ruleSchema = z.enum(["OTP_PIN", "QR_RECEIVE", "ADVANCE_VIEWING", "IMPERSONATION_FEE", "UPI_COLLECT", "PAYMENT_LINK", "ADVANCE_DELIVERY", "OFF_PLATFORM"]);
export const findingSchema = z.object({ message_id: uuid, recipient_id: uuid, rule_version: z.literal("chat_india_v1"), rule_ids: z.array(ruleSchema).min(1).max(8) });
export type Finding = z.infer<typeof findingSchema>;
export type MessagesPage = z.infer<typeof messagesPageSchema> & { findings: Finding[] };
export type ChatError = "unauthenticated" | "disabled" | "forbidden" | "invalid" | "unavailable";
export type Result<T> = { data: T; error?: never } | { data?: never; error: ChatError };

// Preserve PostgreSQL microseconds and the UUID tie-breaker; Date alone loses precision.
export function compareTuple(a: Cursor, b: Cursor): number {
  const micros = (at: string) => BigInt(Math.floor(Date.parse(at) / 1000)) * BigInt(1000000)
    + BigInt((at.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(0, 6));
  const x = micros(a.at), y = micros(b.at);
  const left = a.id.toLowerCase(), right = b.id.toLowerCase();
  return x < y ? -1 : x > y ? 1 : left < right ? -1 : left > right ? 1 : 0;
}
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(current.map(row => [row.id, row]));
  for (const row of incoming) map.set(row.id, row);
  return [...map.values()].sort((a, b) => compareTuple({ at: a.created_at, id: a.id }, { at: b.created_at, id: b.id }));
}
export function inboxKey(row: InboxItem, drilldown = false): string { return row.is_selling && !drilldown ? `listing:${row.listing_id}` : `conversation:${row.id}`; }
export function mergeInbox(current: InboxItem[], incoming: InboxItem[], drilldown = false): InboxItem[] {
  const map = new Map(current.map(row => [inboxKey(row, drilldown), row]));
  for (const row of incoming) map.set(inboxKey(row, drilldown), row);
  return [...map.values()];
}
export function chatHref(request: InboxRequest, conversationId?: string): string {
  const query = new URLSearchParams({ tab: request.tab });
  if (request.query) query.set("q", request.query);
  if (request.unread) query.set("unread", "true");
  if (request.listingId) query.set("listing_id", request.listingId);
  return `/account/messages${conversationId ? `/${conversationId}` : ""}?${query}`;
}
