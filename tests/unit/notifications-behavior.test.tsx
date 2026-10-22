import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { createFakeSupabase } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  markAll: vi.fn().mockResolvedValue({ success: true }),
  markOne: vi.fn().mockResolvedValue({ success: true }),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/footer", () => ({ Footer: () => null }));
vi.mock("@/app/account/notifications/actions", () => ({
  markAllNotificationsReadAction: mocks.markAll,
  markNotificationReadAction: mocks.markOne,
}));

import NotificationsPage from "@/app/account/notifications/page";
import { NotificationList } from "@/components/communication/NotificationList";
import type { Notification } from "@/types/communication";
import { resolveNotificationLink } from "@/lib/notifications/links";

const make = (
  id: string,
  read_at: string | null,
  type: Notification["type"] = "new_message",
  link: string | null = null
): Notification => ({
  id,
  user_id: "user-1",
  type,
  title: `Title ${id}`,
  body: `Body ${id}`,
  link,
  read_at,
  created_at: "2026-10-20T10:00:00.000Z",
});

const TICKET = "9b2f6f1e-1234-4abc-8def-0123456789ab";

describe("Notifications route behavior", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("still requires authentication", async () => {
    mocks.createClient.mockResolvedValue(createFakeSupabase({ user: null }).client);
    await expect(NotificationsPage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account/notifications");
  });

  it("loads only the signed-in user's notifications using real columns", async () => {
    const fake = createFakeSupabase({
      user: { id: "user-1" },
      tables: { notifications: { data: [make("n1", null)] } },
    });
    mocks.createClient.mockResolvedValue(fake.client);

    render(await NotificationsPage());

    const query = fake.queries.find((q) => q.table === "notifications");
    expect(query?.eq).toContainEqual(["user_id", "user-1"]);
    expect(query?.select).toBe("id, user_id, type, title, body, link, read_at, created_at");
    expect(screen.getByText("Title n1")).toBeInTheDocument();
  });

  it("shows a real unread count and marks all read", async () => {
    render(
      <NotificationList
        initialNotifications={[make("a", null), make("b", null), make("c", "2026-10-21T00:00:00Z")]}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    });
    expect(mocks.markAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/All caught up/)).toBeInTheDocument();
  });

  it("renders the database's new_message type and the empty state", () => {
    const first = render(<NotificationList initialNotifications={[make("a", null, "new_message")]} />);
    expect(screen.getByText("Title a")).toBeInTheDocument();
    first.unmount();

    render(<NotificationList initialNotifications={[]} />);
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("builds View links from the real link column using the Backend's formats", () => {
    render(
      <NotificationList
        initialNotifications={[
          make("m", null, "new_message", `/account/messages/${TICKET}`),
          make("l", null, "listing_approved", "/listings/blue-bicycle"),
          make("r", null, "listing_rejected", "/account/listings"),
          make("s", null, "support_reply", `/account/support/${TICKET}`),
        ]}
      />
    );

    const hrefs = screen.getAllByRole("link", { name: /View Details/ }).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      `/account/messages/${TICKET}`,
      "/listings/blue-bicycle",
      "/account/listings",
      `/account/support/${TICKET}`,
    ]);
  });

  it("shows no dead link for report updates (no /account/reports page) or missing links", () => {
    render(
      <NotificationList
        initialNotifications={[
          make("u", null, "report_update", "/account/reports"),
          make("n", null, "report_update", null),
        ]}
      />
    );
    expect(screen.queryByRole("link", { name: /View Details/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Mark read/ })).toHaveLength(2);
  });

  it("marks a notification read when its link is followed and when Mark read is used", async () => {
    render(
      <NotificationList
        initialNotifications={[make("a", null, "new_message", "/account/messages/abc"), make("b", null, "new_message")]}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: /View Details/ }));
    });
    expect(mocks.markOne).toHaveBeenCalledWith("a");

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /Mark read/ })[0]);
    });
    expect(mocks.markOne).toHaveBeenCalledTimes(2);
  });
});

describe("resolveNotificationLink", () => {
  it("allows only in-app account and listing paths", () => {
    expect(resolveNotificationLink("/account/messages/abc")).toBe("/account/messages/abc");
    expect(resolveNotificationLink("/listings/some-slug")).toBe("/listings/some-slug");
    expect(resolveNotificationLink("/account/support/abc?x=1")).toBe("/account/support/abc?x=1");
  });

  it("rejects external, protocol-relative, encoded, script and unknown targets", () => {
    const bad = [
      "https://evil.example/phish",
      "//evil.example",
      "/\\evil.example",
      "%2F%2Fevil.example",
      "javascript:alert(1)",
      "/admin/users",
      "/auth/sign-in",
      "account/listings",
      "",
      null,
      undefined,
    ];
    for (const value of bad) {
      expect(resolveNotificationLink(value), String(value)).toBeNull();
    }
  });

  it("drops /account/reports, which Web has no page for", () => {
    expect(resolveNotificationLink("/account/reports")).toBeNull();
    expect(resolveNotificationLink("/account/reports/")).toBeNull();
  });
});

describe("notification schema alignment", () => {
  const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

  it("no Web notification code reads a payload field or the legacy message_received type", () => {
    for (const file of [
      "src/components/communication/NotificationList.tsx",
      "src/components/communication/NotificationBell.tsx",
      "src/types/communication.ts",
    ]) {
      const content = read(file);
      expect(content, file).not.toMatch(/n\.payload|\.payload\?|payload\?:/);
      expect(content, file).not.toContain("message_received");
    }
  });

  it("notification types match the generated database enum", async () => {
    const { Constants } = await import("@/types/database");
    expect([...Constants.public.Enums.notification_type_enum].sort()).toEqual(
      ["listing_approved", "listing_rejected", "new_message", "report_update", "support_reply"].sort()
    );
  });
});
