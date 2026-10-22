import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createFakeSupabase, type FakeResult } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  reply: vi.fn(),
  refresh: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: vi.fn(), refresh: mocks.refresh }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: mocks.info, warn: mocks.warn, error: mocks.error, debug: vi.fn() },
}));
vi.mock("@/components/footer", () => ({ Footer: () => null }));

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/account/notifications/actions";
import NotificationsPage from "@/app/account/notifications/page";

const NOTIFICATION_ID = "9b2f6f1e-1234-4abc-8def-0123456789ab";

function actionScenario(opts: { policyAccepted?: boolean; read?: FakeResult; readAll?: FakeResult } = {}) {
  const { policyAccepted = true, read = { data: null }, readAll = { data: null } } = opts;
  const fake = createFakeSupabase({
    user: { id: "user-1" },
    rpc: (name) => {
      if (name === "has_current_policy_acceptance") return { data: policyAccepted };
      if (name === "mark_notification_read") return read;
      if (name === "mark_all_notifications_read") return readAll;
      return { data: null };
    },
  });
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

describe("notification server actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("report success only when the RPC succeeds", async () => {
    const fake = actionScenario();
    expect(await markNotificationReadAction(NOTIFICATION_ID)).toEqual({ success: true });
    expect(await markAllNotificationsReadAction()).toEqual({ success: true });
    expect(fake.rpcCalls.map((c) => c.name)).toContain("mark_notification_read");
    expect(fake.rpcCalls.find((c) => c.name === "mark_notification_read")?.args).toEqual({
      notification_id: NOTIFICATION_ID,
    });
  });

  it("return success:false and a safe message, never raw database text, on RPC errors", async () => {
    actionScenario({
      read: { error: { message: 'permission denied for table "notifications"', code: "42501" } },
      readAll: { error: { message: "connection to 10.0.0.5 refused", code: "08006" } },
    });

    const one = await markNotificationReadAction(NOTIFICATION_ID);
    const all = await markAllNotificationsReadAction();

    for (const result of [one, all]) {
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/could not update your notifications/i);
      expect(result.error).not.toMatch(/permission denied|10\.0\.0\.5|refused/);
    }
  });

  it("do not report success when policy re-acceptance is required", async () => {
    const fake = actionScenario({ policyAccepted: false });
    const one = await markNotificationReadAction(NOTIFICATION_ID);

    expect(one.success).toBe(false);
    expect(fake.rpcCalls.some((c) => c.name === "mark_notification_read")).toBe(false);
  });
});

describe("notifications page load failures", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("shows an explicit error, not 'No notifications yet', when the initial query fails", async () => {
    const fake = createFakeSupabase({
      user: { id: "user-1" },
      tables: { notifications: { error: { message: "boom", code: "XX000" } } },
    });
    mocks.createClient.mockResolvedValue(fake.client);

    render(await NotificationsPage());

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your notifications");
    expect(screen.queryByText("No notifications yet")).toBeNull();
    expect(screen.queryByText(/All caught up/)).toBeNull();
    expect(mocks.error).toHaveBeenCalled();
  });

  it("still shows the real empty state when the query succeeds with no rows", async () => {
    const fake = createFakeSupabase({
      user: { id: "user-1" },
      tables: { notifications: { data: [] } },
    });
    mocks.createClient.mockResolvedValue(fake.client);

    render(await NotificationsPage());

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses semantic tokens instead of a hard-coded dark palette", async () => {
    const fake = createFakeSupabase({ user: { id: "user-1" }, tables: { notifications: { data: [] } } });
    mocks.createClient.mockResolvedValue(fake.client);

    const { container } = render(await NotificationsPage());

    expect(container.innerHTML).not.toMatch(/stone-\d{3}/);
    expect(container.innerHTML).toContain("bg-background");
  });
});

describe("SupportReplyForm failure messages", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  async function renderForm() {
    vi.doMock("@/app/account/support/actions", () => ({
      customerReplySupportTicketAction: mocks.reply,
    }));
    vi.resetModules();
    const { SupportReplyForm } = await import("@/components/communication/SupportReplyForm");
    render(<SupportReplyForm ticketId="9b2f6f1e-1234-4abc-8def-0123456789ab" />);
  }

  const send = async () => {
    fireEvent.change(screen.getByLabelText("Add a reply"), { target: { value: "Thanks for the help" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Send reply" }).closest("form")!);
    });
  };

  it("never shows a raw exception message", async () => {
    mocks.reply.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5:5432 at pg.connect"));
    await renderForm();

    await send();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/check your connection/i);
    expect(alert).not.toHaveTextContent(/ECONNREFUSED|10\.0\.0\.5|pg\.connect/);
    expect(screen.getByLabelText("Add a reply")).toHaveValue("Thanks for the help");
  });

  it("shows the server's already-safe message and keeps the text for a retry", async () => {
    mocks.reply.mockResolvedValue({ error: "We could not submit your request. Please try again shortly." });
    await renderForm();

    await send();

    expect(await screen.findByRole("alert")).toHaveTextContent("could not submit your request");
    expect(screen.getByLabelText("Add a reply")).toHaveValue("Thanks for the help");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("clears the box and refreshes the thread on success", async () => {
    mocks.reply.mockResolvedValue({ success: true });
    await renderForm();

    await send();

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Add a reply")).toHaveValue("");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
