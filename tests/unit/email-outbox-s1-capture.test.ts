// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import {
  S1CaptureConfigSchema,
  S1_CAPTURE_CODE,
  S1_TEST_SUPABASE_URL,
  handleS1CaptureRequest,
} from "../../supabase/functions/_shared/email-outbox-s1-capture";

const listingIds = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
];
const staffId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const recipientOtherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const jobId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const lockToken = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const testEndpoint = "https://wpppxlnbzqynvhpeuavd.supabase.co/functions/v1/process-email-outbox-s1-capture";

function config(overrides: Record<string, unknown> = {}) {
  return {
    supabaseUrl: S1_TEST_SUPABASE_URL,
    supabaseServiceRoleKey: "FAKE_TEST_SERVICE_TOKEN_NOT_A_SECRET",
    emailWorkerSecret: "fake-s1-worker-secret-123456",
    approval: "ISSUE-118-TEST-CAPTURE-NO-DELIVERY",
    runId: "S1-local-unit-run-12345",
    expiresAtUtc: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    approvedListingIds: listingIds,
    approvedStaffRecipientId: staffId,
    ...overrides,
  };
}

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: jobId,
    event_type: "listing_submitted_for_review",
    recipient_user_id: staffId,
    listing_id: listingIds[0],
    transition_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    lock_token: lockToken,
    attempt_count: 1,
    status: "processing",
    payload: { listing_title: "S1 synthetic title" },
    ...overrides,
  };
}

function mockSupabase(rows = [job()]) {
  const rpc = vi.fn().mockImplementation(async (name: string) => {
    if (name === "claim_email_outbox_job_by_id" || name === "claim_email_outbox_batch") {
      return { data: rows, error: null };
    }
    return { data: true, error: null };
  });
  const getUserById = vi.fn();
  return { rpc, auth: { admin: { getUserById } } } as any;
}

function request({
  body = {},
  method = "POST",
  secret = "fake-s1-worker-secret-123456",
}: { body?: unknown; method?: string; secret?: string } = {}) {
  return new Request(testEndpoint, {
    method,
    headers: { "Content-Type": "application/json", "x-email-worker-secret": secret },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
}

describe("Issue 118: S1 Test-only non-delivery capture worker", () => {
  it("requires the exact hosted FairSwapTest Supabase URL and explicit operator approval", async () => {
    for (const invalid of [
      { supabaseUrl: "https://kriuhwppxgxsyyrbjsau.supabase.co" },
      { supabaseUrl: "https://attacker.example" },
      { supabaseUrl: "http://wpppxlnbzqynvhpeuavd.supabase.co" },
      { approval: "wrong" },
      { emailWorkerSecret: "short" },
      { approvedListingIds: listingIds.slice(0, 2) },
      { approvedListingIds: [listingIds[0], listingIds[0], listingIds[2]] },
    ]) {
      const supabase = mockSupabase();
      const result = await handleS1CaptureRequest(request(), config(invalid), supabase);
      expect(result.status).toBe(503);
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
  });

  it("refuses expired or excessively distant windows, with no default to a live sender", async () => {
    for (const expiresAtUtc of [
      new Date(Date.now() - 60 * 1000).toISOString(),
      new Date(Date.now() + 90 * 60 * 1000).toISOString(),
    ]) {
      const supabase = mockSupabase();
      const res = await handleS1CaptureRequest(request(), config({ expiresAtUtc }), supabase);
      expect(res.status).toBe(503);
      expect(supabase.rpc).not.toHaveBeenCalled();
    }
    expect(S1CaptureConfigSchema.safeParse(config()).success).toBe(true);
  });

  it("requires POST, worker secret and strict body before any claiming", async () => {
    for (const req of [
      request({ method: "GET" }),
      request({ secret: "wrong" }),
      request({ body: { record: { id: "not-a-uuid" } } }),
      request({ body: { arbitrary: "recipient override not permitted" } }),
    ]) {
      const sb = mockSupabase();
      const res = await handleS1CaptureRequest(req, config(), sb);
      expect([400, 401, 405]).toContain(res.status);
      expect(sb.rpc).not.toHaveBeenCalled();
    }
  });

  it("captures a targeted staff notification as permanent non-delivery, never falsely SENT", async () => {
    const sb = mockSupabase();
    const res = await handleS1CaptureRequest(request({
      body: { record: { id: jobId } },
    }), config(), sb);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true, mode: "no_delivery", processed: 1, captured: 1, delivered: 0,
    });
    expect(sb.rpc).toHaveBeenCalledWith("claim_email_outbox_job_by_id",
      expect.objectContaining({ p_job_id: jobId }));
    expect(sb.rpc).toHaveBeenCalledWith("fail_email_outbox_job", expect.objectContaining({
      p_job_id: jobId,
      p_lock_token: lockToken,
      p_error_code: S1_CAPTURE_CODE,
      p_is_permanent: true,
      p_error_status: 0,
      p_backoff_seconds: 0,
    }));
    expect(sb.rpc).not.toHaveBeenCalledWith("complete_email_outbox_job", expect.anything());
    expect(sb.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("captures exactly the approved three listings through the cron batch without recipient lookups", async () => {
    const sb = mockSupabase(listingIds.map((id, index) => job({
      id: `dddddddd-dddd-4ddd-8ddd-ddddddddddd${index}`,
      listing_id: id,
    })));
    const res = await handleS1CaptureRequest(request(), config(), sb);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      processed: 3, captured: 3, delivered: 0,
    });
    expect(sb.rpc.mock.calls.filter((x: unknown[]) => x[0] === "fail_email_outbox_job"))
      .toHaveLength(3);
    expect(sb.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("fails closed for existing listings, arbitrary staff recipients, and changed events", async () => {
    for (const different of [
      { listing_id: "99999999-9999-4999-8999-999999999999" },
      { recipient_user_id: recipientOtherId },
      { event_type: "listing_approved" },
    ]) {
      const sb = mockSupabase([job(), job(different)]);
      const res = await handleS1CaptureRequest(request(), config(), sb);
      expect(res.status).toBe(503);
      // Entire batch is checked before any job is permanently captured.
      expect(sb.rpc.mock.calls.map((x: unknown[]) => x[0]))
        .toEqual(["claim_email_outbox_batch"]);
    }
  });

  it("fails closed on provider-independent database claim or persistence errors", async () => {
    const sbClaim = mockSupabase();
    sbClaim.rpc.mockRejectedValueOnce(new Error("postgres unavailable"));
    expect((await handleS1CaptureRequest(request(), config(), sbClaim)).status).toBe(503);

    const sbWrite = mockSupabase();
    sbWrite.rpc.mockImplementation(async (name: string) =>
      name === "fail_email_outbox_job" ?
        { data: false, error: null } :
        { data: [job()], error: null }
    );
    expect((await handleS1CaptureRequest(request(), config(), sbWrite)).status).toBe(503);
  });

  it("handles empty already-claimed batches without sending or altering previous captures", async () => {
    const sb = mockSupabase([]);
    const res = await handleS1CaptureRequest(request({ body: { id: jobId } }), config(), sb);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 0, captured: 0, delivered: 0 });
    expect(sb.rpc.mock.calls.map((x: unknown[]) => x[0]))
      .toEqual(["claim_email_outbox_job_by_id"]);
  });
});
