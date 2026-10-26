import { describe, expect, it } from "vitest";
import { chatHref, compareTuple, inboxPageSchema, inboxRequestSchema, mergeInbox, mergeMessages, messagesPageSchema, timestamp } from "@/lib/chat-v2/contracts";
import { chatCopy } from "@/lib/chat-v2/copy";
import { formatChatDateTime } from "@/lib/formatters";
import { ids, inbox, message, messages } from "./chat-v2-fixtures";

describe("Chat V2 wire contracts", () => {
  it("requires a complete cursor, bounded search and valid seller listing", () => {
    for (const input of [{ cursor: { at: message.created_at } }, { listingId: "not-an-id" }, { query: "x".repeat(101) }, { unread: "true" }, { tab: "staff" }]) expect(inboxRequestSchema.safeParse(input).success).toBe(false);
    expect(inboxRequestSchema.parse({})).toEqual({ tab: "all", query: "", listingId: null, unread: false, cursor: null });
  });
  it("uses backend conversation counts independent of grouped rows", () => {
    expect(inboxPageSchema.parse(inbox).counts.all).toBe(127);
    expect(inboxPageSchema.safeParse({ ...inbox, counts: { all: 2, buying: 1, selling: 0 } }).success).toBe(false);
  });
  it("rejects Buying groups, single-enquiry groups and inconsistent cursors", () => {
    const item = inbox.items[0];
    for (const row of [{ ...item, is_group: true }, { ...item, is_group: true, enquiry_count: 2 }, { ...item, conversation_id: null }]) expect(inboxPageSchema.safeParse({ ...inbox, items: [row] }).success).toBe(false);
    expect(messagesPageSchema.safeParse({ ...messages, has_more: true }).success).toBe(false);
  });
  it("deduplicates changed group representatives, preserving drilldown buyers", () => {
    const first = { ...inbox.items[0], is_selling: true };
    const group = { ...first, id: ids.next, is_group: true, enquiry_count: 2, conversation_id: null };
    expect(mergeInbox([first], [group])).toEqual([group]);
    const buyer = { ...first, id: ids.next, conversation_id: ids.next };
    expect(mergeInbox([first], [buyer], true)).toHaveLength(2);
    expect(mergeInbox(inbox.items, [inbox.items[0]])).toHaveLength(1);
  });
  it("compares microseconds, normalized offsets and the full UUID tie", () => {
    const a = { at: "2026-10-26T10:00:00.123455Z", id: ids.next };
    const b = { at: "2026-10-26T15:30:00.123456+05:30", id: ids.message };
    expect(compareTuple(a, b)).toBe(-1);
    expect(compareTuple({ ...b, id: ids.message }, { ...b, id: ids.next })).toBeLessThan(0);
    expect(timestamp.safeParse("2026-10-26T10:00:00.1234567Z").success).toBe(false);
  });
  it("merges chronological rows without duplicating realtime echoes", () => {
    const older = { ...message, id: ids.next, created_at: "2026-10-26T20:30:00.123455Z" };
    expect(mergeMessages([message], [older, message]).map(row => row.id)).toEqual([ids.next, ids.message]);
  });
  it("preserves inbox filters and seller listing context in mobile route links", () => {
    const href = chatHref(inboxRequestSchema.parse({ tab: "selling", listingId: ids.listing, unread: true, query: "bike & city" }), ids.conversation);
    const url = new URL(href, "https://example.invalid");
    expect(url.pathname).toBe(`/account/messages/${ids.conversation}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ tab: "selling", listing_id: ids.listing, unread: "true", q: "bike & city" });
  });
  it("formats IST across midnight and year boundaries independent of machine timezone", () => {
    expect(formatChatDateTime("2025-12-31T20:30:00Z")).toMatch(/1 Jan 2026/);
    expect(formatChatDateTime("2025-12-31T20:30:00Z")).toContain("02:00 am");
    expect(formatChatDateTime("2023-01-01T00:00:00Z", "en", true)).toContain("2023");
    expect(formatChatDateTime("bad")).toBe("");
  });
  it("provides centralized complete Hindi copy and safety cautions", () => {
    expect(Object.keys(chatCopy("hi"))).toEqual(Object.keys(chatCopy()));
    expect(chatCopy("hi").safety).toContain("UPI PIN");
    expect(chatCopy().safety).toContain("advance payments");
  });
});
