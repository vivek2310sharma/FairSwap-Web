import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatV2Thread } from "@/components/communication/ChatV2Thread";
import { conversation, ids, message, messages } from "./chat-v2-fixtures";
import type { ChatMessage } from "@/lib/chat-v2/contracts";
const mocks = vi.hoisted(() => ({ load: vi.fn(), findings: vi.fn(), send: vi.fn(), read: vi.fn(), refresh: vi.fn(), remove: vi.fn(), on: vi.fn(), callback: null as null | ((payload: { new: unknown }) => void) }));
vi.mock("@/lib/chat-v2/actions", () => ({ loadChatMessages: mocks.load, loadChatFindings: mocks.findings }));
vi.mock("@/app/account/messages/actions", () => ({ sendMessageAction: mocks.send, markConversationReadAction: mocks.read }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({ refreshUnreadCounts: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ channel: () => {
  const channel = { on: mocks.on.mockImplementation((_type, _filter, callback) => { mocks.callback = callback; return channel; }), subscribe: () => channel };
  return channel;
}, removeChannel: mocks.remove }) }));
vi.mock("@/components/communication/ReportDialog", () => ({ ReportDialog: ({ isOpen, targetType }: { isOpen: boolean; targetType: string }) => isOpen ? <p>Report {targetType} dialog</p> : null }));
vi.mock("@/components/communication/BlockDialog", () => ({ BlockDialog: ({ isOpen, onBlocked }: { isOpen: boolean; onBlocked: () => void }) => isOpen ? <button onClick={onBlocked}>Confirm block</button> : null }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
beforeEach(() => {
  cleanup(); vi.resetAllMocks(); mocks.callback = null;
  mocks.load.mockResolvedValue({ data: messages }); mocks.findings.mockResolvedValue({ data: [] }); mocks.read.mockResolvedValue({ success: true }); mocks.refresh.mockResolvedValue(undefined);
});
it("pins listing and permanent India safety reminder with IST date separators", () => {
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={messages} />);
  expect(screen.getByText(/Never share your UPI PIN or OTP/)).toBeInTheDocument();
  expect(screen.getByText("27 Oct 2026")).toBeInTheDocument();
  expect(screen.getByText("Blue bicycle")).toBeInTheDocument();
});
it("displays only inbound findings for this recipient, including against poisoned initial props", () => {
  const own = { ...message, id: ids.next, sender_id: ids.user, content: "Outgoing" };
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={{ ...messages, items: [message, own], findings: [
    { message_id: message.id, recipient_id: ids.user, rule_version: "chat_india_v1", rule_ids: ["OTP_PIN"] },
    { message_id: own.id, recipient_id: ids.user, rule_version: "chat_india_v1", rule_ids: ["QR_RECEIVE"] },
  ] }} />);
  expect(screen.getByText("Do not share OTPs or UPI PINs.")).toBeInTheDocument();
  expect(screen.queryByText("You do not need to scan a QR code to receive money.")).not.toBeInTheDocument();
});
it("compares the full read tuple including microseconds and UUID", () => {
  const own: ChatMessage = { ...message, sender_id: ids.user, content: "Before cursor", created_at: "2026-10-26T20:30:00.123455Z" };
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={{ ...messages, items: [own, { ...own, id: ids.next, content: "After UUID tie", created_at: message.created_at }], peer_read_cursor: { at: message.created_at, id: message.id } }} />);
  expect(screen.getAllByText(/· Seen/)).toHaveLength(1); expect(screen.getAllByText(/· Sent/)).toHaveLength(1);
});
it("keeps the original client_request_id through pending, failure and retry", async () => {
  let finish: (value: { success: boolean; messageId: string }) => void = () => {};
  mocks.send.mockRejectedValueOnce(new Error("offline")).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={messages} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Retry this text" } }); fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Failed to send"); const requestId = mocks.send.mock.calls[0][2];
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(screen.getByText("Sending…")).toBeInTheDocument();
  expect(mocks.send).toHaveBeenNthCalledWith(2, conversation.id, "Retry this text", requestId);
  await act(async () => finish({ success: true, messageId: ids.next }));
  expect(await screen.findByText("Sent", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText(/· Seen/)).not.toBeInTheDocument();
});
it("uses a canonical echo once, scopes realtime to the selected conversation and cleans up", async () => {
  const { unmount } = render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={messages} />);
  expect(mocks.on).toHaveBeenCalledWith("postgres_changes", expect.objectContaining({ table: "messages", filter: `conversation_id=eq.${conversation.id}` }), expect.any(Function));
  await act(async () => { mocks.callback?.({ new: message }); mocks.callback?.({ new: { ...message, conversation_id: ids.next, content: "Forbidden row" } }); });
  expect(screen.getAllByText(message.content)).toHaveLength(1); expect(screen.queryByText("Forbidden row")).not.toBeInTheDocument();
  unmount(); expect(mocks.remove).toHaveBeenCalled();
  expect(mocks.on.mock.calls.some(call => call[1].table === "message_safety_findings")).toBe(false);
});
it("loads older messages with the full cursor and keeps them chronological", async () => {
  const cursor = { at: message.created_at, id: message.id };
  mocks.load.mockResolvedValueOnce({ data: { ...messages, items: [{ ...message, id: ids.next, content: "Older body", created_at: "2023-01-01T00:00:00Z" }] } });
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={{ ...messages, has_more: true, next_cursor: cursor }} />);
  fireEvent.click(screen.getByRole("button", { name: "Load older messages" }));
  await screen.findByText("Older body"); expect(mocks.load).toHaveBeenCalledWith({ conversationId: conversation.id, cursor });
  expect(screen.getByText("1 Jan 2023")).toBeInTheDocument();
});
it("preserves block/report and does not close sold or reserved conversations", async () => {
  render(<ChatV2Thread conversation={{ ...conversation, listing: { ...conversation.listing!, status: "sold" } }} currentUserId={ids.user} initial={messages} />);
  expect(screen.getByRole("textbox")).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Report message" })); expect(screen.getByText("Report message dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Block user" })); fireEvent.click(screen.getByText("Confirm block"));
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); expect(screen.getByText(/Messaging is unavailable/)).toBeInTheDocument();
});
it("retains policy review workflow on send failure", async () => {
  mocks.send.mockResolvedValue({ error: "policy", requiresPolicyReview: true, redirectTo: "/account/policy-review?next=%2Faccount%2Fmessages" });
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={messages} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } }); fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("link", { name: "Review current policies to continue." })).toHaveAttribute("href", expect.stringContaining("/account/policy-review"));
});
it("refreshes eventually consistent findings on older loaded inbound messages", async () => {
  const older = { ...message, id: ids.next, content: "Older caution", created_at: "2023-01-01T00:00:00Z" };
  mocks.findings.mockResolvedValue({ data: [{ message_id: older.id, recipient_id: ids.user, rule_version: "chat_india_v1", rule_ids: ["QR_RECEIVE"] }] });
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={{ ...messages, items: [older, message] }} />);
  fireEvent(window, new Event("focus"));
  await screen.findByText("You do not need to scan a QR code to receive money.");
  expect(mocks.findings).toHaveBeenCalledWith({ conversationId: conversation.id, messageIds: [older.id] });
});
it("hides private history and composer when an enabled-path refresh is denied", async () => {
  mocks.load.mockResolvedValue({ error: "forbidden" });
  render(<ChatV2Thread conversation={conversation} currentUserId={ids.user} initial={messages} />);
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.queryByText(message.content)).not.toBeInTheDocument());
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("do not have access");
});
