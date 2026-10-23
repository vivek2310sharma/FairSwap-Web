import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { ChatThread } from "@/components/communication/ChatThread";
import type { Conversation, Message } from "@/types/communication";

const mock = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  serverRpc: vi.fn(), browserRpc: vi.fn(), guard: vi.fn(), cursor: "",
  resolveRead: null as null | (() => void),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/account/messages/conversation" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.serverRpc }) }));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: mock.guard }));
vi.mock("@/components/communication/ReportDialog", () => ({ ReportDialog: () => null }));
vi.mock("@/components/communication/BlockDialog", () => ({ BlockDialog: () => null }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => {
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: async () => ({ count: 0, error: null }) };
  return { rpc: mock.browserRpc, from: () => query, channel: () => channel, removeChannel: vi.fn(),
    auth: { onAuthStateChange: (listener: typeof mock.listener) => {
      mock.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } };
    } },
  };
} }));
const conversation: Conversation = { id: "conversation", listing_id: "listing", buyer_id: "buyer", seller_id: "seller", created_at: "2026-10-23T10:00:00Z", last_message_at: "2026-10-23T10:01:00Z" };
const messages: Message[] = [
  { id: "incoming", conversation_id: conversation.id, sender_id: "seller", content: "Earlier unread message", created_at: "2026-10-23T10:00:00Z" },
  { id: "outgoing", conversation_id: conversation.id, sender_id: "buyer", content: "Viewer's reply", created_at: "2026-10-23T10:01:00Z" },
];
function Summary() {
  const { unreadMessagesCount } = useAuth();
  return <p data-testid="unread">{unreadMessagesCount === null ? "unknown" : unreadMessagesCount}</p>;
}
function mount() {
  render(<AuthProvider><Summary /><ChatThread conversation={conversation} initialMessages={messages} currentUserId="buyer" /></AuthProvider>);
  act(() => { mock.listener?.("INITIAL_SESSION", { user: { id: "buyer" } }); });
}
beforeEach(() => {
  vi.clearAllMocks(); mock.cursor = ""; mock.resolveRead = null;
  mock.guard.mockResolvedValue({ allowed: true });
  mock.serverRpc.mockImplementation((name, args) => {
    if (name !== "mark_conversation_read") throw new Error("Unexpected write RPC");
    return new Promise(resolve => { mock.resolveRead = () => { mock.cursor = args.message_id; resolve({ error: null }); }; });
  });
  mock.browserRpc.mockImplementation(async () => ({ data: [{
    // Backend #48 semantics: incoming after the read message's tuple, not sender.
    unread_messages: mock.cursor === "outgoing" ? 0 : 1, unread_notifications: 0,
  }], error: null }));
});
it("viewing an incoming→own-outgoing thread reduces shared counts after the real server action succeeds", async () => {
  mount();
  await waitFor(() => expect(screen.getByTestId("unread")).toHaveTextContent("1"));
  await waitFor(() => expect(mock.serverRpc).toHaveBeenCalledExactlyOnceWith("mark_conversation_read", {
    conversation_id: "conversation", message_id: "outgoing",
  })); // No client-provided user identity; server guard/RPC remain authoritative.
  await act(async () => { mock.resolveRead?.(); });
  await waitFor(() => expect(screen.getByTestId("unread")).toHaveTextContent("0"));
  expect(mock.guard).toHaveBeenCalledOnce();
  expect(mock.browserRpc).toHaveBeenCalledTimes(2);
});
it("keeps chat counts unknown after reading when the Backend count RPC is unavailable", async () => {
  mock.browserRpc.mockResolvedValue({ error: { code: "PGRST202" } });
  mount();
  await waitFor(() => expect(mock.serverRpc).toHaveBeenCalledOnce());
  await act(async () => { mock.resolveRead?.(); });
  expect(screen.getByTestId("unread")).toHaveTextContent("unknown");
  expect(mock.browserRpc).toHaveBeenCalledOnce(); // Missing RPC is not hammered.
});
it("does not bypass the existing server policy guard or clear unread state after denial", async () => {
  mock.guard.mockResolvedValue({ allowed: false, error: "Sign in required" });
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Read status could not be updated");
  expect(mock.serverRpc).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByTestId("unread")).toHaveTextContent("1"));
});
