import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NotificationList } from "@/components/communication/NotificationList";
import type { Notification } from "@/types/communication";
const mock = vi.hoisted(() => ({ user: { id: "alice" } as { id: string } | null, refresh: vi.fn(), mark: vi.fn() }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({ user: mock.user, refreshUnreadCounts: mock.refresh }) }));
vi.mock("@/app/account/notifications/actions", () => ({ markNotificationReadAction: mock.mark, markAllNotificationsReadAction: mock.mark }));
const row: Notification = { id: "n1", user_id: "alice", type: "listing_approved", title: "Private notification", body: "Private details", read_at: null, created_at: "2026-10-23T09:00:00Z" };
beforeEach(() => { vi.clearAllMocks(); mock.user = { id: "alice" }; mock.mark.mockResolvedValue({ success: true }); });
it("refreshes shared counts after mark-all succeeds", async () => {
  render(<NotificationList initialNotifications={[row]} />);
  fireEvent.click(screen.getByRole("button", { name: /mark all/i }));
  await waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
});
it("keeps unread state and shows an error after a denied read", async () => {
  mock.mark.mockResolvedValue({ error: "denied" });
  render(<NotificationList initialNotifications={[row]} />);
  fireEvent.click(screen.getByRole("button", { name: /mark all/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to mark");
  expect(mock.refresh).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /mark all/i })).toBeEnabled();
});
it("hides prior-account notification content on session change", () => {
  const view = render(<NotificationList initialNotifications={[row]} />);
  expect(screen.getByText("Private notification")).toBeInTheDocument();
  mock.user = { id: "bob" };
  view.rerender(<NotificationList initialNotifications={[row]} />);
  expect(screen.queryByText("Private notification")).not.toBeInTheDocument();
});
