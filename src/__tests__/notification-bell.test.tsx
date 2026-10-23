import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/communication/NotificationBell";

const mock = vi.hoisted(() => ({ user: { id: "alice" } as { id: string } | null,
  refresh: vi.fn(), mark: vi.fn(), from: vi.fn() }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({
  user: mock.user, unreadNotificationsCount: 42, refreshUnreadCounts: mock.refresh,
}) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: mock.from }) }));
vi.mock("@/app/account/notifications/actions", () => ({
  markNotificationReadAction: mock.mark, markAllNotificationsReadAction: mock.mark,
}));
const row = { id: "n1", user_id: "alice", title: "Private title", body: "Private body", type: "message_received" as const, read_at: null, created_at: "2026-10-23T09:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks(); mock.user = { id: "alice" };
  mock.mark.mockResolvedValue({ success: true });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [row], error: null }) };
  mock.from.mockReturnValue(query);
});
it("uses total count beyond the preview and loads private rows only on open", async () => {
  render(<NotificationBell />);
  const trigger = screen.getByRole("button", { name: "Notifications (42 unread)" });
  expect(mock.from).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  expect(await screen.findByText("Private title")).toBeInTheDocument();
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByText("Mark as read"));
  await waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});
it("does not falsely mark a failed mutation as read", async () => {
  mock.mark.mockResolvedValue({ error: "denied" });
  render(<NotificationBell />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications (42 unread)" }));
  fireEvent.click(await screen.findByText("Mark as read"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to mark");
  expect(screen.getByText("Mark as read")).toBeInTheDocument();
  expect(mock.refresh).not.toHaveBeenCalled();
});
it("never uses a caller-supplied identity to read another user's rows", async () => {
  mock.user = null;
  const view = render(<NotificationBell userId="alice" initialNotifications={[row]} />);
  expect(view.container).toBeEmptyDOMElement();
  expect(mock.from).not.toHaveBeenCalled();
});
it("hides private rows immediately on account switch and ignores late fetches", async () => {
  let resolve!: (value: unknown) => void;
  mock.from().limit.mockImplementation(() => new Promise(r => { resolve = r; }));
  const view = render(<NotificationBell />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications (42 unread)" }));
  mock.user = null;
  view.rerender(<NotificationBell />);
  await act(async () => { resolve({ data: [row], error: null }); });
  expect(view.container).toBeEmptyDOMElement();
  expect(screen.queryByText("Private title")).not.toBeInTheDocument();
});
