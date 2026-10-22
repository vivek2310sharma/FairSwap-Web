import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type FakeResult } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/logger", () => ({
  logger: { info: mocks.info, warn: mocks.warn, error: mocks.error, debug: vi.fn() },
}));

import {
  createSupportTicketAction,
  customerReplySupportTicketAction,
} from "@/app/account/support/actions";
import { submitScamReportAction } from "@/app/account/support/report-scam/actions";

const TICKET_ID = "9b2f6f1e-1234-4abc-8def-0123456789ab";
const USER = { id: "user-1", email: "private.person@example.com" };
const SECRET_SUBJECT = "UPI scam from Rahul 98XXXXXX01";
const SECRET_MESSAGE = "He asked me to pay Rs 500 to rahul@upi before viewing the bike.";

interface Scenario {
  user?: typeof USER | null;
  accountStatus?: string | null;
  policyAccepted?: boolean;
  createTicket?: FakeResult;
  reply?: FakeResult;
}

function scenario({
  user = USER,
  accountStatus = "active",
  policyAccepted = true,
  createTicket = { data: TICKET_ID },
  reply = { data: null },
}: Scenario = {}) {
  const fake = createFakeSupabase({
    user,
    tables: {
      user_accounts:
        accountStatus === null
          ? { data: null, error: { message: "boom" } }
          : { data: { account_status: accountStatus } },
    },
    rpc: (name) => {
      if (name === "has_current_policy_acceptance") return { data: policyAccepted };
      if (name === "create_support_ticket") return createTicket;
      if (name === "customer_reply_support_ticket") return reply;
      return { data: null };
    },
  });
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

function scamForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

const loggedText = () =>
  JSON.stringify([mocks.info.mock.calls, mocks.warn.mock.calls, mocks.error.mock.calls]);

describe("createSupportTicketAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the existing RPC with its unchanged signature and canonical category", async () => {
    const fake = scenario();
    const result = await createSupportTicketAction({
      category: "safety",
      subject: "  A safety concern  ",
      message: "  Details here  ",
    });

    expect(result).toEqual({ success: true, ticketId: TICKET_ID });
    expect(fake.rpcCalls).toEqual([
      {
        name: "create_support_ticket",
        args: { category: "safety", subject: "A safety concern", message: "Details here" },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/support");
  });

  it("accepts FormData input", async () => {
    scenario();
    const result = await createSupportTicketAction(
      scamForm({ category: "bug", subject: "Page is broken", message: "The page shows an error." })
    );
    expect(result.success).toBe(true);
  });

  it("rejects legacy and unknown categories server-side without calling the RPC", async () => {
    const fake = scenario();
    for (const category of ["listing_issue", "safety_concern", "other", "admin"]) {
      const result = await createSupportTicketAction({
        category,
        subject: "Valid subject",
        message: "Valid message",
      });
      expect(result.error, category).toMatch(/valid support category/i);
      expect(result.success).toBeUndefined();
    }
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("enforces subject and message limits before calling the RPC", async () => {
    const fake = scenario();
    expect((await createSupportTicketAction({ category: "general", subject: "ab", message: "ok" })).error).toMatch(
      /at least 3/
    );
    expect(
      (await createSupportTicketAction({ category: "general", subject: "x".repeat(151), message: "ok" })).error
    ).toMatch(/150/);
    expect(
      (await createSupportTicketAction({ category: "general", subject: "Valid subject", message: "x".repeat(3001) }))
        .error
    ).toMatch(/3000/);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("shows a friendly rate-limit message and no raw database text", async () => {
    scenario({
      createTicket: {
        error: { message: "RATE_LIMIT_EXCEEDED: Maximum 3 support tickets allowed per 24 hours", code: "P0001" },
      },
    });
    const result = await createSupportTicketAction({
      category: "general",
      subject: "Valid subject",
      message: "Valid message",
    });
    expect(result.error).toMatch(/limit of 3 support tickets/);
    expect(result.error).not.toMatch(/RATE_LIMIT_EXCEEDED/);
  });

  it("does not log the subject or message", async () => {
    scenario();
    await createSupportTicketAction({ category: "general", subject: SECRET_SUBJECT, message: SECRET_MESSAGE });
    scenario({ createTicket: { error: { message: "Account restricted", code: "P0001" } } });
    await createSupportTicketAction({ category: "general", subject: SECRET_SUBJECT, message: SECRET_MESSAGE });

    const logs = loggedText();
    expect(logs).not.toContain(SECRET_SUBJECT);
    expect(logs).not.toContain(SECRET_MESSAGE);
    expect(logs).not.toContain("rahul@upi");
  });
});

describe("customerReplySupportTicketAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed ticket ids and empty or oversized replies without an RPC", async () => {
    const fake = scenario();
    expect((await customerReplySupportTicketAction({ ticketId: "not-a-uuid", content: "hi" })).error).toMatch(
      /Invalid support ticket/
    );
    expect((await customerReplySupportTicketAction({ ticketId: TICKET_ID, content: "  " })).error).toMatch(/empty/);
    expect(
      (await customerReplySupportTicketAction({ ticketId: TICKET_ID, content: "x".repeat(3001) })).error
    ).toMatch(/3000/);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("sends a valid reply and hides raw database errors", async () => {
    const fake = scenario();
    expect(await customerReplySupportTicketAction({ ticketId: TICKET_ID, content: "Thanks" })).toEqual({
      success: true,
    });
    expect(fake.rpcCalls[0]).toEqual({
      name: "customer_reply_support_ticket",
      args: { ticket_id: TICKET_ID, content: "Thanks" },
    });

    scenario({ reply: { error: { message: 'relation "support_messages" does not exist' } } });
    const failed = await customerReplySupportTicketAction({ ticketId: TICKET_ID, content: "Thanks" });
    expect(failed.error).not.toMatch(/relation|support_messages/);
  });
});

describe("submitScamReportAction", () => {
  beforeEach(() => vi.clearAllMocks());

  const valid = { subject: SECRET_SUBJECT, message: SECRET_MESSAGE };

  it("requires authentication and sends the user to sign-in", async () => {
    const fake = scenario({ user: null });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.redirectTo).toBe(
      `/auth/sign-in?next=${encodeURIComponent("/account/support/report-scam")}`
    );
    expect(fake.rpcCalls.some((c) => c.name === "create_support_ticket")).toBe(false);
  });

  it("creates a safety ticket through create_support_ticket and redirects to that ticket", async () => {
    const fake = scenario();
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result).toEqual({
      success: true,
      ticketId: TICKET_ID,
      redirectTo: `/account/support/${TICKET_ID}`,
    });
    const create = fake.rpcCalls.filter((c) => c.name === "create_support_ticket");
    expect(create).toEqual([
      {
        name: "create_support_ticket",
        args: { category: "safety", subject: SECRET_SUBJECT, message: SECRET_MESSAGE },
      },
    ]);
  });

  it("fixes the category to safety even if the client submits another one", async () => {
    const fake = scenario();
    await submitScamReportAction(null, scamForm({ ...valid, category: "general" }));
    await submitScamReportAction(null, scamForm({ ...valid, category: "moderation_appeal" }));

    const categories = fake.rpcCalls
      .filter((c) => c.name === "create_support_ticket")
      .map((c) => c.args.category);
    expect(categories).toEqual(["safety", "safety"]);
  });

  it("never touches the reports table or create_report", async () => {
    const fake = scenario();
    await submitScamReportAction(null, scamForm(valid));

    expect(fake.queries.some((q) => q.table === "reports")).toBe(false);
    expect(fake.rpcCalls.some((c) => c.name === "create_report")).toBe(false);
  });

  it("validates input on the server and does not call the RPC when invalid", async () => {
    const fake = scenario();
    const tooShort = await submitScamReportAction(null, scamForm({ subject: "Scam", message: "Short" }));
    expect(tooShort?.error).toBeTruthy();

    const longSubject = await submitScamReportAction(
      null,
      scamForm({ subject: "x".repeat(151), message: SECRET_MESSAGE })
    );
    expect(longSubject?.error).toMatch(/150/);

    const longMessage = await submitScamReportAction(
      null,
      scamForm({ subject: SECRET_SUBJECT, message: "x".repeat(3001) })
    );
    expect(longMessage?.error).toMatch(/3000/);

    const missing = await submitScamReportAction(null, scamForm({}));
    expect(missing?.error).toBeTruthy();

    expect(fake.rpcCalls.some((c) => c.name === "create_support_ticket")).toBe(false);
  });

  it("shows a useful rate-limit error and no success", async () => {
    scenario({
      createTicket: {
        error: { message: "RATE_LIMIT_EXCEEDED: Maximum 3 support tickets allowed per 24 hours", code: "P0001" },
      },
    });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.redirectTo).toBeUndefined();
    expect(result?.error).toMatch(/limit of 3 support tickets in 24 hours/);
  });

  it("returns a generic error for unexpected failures without leaking database text", async () => {
    scenario({ createTicket: { error: { message: "connection to server at 10.0.0.5 failed", code: "08006" } } });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.error).not.toMatch(/10\.0\.0\.5|connection/);
    expect(result?.error).toMatch(/could not submit/i);
  });

  it("blocks suspended accounts (appeals only) before calling the RPC", async () => {
    const fake = scenario({ accountStatus: "suspended" });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.error).toMatch(/suspended/i);
    expect(result?.error).toMatch(/appeal/i);
    expect(fake.rpcCalls.some((c) => c.name === "create_support_ticket")).toBe(false);
  });

  it("blocks deletion-pending, deleted and unverifiable accounts", async () => {
    for (const accountStatus of ["deletion_pending", "deleted", null]) {
      const fake = scenario({ accountStatus });
      const result = await submitScamReportAction(null, scamForm(valid));
      expect(result?.success, String(accountStatus)).toBeUndefined();
      expect(result?.error, String(accountStatus)).toBeTruthy();
      expect(fake.rpcCalls.some((c) => c.name === "create_support_ticket")).toBe(false);
    }
  });

  it("scopes the account-status lookup to the authenticated user", async () => {
    const fake = scenario();
    await submitScamReportAction(null, scamForm(valid));

    const query = fake.queries.find((q) => q.table === "user_accounts");
    expect(query?.eq).toContainEqual(["user_id", USER.id]);
  });

  it("requires current policy acceptance and routes stale users to policy review", async () => {
    const fake = scenario({ policyAccepted: false });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.redirectTo).toContain("/account/policy-review?next=");
    expect(fake.rpcCalls.some((c) => c.name === "create_support_ticket")).toBe(false);
  });

  it("does not claim success or link a ticket when the RPC returns no valid id", async () => {
    for (const data of ["not-a-uuid", null, 42, { id: TICKET_ID }]) {
      scenario({ createTicket: { data } });
      const result = await submitScamReportAction(null, scamForm(valid));

      expect(result?.success, JSON.stringify(data)).toBeUndefined();
      expect(result?.ticketId).toBeUndefined();
      expect(result?.redirectTo).toBeUndefined();
      expect(result?.uncertain).toBe(true);
      expect(result?.error).toMatch(/check your tickets/i);
    }
  });

  it("treats an RPC error without a database code (network failure) as an uncertain outcome", async () => {
    scenario({ createTicket: { error: { message: "TypeError: fetch failed" } } });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.uncertain).toBe(true);
    expect(result?.error).toMatch(/before trying again/i);
    expect(result?.error).not.toMatch(/fetch failed/);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/support");
  });

  it("treats a thrown RPC call as an uncertain outcome, not a failure or success", async () => {
    const fake = scenario();
    (fake.client as { rpc: unknown }).rpc = async (name: string) => {
      if (name === "has_current_policy_acceptance") return { data: true, error: null };
      throw new Error("socket hang up");
    };
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBeUndefined();
    expect(result?.uncertain).toBe(true);
    expect(result?.redirectTo).toBeUndefined();
  });

  it("treats database-coded errors as definitive failures that are safe to retry", async () => {
    scenario({ createTicket: { error: { message: "Account restricted", code: "P0001" } } });
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.uncertain).toBeUndefined();
    expect(result?.error).toMatch(/cannot create support tickets/i);
  });

  it("only returns success together with a validated ticket id and matching redirect", async () => {
    scenario();
    const result = await submitScamReportAction(null, scamForm(valid));

    expect(result?.success).toBe(true);
    expect(result?.ticketId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result?.redirectTo).toBe(`/account/support/${result?.ticketId}`);
  });

  it("never logs the fraud description, subject or email", async () => {
    scenario();
    await submitScamReportAction(null, scamForm(valid));
    scenario({ createTicket: { error: { message: "Account restricted", code: "P0001" } } });
    await submitScamReportAction(null, scamForm(valid));
    scenario({ accountStatus: "suspended" });
    await submitScamReportAction(null, scamForm(valid));

    const logs = loggedText();
    expect(logs).not.toContain(SECRET_SUBJECT);
    expect(logs).not.toContain(SECRET_MESSAGE);
    expect(logs).not.toContain("rahul@upi");
    expect(logs).not.toContain(USER.email);
  });
});
