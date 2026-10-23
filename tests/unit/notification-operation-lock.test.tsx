import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";

const mocks = vi.hoisted(() => ({
  markOne: vi.fn(),
  markAll: vi.fn(),
  realtime: { handler: null as null | ((payload: { new: unknown }) => void) },
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
import {
  NOTIFICATION_UPDATE_ERROR,
  useNotificationReadState,
} from "@/components/communication/useNotificationReadState";
import type { Notification } from "@/types/communication";

const make = (id: string, read_at: string | null = null): Notification => ({
  id,
  user_id: "user-1",
  type: "new_message",
  title: `Title ${id}`,
  body: `Body ${id}`,
  link: null,
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

const markAllButton = () => screen.getByRole("button", { name: /Mark all read/ });
const markReadButtons = () => screen.getAllByRole("button", { name: /Mark read/ });
const unreadText = () => screen.getByText(/You have/).textContent;

describe("NotificationList: mutations never overlap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markOne.mockResolvedValue({ success: true });
    mocks.markAll.mockResolvedValue({ success: true });
  });
  afterEach(() => cleanup());

  it("disables Mark all read while a single mark-read is in flight, and never calls the server for it", async () => {
    const single = deferred();
    mocks.markOne.mockReturnValue(single.promise);
    render(<NotificationList initialNotifications={[make("a"), make("b")]} />);

    await act(async () => {
      fireEvent.click(markReadButtons()[0]);
    });

    const button = markAllButton();
    expect(button).toBeDisabled();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mocks.markAll).not.toHaveBeenCalled();

    await act(async () => {
      single.resolve({ success: true });
    });
    expect(markAllButton()).toBeEnabled();
  });

  it("prevents the reported race: a failing single request cannot leave a notification unread after mark-all", async () => {
    const single = deferred();
    mocks.markOne.mockReturnValue(single.promise);
    render(<NotificationList initialNotifications={[make("a"), make("b")]} />);

    // 1. A is optimistically read; 2. the user tries mark-all while A is pending.
    await act(async () => {
      fireEvent.click(markReadButtons()[0]);
    });
    await act(async () => {
      fireEvent.click(markAllButton());
    });
    // Mark-all is blocked, so it cannot succeed on the database behind A's back.
    expect(mocks.markAll).not.toHaveBeenCalled();

    // 3. A's request fails: it rolls back and the UI honestly shows it as unread (the DB agrees).
    await act(async () => {
      single.resolve({ success: false });
    });
    expect(unreadText()).toContain("2 unread notifications");
    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);

    // 4. Now mark-all is allowed and brings everything to a consistent state.
    await act(async () => {
      fireEvent.click(markAllButton());
    });
    expect(mocks.markAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it("does not call single mark-read from a link click while mark-all is running", async () => {
    const all = deferred();
    mocks.markAll.mockReturnValue(all.promise);
    render(<NotificationList initialNotifications={[{ ...make("a"), link: "/account/messages/abc" }]} />);

    await act(async () => {
      fireEvent.click(markAllButton());
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: /View Details/ }));
    });

    expect(mocks.markOne).not.toHaveBeenCalled();
    await act(async () => {
      all.resolve({ success: true });
    });
  });

  it("still lets different notifications be marked read at the same time", async () => {
    const a = deferred();
    const b = deferred();
    mocks.markOne.mockImplementation((id: string) => (id === "a" ? a.promise : b.promise));
    render(<NotificationList initialNotifications={[make("a"), make("b")]} />);

    const [first, second] = markReadButtons();
    await act(async () => {
      fireEvent.click(first);
      fireEvent.click(second);
    });
    expect(mocks.markOne).toHaveBeenCalledTimes(2);

    await act(async () => {
      a.resolve({ success: true });
      b.resolve({ success: false });
    });
    // A stays read, B rolls back.
    expect(unreadText()).toContain("1 unread notification");
  });

  it("success, rejection and thrown errors all release the lock", async () => {
    for (const outcome of ["success", "reject", "throw"] as const) {
      cleanup();
      vi.clearAllMocks();
      mocks.markAll.mockResolvedValue({ success: true });
      if (outcome === "success") mocks.markOne.mockResolvedValue({ success: true });
      if (outcome === "reject") mocks.markOne.mockResolvedValue({ success: false });
      if (outcome === "throw") mocks.markOne.mockRejectedValue(new Error("offline"));

      render(<NotificationList initialNotifications={[make("a"), make("b")]} />);
      await act(async () => {
        fireEvent.click(markReadButtons()[0]);
      });

      expect(markAllButton(), outcome).toBeEnabled();
      if (outcome !== "success") {
        expect(screen.getByRole("alert"), outcome).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
        expect(screen.getByRole("alert")).not.toHaveTextContent("offline");
      }
    }
  });

  it("a rollback never removes a Realtime insert, even with the lock in place", async () => {
    const single = deferred();
    mocks.markOne.mockReturnValue(single.promise);
    render(<NotificationBell userId="user-1" initialNotifications={[make("a")]} />);
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark as read/ }));
    });
    await act(async () => {
      mocks.realtime.handler?.({ new: make("fresh") });
    });
    await act(async () => {
      single.resolve({ success: false });
    });

    expect(screen.getByText("Title fresh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
  });
});

describe("NotificationBell: mutations never overlap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtime.handler = null;
    mocks.markOne.mockResolvedValue({ success: true });
    mocks.markAll.mockResolvedValue({ success: true });
  });
  afterEach(() => cleanup());

  const openBell = () => fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));

  it("disables Mark all read while a single mark-read is pending and blocks the call", async () => {
    const single = deferred();
    mocks.markOne.mockReturnValue(single.promise);
    render(<NotificationBell userId="user-1" initialNotifications={[make("a"), make("b")]} />);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /Mark as read/ })[0]);
    });
    const all = screen.getByRole("button", { name: /Mark all read/ });
    expect(all).toBeDisabled();
    await act(async () => {
      fireEvent.click(all);
    });
    expect(mocks.markAll).not.toHaveBeenCalled();

    await act(async () => {
      single.resolve({ success: false });
    });
    expect(screen.getByRole("button", { name: /2 unread/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark all read/ })).toBeEnabled();
  });

  it("disables a single Mark as read for a notification that arrives while mark-all is pending", async () => {
    const all = deferred();
    mocks.markAll.mockReturnValue(all.promise);
    render(<NotificationBell userId="user-1" initialNotifications={[make("a")]} />);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    // A new notification arrives over Realtime while mark-all is in flight.
    await act(async () => {
      mocks.realtime.handler?.({ new: make("fresh") });
    });

    const single = screen.getByRole("button", { name: /Mark as read/ });
    expect(single).toBeDisabled();
    await act(async () => {
      fireEvent.click(single);
    });
    expect(mocks.markOne).not.toHaveBeenCalled();

    await act(async () => {
      all.resolve({ success: true });
    });
    // The lock is released: the new notification can now be marked read on its own.
    expect(screen.getByRole("button", { name: /Mark as read/ })).toBeEnabled();
  });

  it("restores the notifications and releases the lock when mark-all is rejected", async () => {
    const all = deferred();
    mocks.markAll.mockReturnValue(all.promise);
    render(<NotificationBell userId="user-1" initialNotifications={[make("a")]} />);
    openBell();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    await act(async () => {
      all.resolve({ success: false });
    });

    expect(screen.getByRole("button", { name: /Mark as read/ })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
  });
});

describe("policy-review path when the server guard blocks a notification action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markAll.mockResolvedValue({ success: true });
  });
  afterEach(() => cleanup());

  const policyBlock = (redirectTo: string) => ({
    success: false,
    error: "Please review and accept updated Public Beta policies to continue.",
    requiresPolicyReview: true,
    redirectTo,
  });

  it("explains the block and links to the existing policy-review screen, with the update rolled back", async () => {
    const target = "/account/policy-review?next=%2Faccount%2Fnotifications";
    mocks.markOne.mockResolvedValue(policyBlock(target));
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButtons()[0]);
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("review and accept updated Public Beta policies");
    expect(screen.getByRole("link", { name: "Review policies" })).toHaveAttribute("href", target);
    expect(unreadText()).toContain("1 unread notification");
  });

  it("does the same for mark-all and for the bell", async () => {
    const target = "/account/policy-review?next=%2Faccount%2Fnotifications";
    mocks.markAll.mockResolvedValue(policyBlock(target));
    render(<NotificationList initialNotifications={[make("a"), make("b")]} />);

    await act(async () => {
      fireEvent.click(markAllButton());
    });
    expect(screen.getByRole("link", { name: "Review policies" })).toHaveAttribute("href", target);
    expect(unreadText()).toContain("2 unread notifications");
    cleanup();

    mocks.realtime.handler = null;
    render(<NotificationBell userId="user-1" initialNotifications={[make("a")]} />);
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    expect(screen.getByRole("link", { name: "Review policies" })).toHaveAttribute("href", target);
  });

  it("offers a sign-in link when the guard reports a signed-out session", async () => {
    mocks.markOne.mockResolvedValue({
      success: false,
      error: "Please sign in to continue.",
      redirectTo: "/auth/sign-in?next=%2Faccount%2Fnotifications",
    });
    render(<NotificationList initialNotifications={[make("a")]} />);

    await act(async () => {
      fireEvent.click(markReadButtons()[0]);
    });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Faccount%2Fnotifications"
    );
  });

  it("ignores any other or unsafe redirect target and falls back to the generic message", async () => {
    for (const redirectTo of [
      "https://evil.example/account/policy-review",
      "//evil.example",
      "/\\evil.example",
      "/admin/users",
      "javascript:alert(1)",
      "%2F%2Fevil.example",
    ]) {
      cleanup();
      mocks.markOne.mockResolvedValue(policyBlock(redirectTo));
      render(<NotificationList initialNotifications={[make("a")]} />);

      await act(async () => {
        fireEvent.click(markReadButtons()[0]);
      });

      expect(screen.queryByRole("link", { name: /Review policies|Sign in/ }), redirectTo).toBeNull();
      expect(screen.getByRole("alert"), redirectTo).toHaveTextContent(NOTIFICATION_UPDATE_ERROR);
      expect(unreadText()).toContain("1 unread notification");
    }
  });
});

describe("useNotificationReadState: the lock holds even when called programmatically", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markOne.mockResolvedValue({ success: true });
    mocks.markAll.mockResolvedValue({ success: true });
  });

  const setup = (items: Notification[]) =>
    renderHook(() => {
      const [notifications, setNotifications] = useState(items);
      return { notifications, ...useNotificationReadState(notifications, setNotifications) };
    });

  it("markAll is a no-op while a single mark-read is pending, so a later single failure cannot contradict it", async () => {
    const single = deferred();
    mocks.markOne.mockReturnValue(single.promise);
    const { result } = setup([make("a"), make("b")]);

    await act(async () => {
      void result.current.markOne("a");
    });
    expect(result.current.isMarkAllDisabled).toBe(true);

    await act(async () => {
      await result.current.markAll();
    });
    expect(mocks.markAll).not.toHaveBeenCalled();

    await act(async () => {
      single.resolve({ success: false });
    });
    expect(result.current.notifications.find((n) => n.id === "a")?.read_at).toBeNull();
    expect(result.current.isMarkAllDisabled).toBe(false);
  });

  it("markOne is a no-op while mark-all is pending", async () => {
    const all = deferred();
    mocks.markAll.mockReturnValue(all.promise);
    const { result } = setup([make("a"), make("b")]);

    await act(async () => {
      void result.current.markAll();
    });
    expect(result.current.isMarkOneDisabled("a")).toBe(true);

    await act(async () => {
      await result.current.markOne("a");
    });
    expect(mocks.markOne).not.toHaveBeenCalled();

    await act(async () => {
      all.resolve({ success: true });
    });
    expect(result.current.notifications.every((n) => n.read_at)).toBe(true);
    expect(result.current.isBusy).toBe(false);
  });

  it("releases the lock after success, rejection and a thrown error", async () => {
    for (const outcome of ["success", "reject", "throw"] as const) {
      vi.clearAllMocks();
      if (outcome === "success") mocks.markOne.mockResolvedValue({ success: true });
      if (outcome === "reject") mocks.markOne.mockResolvedValue({ success: false });
      if (outcome === "throw") mocks.markOne.mockRejectedValue(new Error("offline"));
      mocks.markAll.mockResolvedValue({ success: true });
      const { result } = setup([make("a"), make("b")]);

      await act(async () => {
        await result.current.markOne("a");
      });
      expect(result.current.isBusy, outcome).toBe(false);

      await act(async () => {
        await result.current.markAll();
      });
      expect(mocks.markAll, outcome).toHaveBeenCalledTimes(1);
    }
  });
});
