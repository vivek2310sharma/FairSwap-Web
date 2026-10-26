import { beforeEach, expect, it, vi } from "vitest";
import { readInbox, readMessages, readFindings } from "@/lib/chat-v2/server";
import { inboxPageSchema } from "@/lib/chat-v2/contracts";
import { ids, inbox, message, messages } from "./chat-v2-fixtures";
const mocks = vi.hoisted(() => ({ create: vi.fn(), auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), in: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FAIRSWAP_CHAT_V2_INBOX_ENABLED", "true");
  mocks.create.mockResolvedValue({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from });
  mocks.auth.mockResolvedValue({ data: { user: { id: ids.user } }, error: null });
  const query = { select: mocks.select, eq: mocks.eq, in: mocks.in };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query); mocks.in.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: inbox, error: null });
});
it.each([undefined, "false", "TRUE", "1"])("flag %s fails closed before client creation", async value => {
  if (value === undefined) vi.stubEnv("FAIRSWAP_CHAT_V2_INBOX_ENABLED", ""); else vi.stubEnv("FAIRSWAP_CHAT_V2_INBOX_ENABLED", value);
  expect(await readInbox({})).toEqual({ error: "disabled" });
  expect(await readMessages({ conversationId: ids.conversation })).toEqual({ error: "disabled" });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects invalid arguments before database access", async () => {
  expect(await readInbox({ cursor: { id: ids.message } })).toEqual({ error: "invalid" });
  expect(await readMessages({ conversationId: "other", cursor: null })).toEqual({ error: "invalid" });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("requires authenticated server identity before every RPC", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
  expect(await readInbox({})).toEqual({ error: "unauthenticated" });
  expect(await readMessages({ conversationId: ids.conversation })).toEqual({ error: "unauthenticated" });
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
});
it("passes the entire cursor and seller drilldown to the RPC", async () => {
  expect((await readInbox({ tab: "selling", query: " bike ", unread: true, listingId: ids.listing, cursor: { at: message.created_at, id: ids.message } })).data).toEqual(inboxPageSchema.parse(inbox));
  expect(mocks.rpc).toHaveBeenCalledWith("chat_v2_inbox", { tab: "selling", page_size: 30, cursor_at: message.created_at, cursor_id: ids.message, listing_id: ids.listing, query_text: "bike", unread_only: true });
});
it.each([["42501", "forbidden"], ["55000", "disabled"], ["22023", "invalid"], ["42P01", "unavailable"]])("surfaces %s without legacy fallback or upstream details", async (code, expected) => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "private upstream text" } });
  expect(await readInbox({})).toEqual({ error: expected });
  expect(mocks.from).not.toHaveBeenCalled();
});
it("rejects malformed responses and cross-conversation rows", async () => {
  mocks.rpc.mockResolvedValue({ data: { ...inbox, items: [{ id: "bad" }] }, error: null });
  expect(await readInbox({})).toEqual({ error: "unavailable" });
  mocks.rpc.mockResolvedValue({ data: { ...messages, items: [{ ...message, conversation_id: ids.next }] }, error: null });
  expect(await readMessages({ conversationId: ids.conversation })).toEqual({ error: "unavailable" });
});
it("queries only authenticated recipient findings for authorized inbound IDs", async () => {
  const own = { ...message, id: ids.next, sender_id: ids.user };
  mocks.rpc.mockResolvedValue({ data: { ...messages, items: [message, own] }, error: null });
  const finding = { message_id: message.id, recipient_id: ids.user, rule_version: "chat_india_v1", rule_ids: ["OTP_PIN"] };
  mocks.in.mockResolvedValue({ data: [finding], error: null });
  expect((await readMessages({ conversationId: ids.conversation })).data?.findings).toEqual([finding]);
  expect(mocks.eq).toHaveBeenCalledWith("recipient_id", ids.user);
  expect(mocks.in).toHaveBeenCalledWith("message_id", [message.id]);
});
it("does not request findings for outgoing-only pages", async () => {
  mocks.rpc.mockResolvedValue({ data: { ...messages, items: [{ ...message, sender_id: ids.user }] }, error: null });
  expect((await readMessages({ conversationId: ids.conversation })).data?.findings).toEqual([]);
  expect(mocks.from).not.toHaveBeenCalled();
});
it("rejects a sender-visible or wrong-recipient finding even if a mocked backend returns one", async () => {
  mocks.rpc.mockResolvedValue({ data: messages, error: null });
  mocks.in.mockResolvedValue({ data: [{ message_id: message.id, recipient_id: ids.peer, rule_version: "chat_india_v1", rule_ids: ["OTP_PIN"] }], error: null });
  expect(await readMessages({ conversationId: ids.conversation })).toEqual({ error: "unavailable" });
});
it("surfaces findings authorization errors instead of silently omitting warnings", async () => {
  mocks.rpc.mockResolvedValue({ data: messages, error: null });
  mocks.in.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect(await readMessages({ conversationId: ids.conversation })).toEqual({ error: "forbidden" });
});
it("bounds findings polling and denies nonparticipants before looking up messages", async () => {
  expect(await readFindings({ conversationId: ids.conversation, messageIds: Array(101).fill(ids.message) })).toEqual({ error: "invalid" });
  mocks.eq.mockReturnValue({ single: async () => ({ data: { buyer_id: ids.peer, seller_id: ids.next }, error: null }) });
  expect(await readFindings({ conversationId: ids.conversation, messageIds: [ids.message] })).toEqual({ error: "forbidden" });
  expect(mocks.from).toHaveBeenCalledTimes(1);
});
it("rechecks older findings with participant, conversation, sender and recipient constraints", async () => {
  const query = { select: mocks.select, eq: mocks.eq, in: mocks.in, single: async () => ({ data: { buyer_id: ids.user, seller_id: ids.peer }, error: null }) };
  mocks.from.mockReturnValue(query); mocks.select.mockReturnValue(query); mocks.eq.mockReturnValue(query);
  const finding = { message_id: message.id, recipient_id: ids.user, rule_version: "chat_india_v1", rule_ids: ["OTP_PIN"] };
  mocks.in.mockResolvedValueOnce({ data: [{ id: message.id, sender_id: ids.peer }, { id: ids.next, sender_id: ids.user }], error: null }).mockResolvedValueOnce({ data: [finding], error: null });
  expect(await readFindings({ conversationId: ids.conversation, messageIds: [message.id, ids.next] })).toEqual({ data: [finding] });
  expect(mocks.eq).toHaveBeenCalledWith("conversation_id", ids.conversation);
  expect(mocks.eq).toHaveBeenCalledWith("recipient_id", ids.user);
  expect(mocks.in).toHaveBeenLastCalledWith("message_id", [message.id]);
});
