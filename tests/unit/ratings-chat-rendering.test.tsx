import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import ConversationPage from "@/app/account/messages/[id]/page";
import { ChatV2Page } from "@/components/communication/ChatV2Page";
import type { Message } from "@/types/communication";
import type { MessagesPage } from "@/lib/chat-v2/contracts";
import { conversation, ids, inbox, messages } from "./chat-v2-fixtures";

const m = vi.hoisted(() => ({ cards: vi.fn(), from: vi.fn(), readMessages: vi.fn(), readInbox: vi.fn(), limit: vi.fn(), orders: [] as string[] }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error("not found"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: ids.user } }, error: null }) }, from: m.from }) }));
vi.mock("@/lib/chat-v2/server", () => ({ isChatV2Enabled: () => false, readMessages: m.readMessages, readInbox: m.readInbox }));
// JSDOM does not implement the RSC renderer. Model a streaming child with a
// suspending component here; the real async TradeCards is tested separately.
vi.mock("@/components/ratings/TradeCards", () => ({ TradeCards: (props: unknown) => m.cards(props) }));
vi.mock("@/components/footer", () => ({ Footer: () => null }));
vi.mock("@/components/communication/ChatThread", () => ({ ChatThread: ({ initialMessages }: { initialMessages: Message[] }) => <ul aria-label="Legacy messages">{initialMessages.map(row => <li key={row.id}>{row.content}</li>)}</ul> }));
vi.mock("@/components/communication/ChatV2Thread", () => ({ ChatV2Thread: ({ initial }: { initial: MessagesPage }) => <ul aria-label="V2 messages">{initial.items.map(row => <li key={row.id}>{row.content}</li>)}</ul> }));
vi.mock("@/components/communication/ChatV2Inbox", () => ({ ChatV2Inbox: () => <p>Inbox</p> }));

const rows: Message[] = Array.from({ length: 102 }, (_, i) => ({ id: `message-${String(i + 1).padStart(3, "0")}`, conversation_id: ids.conversation,
  sender_id: ids.peer, content: `Message ${i + 1}`, created_at: i < 51 ? "2026-10-26T09:00:00Z" : "2026-10-26T10:00:00Z" }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "false"); m.orders = [];
  m.cards.mockReturnValue(<aside>Trade card</aside>); m.readInbox.mockResolvedValue({ data: inbox }); m.readMessages.mockResolvedValue({ data: messages });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn((column: string, options: { ascending: boolean }) => {
    m.orders.push(`${column}:${options.ascending}`); return query;
  }), limit: m.limit.mockImplementation(async (limit: number) => ({ data: [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).slice(0, limit) })) };
  m.from.mockImplementation((table: string) => {
    if (table === "messages") return query;
    if (table === "conversations") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: async () => ({ data: conversation, error: null }) };
    if (table === "profiles") return { select: vi.fn().mockReturnThis(), in: async () => ({ data: [conversation.buyer, conversation.seller], error: null }) };
    if (table === "user_blocks") return { select: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(), limit: async () => ({ data: [], error: null }) };
    throw new Error(`Unexpected table ${table}`);
  });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const routes = [
  { name: "legacy", page: () => ConversationPage({ params: Promise.resolve({ id: ids.conversation }), searchParams: Promise.resolve({ lang: "hi" }) }), message: "Message 102" },
  { name: "Chat V2", page: () => ChatV2Page({ conversationId: ids.conversation, searchParams: Promise.resolve({ lang: "hi" }) }), message: messages.items[0].content },
];
for (const route of routes) {
  it.each(["", "false"])(`${route.name}: Ratings OFF (%s) never instantiates cards and renders chat`, async flag => {
    vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", flag);
    render(await route.page()); expect(screen.getByText(route.message)).toBeInTheDocument(); expect(m.cards).not.toHaveBeenCalled();
  });
  it(`${route.name}: Ratings ON renders the separate card with the conversation and locale`, async () => {
    vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "true"); render(await route.page());
    expect(screen.getByText("Trade card")).toBeInTheDocument(); expect(screen.getByText(route.message)).toBeInTheDocument();
    expect(m.cards).toHaveBeenCalledWith({ conversationId: ids.conversation, locale: "hi" });
  });
  it(`${route.name}: pending trade cards do not suspend chat and can stream afterward`, async () => {
    vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "true"); let ready = false; let release: () => void = () => {};
    const waiting = new Promise<void>(resolve => { release = resolve; });
    m.cards.mockImplementation(() => { if (!ready) throw waiting; return <aside>Resolved trade card</aside>; });
    render(await route.page()); expect(screen.getByText(route.message)).toBeInTheDocument(); expect(screen.queryByText("Resolved trade card")).not.toBeInTheDocument();
    await act(async () => { ready = true; release(); await waiting; });
    expect(screen.getByText("Resolved trade card")).toBeInTheDocument(); expect(screen.getByText(route.message)).toBeInTheDocument();
  });
}
it("legacy OFF preserves the newest-100 chronological window including tied timestamps", async () => {
  render(await routes[0].page());
  expect(m.orders).toEqual(["created_at:false", "id:false"]); expect(m.limit).toHaveBeenCalledExactlyOnceWith(100);
  expect(screen.getAllByRole("listitem").map(row => row.textContent)).toEqual(rows.slice(2).map(row => row.content));
  expect(screen.queryByText("Message 1")).not.toBeInTheDocument(); expect(screen.queryByText("Message 2")).not.toBeInTheDocument();
});
it("Chat V2 retains its separate message RPC request", async () => {
  render(await routes[1].page()); expect(m.readMessages).toHaveBeenCalledExactlyOnceWith({ conversationId: ids.conversation });
  expect(m.from.mock.calls.some(([table]) => table === "messages")).toBe(false);
});
