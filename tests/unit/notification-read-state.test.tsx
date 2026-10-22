import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  markOne: vi.fn(),
  markAll: vi.fn(),
  realtime: { handler: null as null | ((payload: { new: unknown }) => void) },
  serverClient: vi.fn(),
  revalidatePath: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/app/account/notifications/actions", () => ({
  markNotificationReadAction: mocks.markOne,
  markAllNotificationsReadAction: mocks.markAll,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => new Promise(() => {}) },
    channel: () => ({
      on: (_type: string, _filter: unknown, cb: (payload: { new: unknown }) => void) => {
        mocks.realtime.handler = cb;
        return { subscribe: () => ({}) };
      },
    }),
    removeChannel: () => {},
  }),
}));

import { NotificationList } from "@/components/communication/NotificationList";
import { NotificationBell } from "@/components/communication/NotificationBell";
import { NOTIFICATION_UPDATE_ERROR } from "@/components/communication/useNotificationReadState";
import type { Notification } from "@/types/communication";

const make = (id: string, read_at: string | null = null, link: string | null = null): Notification => ({
  id,
  user_id: "user-1",
  type: "new_message",
  title: `Title ${id}`,
  body: `Body ${id}`,
  link,
  read_at,
  created_at: "2026-10-20T10:00:00.000Z",
});

const deferred = () => {
  let resolve: (value: unknown) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("NotificationList read-state handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markOne.mockResolvedValue({ success: true });
    mocks.markAll.mockResolvedValue({ success: true });
  });
  afterEach(() => cleanup());

  const markReadButton = () => screen.getByRole("button", { name: /Mark read/ });

  it("keeps a successful update responsive and applied", async () => {
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButton());
    });

    expect(mocks.markOne).toHaveBeenCalledWith("a");
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("applies the change immediately, before the server answers", async () => {
    const pending = deferred();
    mocks.markOne.mockReturnValue(pending.promise);
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButton());
    });
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it("rolls back and shows a safe error when the action reports failure", async () => {
    mocks.markOne.mockResolvedValue({ success: false, error: 'relation "notifications" does not exist' });
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButton());
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("alert")).not.toHaveTextContent("relation");
    expect(screen.getByText(/You have/)).toHaveTextContent("1 unread notification");
    expect(markReadButton()).toBeEnabled();
  });

  it("rolls back when the action returns an error without a success flag", async () => {
    mocks.markOne.mockResolvedValue({ error: "boom" });
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButton());
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByText(/You have/)).toHaveTextContent("1 unread notification");
  });

  it("rolls back when the call throws (network failure)", async () => {
    mocks.markOne.mockRejectedValue(new Error("fetch failed"));
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButton());
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("alert")).not.toHaveTextContent("fetch failed");
    expect(screen.getByText(/You have/)).toHaveTextContent("1 unread notification");
  });

  it("ignores repeated clicks while a request is in flight", async () => {
    const pending = deferred();
    mocks.markOne.mockReturnValue(pending.promise);
    render(<NotificationList initialNotifications={[make("a")]} />);

    const button = markReadButton();
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(mocks.markOne).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(mocks.markOne).toHaveBeenCalledTimes(1);
  });

  it("does not call the server for an already-read notification", async () => {
    render(
      <NotificationList
        initialNotifications={[make("read", "2026-10-21T00:00:00Z", "/account/messages/abc")]}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: /View Details/ }));
    });
    expect(mocks.markOne).not.toHaveBeenCalled();
  });

  it("keeps the link target and still marks read when following a link", async () => {
    render(<NotificationList initialNotifications={[make("a", null, "/account/messages/abc")]} />);

    const link = screen.getByRole("link", { name: /View Details/ });
    expect(link).toHaveAttribute("href", "/account/messages/abc");
    await act(async () => {
      fireEvent.click(link);
    });
    expect(mocks.markOne).toHaveBeenCalledWith("a");
  });

  it("mark all: success, then rollback of only the notifications it changed on failure", async () => {
    render(
      <NotificationList
        initialNotifications={[make("a"), make("b"), make("old", "2026-10-21T00:00:00Z")]}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
    cleanup();

    mocks.markAll.mockResolvedValue({ success: false, error: "raw db text" });
    render(
      <NotificationList
        initialNotifications={[make("a"), make("b"), make("old", "2026-10-21T00:00:00Z")]}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("alert")).not.toHaveTextContent("raw db text");
    expect(screen.getByText(/You have/)).toHaveTextContent("2 unread notifications");
    // The notification that was already read stays read: only two "Mark read" buttons come back.
    expect(screen.getAllByRole("button", { name: /Mark read/ })).toHaveLength(2);
  });

  it("mark all: rolls back on a thrown error and ignores duplicate clicks", async () => {
    const pending = deferred();
    mocks.markAll.mockReturnValue(pending.promise);
    render(<NotificationList initialNotifications={[make("a"), make("b")]} />);

    const button = screen.getByRole("button", { name: /Mark all read/ });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(mocks.markAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.reject(new Error("fetch failed"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByText(/You have/)).toHaveTextContent("2 unread notifications");
  });
});

describe("NotificationBell read-state handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtime.handler = null;
    mocks.markOne.mockResolvedValue({ success: true });
    mocks.markAll.mockResolvedValue({ success: true });
  });
  afterEach(() => cleanup());

  const openBell = () =>
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));

  const renderBell = (items: Notification[]) =>
    render(<NotificationBell userId="user-1" initialNotifications={items} />);

  it("shows the real unread count and updates it on success", async () => {
    renderBell([make("a"), make("b")]);
    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
    openBell();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /Mark as read/ })[0]);
    });
    expect(mocks.markOne).toHaveBeenCalledWith("a");
    expect(screen.getByRole("button", { name: /1 unread/ })).toBeInTheDocument();
  });

  it("restores the unread state and shows a safe error when the update is rejected", async () => {
    mocks.markOne.mockResolvedValue({ success: false, error: "raw" });
    renderBell([make("a")]);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark as read/ }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("button", { name: /1 unread/ })).toBeInTheDocument();
  });

  it("restores the unread state when the call throws", async () => {
    mocks.markOne.mockRejectedValue(new Error("offline"));
    renderBell([make("a")]);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark as read/ }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("alert")).not.toHaveTextContent("offline");
    expect(screen.getByRole("button", { name: /1 unread/ })).toBeInTheDocument();
  });

  it("ignores duplicate clicks, and a rollback never removes a Realtime insert that arrived meanwhile", async () => {
    const pending = deferred();
    mocks.markOne.mockReturnValue(pending.promise);
    renderBell([make("a")]);
    openBell();

    const button = screen.getByRole("button", { name: /Mark as read/ });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(mocks.markOne).toHaveBeenCalledTimes(1);

    // A new notification arrives over Realtime while the request is in flight.
    await act(async () => {
      mocks.realtime.handler?.({ new: make("fresh") });
    });
    expect(screen.getByText("Title fresh")).toBeInTheDocument();

    await act(async () => {
      pending.resolve({ success: false });
    });
    expect(screen.getByText("Title fresh")).toBeInTheDocument();
    expect(screen.getByText("Title a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
  });

  it("deduplicates a Realtime event for a notification that is already listed", async () => {
    renderBell([make("a")]);
    await act(async () => {
      mocks.realtime.handler?.({ new: make("a") });
    });
    expect(screen.getByRole("button", { name: /1 unread/ })).toBeInTheDocument();
  });

  it("keeps the allowlisted link and hides links to pages that do not exist", () => {
    renderBell([
      make("m", null, "/account/messages/abc"),
      make("r", null, "/account/reports"),
      make("x", null, "https://evil.example"),
    ]);
    openBell();

    const panel = screen.getByText("Notifications", { selector: "h3" }).closest("div")!.parentElement!;
    const hrefs = within(panel)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/account/messages/abc");
    expect(hrefs).not.toContain("/account/reports");
    expect(hrefs.some((h) => h?.includes("evil"))).toBe(false);
  });

  it("mark all in the bell rolls back on failure", async () => {
    mocks.markAll.mockResolvedValue({ success: false });
    renderBell([make("a"), make("b")]);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
  });
});
