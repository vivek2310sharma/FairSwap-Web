import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConversationPage from "@/app/account/messages/[id]/page";
import type { Message } from "@/types/communication";

const mock = vi.hoisted(() => ({
  user: { id: "buyer" } as { id: string } | null,
  buyerId: "buyer", from: vi.fn(),
  displayed: [] as Message[], returned: [] as Message[],
  orders: [] as { column: "created_at" | "id"; ascending: boolean }[],
  limit: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => { throw new Error(`redirect:${path}`); },
  notFound: () => { throw new Error("not found"); },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.user }, error: null }) }, from: mock.from,
}) }));
vi.mock("@/components/footer", () => ({ Footer: () => null }));
vi.mock("@/components/communication/ChatThread", () => ({ ChatThread: ({ initialMessages }: { initialMessages: Message[] }) => {
  mock.displayed = initialMessages;
  return <ul>{initialMessages.map(m => <li key={m.id}>{m.content}</li>)}</ul>;
} }));

// 102 rows, including timestamp ties at both ends of the selected window.
const rows: Message[] = Array.from({ length: 102 }, (_, index) => ({
  id: `message-${String(index + 1).padStart(3, "0")}`,
  conversation_id: "conversation", sender_id: index === 101 ? "buyer" : "seller",
  content: `Body ${index + 1}`,
  created_at: index < 51 ? "2026-10-23T09:00:00Z" : "2026-10-23T10:00:00Z",
}));
beforeEach(() => {
  vi.clearAllMocks(); mock.user = { id: "buyer" }; mock.buyerId = "buyer"; mock.orders = []; mock.displayed = [];
  const messages = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation((column, { ascending }) => {
      mock.orders.push({ column, ascending }); return messages;
    }),
    limit: mock.limit.mockImplementation(async limit => {
      // Model the database's requested ORDER BY before its LIMIT, not the fix.
      mock.returned = [...rows].sort((a, b) => {
        for (const order of mock.orders) {
          const comparison = a[order.column].localeCompare(b[order.column]);
          if (comparison) return order.ascending ? comparison : -comparison;
        }
        return 0;
      }).slice(0, limit);
      return { data: mock.returned, error: null };
    }),
  };
  mock.from.mockImplementation(table => {
    if (table === "messages") return messages;
    if (table === "conversations") return {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: async () => ({ data: { id: "conversation", listing_id: "listing", buyer_id: mock.buyerId, seller_id: "seller", listing: null }, error: null }),
    };
    if (table === "user_blocks") return { select: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), limit: async () => ({ data: [] }) };
    if (table === "profiles") return { select: vi.fn().mockReturnThis(), in: async () => ({ data: [] }) };
    throw new Error(`Unexpected table ${table}`);
  });
});

it("loads the newest 100 with descending tuple ordering and renders oldest-to-newest", async () => {
  render(await ConversationPage({ params: Promise.resolve({ id: "conversation" }) }));
  expect(mock.orders).toEqual([{ column: "created_at", ascending: false }, { column: "id", ascending: false }]);
  expect(mock.limit).toHaveBeenCalledExactlyOnceWith(100);
  expect(mock.displayed.map(m => m.id)).toEqual(rows.slice(2).map(m => m.id));
  expect(mock.displayed).toHaveLength(100);
  expect(mock.displayed.at(-1)).toEqual(rows[101]); // Own outgoing tail is the read cursor.
  expect(mock.returned[0]).toEqual(rows[101]); // Reversal does not mutate query data.
  expect(screen.queryByText("Body 1")).not.toBeInTheDocument();
  expect(screen.queryByText("Body 2")).not.toBeInTheDocument();
  expect(screen.getByText("Body 102")).toBeInTheDocument();
  expect(mock.from.mock.calls.filter(([table]) => table === "messages")).toHaveLength(1);
});
it("does not read messages for unauthenticated callers", async () => {
  mock.user = null;
  await expect(ConversationPage({ params: Promise.resolve({ id: "conversation" }) })).rejects.toThrow("redirect:/auth/sign-in");
  expect(mock.from).not.toHaveBeenCalled();
});
it("preserves the participant check before the message query", async () => {
  mock.buyerId = "someone-else";
  await expect(ConversationPage({ params: Promise.resolve({ id: "conversation" }) })).rejects.toThrow("redirect:/account/messages");
  expect(mock.from.mock.calls.some(([table]) => table === "messages")).toBe(false);
});
