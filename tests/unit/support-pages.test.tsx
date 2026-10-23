import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createFakeSupabase, type FakeResult } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  logError: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/account/support",
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.logError, debug: vi.fn() },
}));
vi.mock("@/components/footer", () => ({ Footer: () => null }));

import SupportPage from "@/app/account/support/page";
import SupportTicketPage from "@/app/account/support/[id]/page";

const USER = { id: "user-1", email: "me@example.com" };
const TICKET_ID = "9b2f6f1e-1234-4abc-8def-0123456789ab";

const ticketRow = {
  id: TICKET_ID,
  category: "safety",
  subject: "Fake courier link",
  status: "open",
  priority: "normal",
  created_at: "2026-10-20T10:00:00.000Z",
  updated_at: "2026-10-21T10:00:00.000Z",
};

function listScenario(opts: { status?: string | null; tickets?: FakeResult } = {}) {
  const { status = "active", tickets = { data: [ticketRow] } } = opts;
  const fake = createFakeSupabase({
    user: USER,
    tables: {
      user_accounts:
        status === null
          ? { data: null, error: { message: "fail" } }
          : { data: { account_status: status } },
      support_tickets: tickets,
    },
  });
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

describe("Support list page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.createClient.mockResolvedValue(createFakeSupabase({ user: null }).client);
    await expect(SupportPage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account/support");
  });

  it("uses only schema-valid columns and scopes tickets to the owner", async () => {
    const fake = listScenario();
    render(await SupportPage());

    const ticketQuery = fake.queries.find((q) => q.table === "support_tickets");
    expect(ticketQuery?.select).toBe("id, category, subject, status, priority, created_at, updated_at");
    expect(ticketQuery?.select).not.toContain("ticket_number");
    expect(ticketQuery?.eq).toContainEqual(["user_id", USER.id]);

    // Account status comes from user_accounts, never profiles.
    expect(fake.queries.some((q) => q.table === "profiles")).toBe(false);
    const accountQuery = fake.queries.find((q) => q.table === "user_accounts");
    expect(accountQuery?.eq).toContainEqual(["user_id", USER.id]);
  });

  it("lists tickets with a short id reference instead of ticket_number", async () => {
    listScenario();
    render(await SupportPage());

    const link = screen.getByRole("link", { name: /Fake courier link/ });
    expect(link).toHaveAttribute("href", `/account/support/${TICKET_ID}`);
    expect(link).toHaveTextContent("#9B2F6F1E");
    expect(link).toHaveTextContent("Safety & scam concern");
    expect(link).toHaveTextContent("Open");
  });

  it("shows the empty state only when the query succeeded with no tickets", async () => {
    listScenario({ tickets: { data: [] } });
    render(await SupportPage());

    expect(screen.getByText("No support tickets")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an explicit error, not the empty state, when the tickets query fails", async () => {
    listScenario({ tickets: { error: { message: "column support_tickets.ticket_number does not exist", code: "42703" } } });
    render(await SupportPage());

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your support tickets");
    expect(screen.queryByText("No support tickets")).toBeNull();
    expect(screen.queryByText(/ticket_number/)).toBeNull();
    expect(mocks.logError).toHaveBeenCalled();
  });

  it("offers the scam report, safety tips and grievance links to active accounts", async () => {
    listScenario();
    render(await SupportPage());

    expect(screen.getByRole("link", { name: /Report a scam/ })).toHaveAttribute(
      "href",
      "/account/support/report-scam"
    );
    expect(screen.getByRole("link", { name: /Safety tips/ })).toHaveAttribute(
      "href",
      "https://help.fairswap.in/en/articles/avoid-upi-scams"
    );
    expect(screen.getByRole("link", { name: /Grievance Officer/ })).toHaveAttribute("href", "/grievance");
    expect(screen.getByRole("button", { name: "New inquiry" })).toBeInTheDocument();
  });

  it("suspended accounts see the appeal flow only, with no scam-report link", async () => {
    listScenario({ status: "suspended" });
    render(await SupportPage());

    expect(screen.getByRole("alert")).toHaveTextContent("Account suspended");
    expect(screen.getByRole("button", { name: "Submit appeal" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Report a scam/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Fake courier link/ })).toBeInTheDocument();
  });

  it("deletion-pending, deleted and unverifiable accounts do not query or show tickets", async () => {
    for (const status of ["deletion_pending", "deleted", null]) {
      const fake = listScenario({ status });
      const view = render(await SupportPage());

      expect(fake.queries.some((q) => q.table === "support_tickets"), String(status)).toBe(false);
      expect(screen.getByRole("alert")).toHaveTextContent("Support tickets are unavailable");
      expect(screen.queryByRole("button", { name: /New inquiry|Submit appeal/ })).toBeNull();
      expect(screen.queryByText("No support tickets")).toBeNull();
      view.unmount();
    }
  });
});

describe("Support ticket detail page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  function detailScenario(opts: {
    ticket?: FakeResult;
    messages?: FakeResult;
    user?: typeof USER | null;
    accountStatus?: string | null;
  } = {}) {
    const {
      ticket = { data: { ...ticketRow, user_id: USER.id } },
      messages = {
        data: [
          {
            id: "m1",
            ticket_id: TICKET_ID,
            sender_id: USER.id,
            is_internal_note: false,
            content: "He asked for advance payment.",
            created_at: "2026-10-20T10:00:00.000Z",
          },
          {
            id: "m2",
            ticket_id: TICKET_ID,
            sender_id: "staff-secret-id",
            is_internal_note: false,
            content: "Thanks, we are reviewing this.",
            created_at: "2026-10-20T11:00:00.000Z",
          },
        ],
      },
      user = USER,
      accountStatus = "active",
    } = opts;
    const fake = createFakeSupabase({
      user,
      tables: {
        support_tickets: ticket,
        support_messages: messages,
        user_accounts:
          accountStatus === null
            ? { data: null, error: { message: "fail" } }
            : { data: { account_status: accountStatus } },
      },
    });
    mocks.createClient.mockResolvedValue(fake.client);
    return fake;
  }

  it("treats malformed ids as not found without querying", async () => {
    const fake = detailScenario();
    await expect(SupportTicketPage(params("../../etc/passwd"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(fake.queries).toHaveLength(0);
  });

  it("redirects unauthenticated users to sign-in for that ticket", async () => {
    detailScenario({ user: null });
    await expect(SupportTicketPage(params(TICKET_ID))).rejects.toThrow(
      `REDIRECT:/auth/sign-in?next=/account/support/${TICKET_ID}`
    );
  });

  it("queries only valid columns, scoped to the owner, ordered oldest first, without a profiles join", async () => {
    const fake = detailScenario();
    render(await SupportTicketPage(params(TICKET_ID)));

    const ticketQuery = fake.queries.find((q) => q.table === "support_tickets");
    expect(ticketQuery?.select).not.toContain("ticket_number");
    expect(ticketQuery?.eq).toContainEqual(["id", TICKET_ID]);
    expect(ticketQuery?.eq).toContainEqual(["user_id", USER.id]);

    const messageQuery = fake.queries.find((q) => q.table === "support_messages");
    expect(messageQuery?.select).toBe("id, ticket_id, sender_id, is_internal_note, content, created_at");
    expect(messageQuery?.select).not.toMatch(/is_staff_reply|profiles|sender:/);
    expect(messageQuery?.eq).toContainEqual(["ticket_id", TICKET_ID]);
    expect(messageQuery?.eq).toContainEqual(["is_internal_note", false]);
    expect(messageQuery?.order?.[0]).toBe("created_at");
    expect(fake.queries.some((q) => q.table === "profiles")).toBe(false);
  });

  it("labels messages You / FairSwap Support without exposing staff identity", async () => {
    detailScenario();
    const { container } = render(await SupportTicketPage(params(TICKET_ID)));

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("You")).toBeInTheDocument();
    expect(within(items[1]).getByText("FairSwap Support")).toBeInTheDocument();
    expect(container.textContent).not.toContain("staff-secret-id");
    expect(screen.getByRole("heading", { level: 1, name: "Fake courier link" })).toBeInTheDocument();
    expect(screen.getByText("#9B2F6F1E")).toBeInTheDocument();
  });

  it("never presents an unidentified sender as FairSwap Support", async () => {
    detailScenario({
      messages: {
        data: [
          {
            id: "m-null",
            ticket_id: TICKET_ID,
            sender_id: null,
            is_internal_note: false,
            content: "Message from a removed account.",
            created_at: "2026-10-20T12:00:00.000Z",
          },
        ],
      },
    });
    render(await SupportTicketPage(params(TICKET_ID)));

    const item = screen.getByRole("listitem");
    expect(within(item).getByText("Unknown sender")).toBeInTheDocument();
    expect(within(item).queryByText("FairSwap Support")).toBeNull();
    expect(within(item).queryByText("You")).toBeNull();
  });

  it("returns not found when the ticket does not exist or belongs to someone else", async () => {
    detailScenario({ ticket: { data: null } });
    await expect(SupportTicketPage(params(TICKET_ID))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows an explicit error when the ticket or messages cannot be loaded", async () => {
    detailScenario({ ticket: { error: { message: "boom", code: "XX000" } } });
    const first = render(await SupportTicketPage(params(TICKET_ID)));
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load this ticket");
    first.unmount();

    detailScenario({ messages: { error: { message: "boom", code: "XX000" } } });
    render(await SupportTicketPage(params(TICKET_ID)));
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load the messages");
    expect(mocks.logError).toHaveBeenCalled();
  });

  it("hides the reply form for closed tickets", async () => {
    detailScenario({ ticket: { data: { ...ticketRow, status: "closed", user_id: USER.id } } });
    render(await SupportTicketPage(params(TICKET_ID)));

    expect(screen.queryByLabelText("Add a reply")).toBeNull();
    expect(screen.getByText(/This ticket is closed/)).toBeInTheDocument();
  });

  it("shows an accessible reply form on open tickets", async () => {
    detailScenario();
    render(await SupportTicketPage(params(TICKET_ID)));

    expect(screen.getByLabelText("Add a reply")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reply" })).toBeInTheDocument();
  });

  describe("reply availability by account status", () => {
    const appeal = { ...ticketRow, category: "moderation_appeal", user_id: USER.id };
    const ordinary = { ...ticketRow, category: "general", user_id: USER.id };

    it("offers the reply form to active accounts", async () => {
      detailScenario({ ticket: { data: ordinary }, accountStatus: "active" });
      render(await SupportTicketPage(params(TICKET_ID)));
      expect(screen.getByLabelText("Add a reply")).toBeInTheDocument();
    });

    it("hides the reply form for a suspended account on an ordinary ticket and explains why", async () => {
      detailScenario({ ticket: { data: ordinary }, accountStatus: "suspended" });
      render(await SupportTicketPage(params(TICKET_ID)));

      expect(screen.queryByLabelText("Add a reply")).toBeNull();
      expect(screen.queryByRole("button", { name: "Send reply" })).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent("only reply to moderation appeals");
    });

    it("keeps the reply form for a suspended account on a moderation appeal", async () => {
      detailScenario({ ticket: { data: appeal }, accountStatus: "suspended" });
      render(await SupportTicketPage(params(TICKET_ID)));

      expect(screen.getByLabelText("Add a reply")).toBeInTheDocument();
    });

    it("hides the form when the account status cannot be verified, with a safe message", async () => {
      detailScenario({ ticket: { data: ordinary }, accountStatus: null });
      render(await SupportTicketPage(params(TICKET_ID)));

      expect(screen.queryByLabelText("Add a reply")).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent("could not verify your account status");
    });

    it("scopes the account-status lookup to the signed-in user and never renders internal notes", async () => {
      const fake = detailScenario({
        ticket: { data: ordinary },
        messages: {
          data: [
            {
              id: "internal",
              ticket_id: TICKET_ID,
              sender_id: "staff-secret-id",
              is_internal_note: true,
              content: "INTERNAL STAFF NOTE",
              created_at: "2026-10-20T10:00:00.000Z",
            },
          ],
        },
      });
      const { container } = render(await SupportTicketPage(params(TICKET_ID)));

      const accountQuery = fake.queries.find((q) => q.table === "user_accounts");
      expect(accountQuery?.eq).toContainEqual(["user_id", USER.id]);
      const messageQuery = fake.queries.find((q) => q.table === "support_messages");
      expect(messageQuery?.eq).toContainEqual(["is_internal_note", false]);
      // The fake returns the row regardless of filters; the page must not leak staff ids anywhere.
      expect(container.innerHTML).not.toContain("staff-secret-id");
    });
  });
});
