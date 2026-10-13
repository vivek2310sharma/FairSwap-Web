/**
 * Issue #118: deliberately NON-DELIVERING email outbox capture.
 *
 * For FairSwapTest only. Never deploy to FairSwapProd, never place this endpoint
 * in a Production Vault secret, and never use it for regular notification delivery.
 * This module has NO email provider client, email transport, fetch() or fallback.
 * A captured email remains auditable as DEAD_LETTER, not falsely "sent".
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// These deliberately small RPC/payload helpers are self-contained so this
// capture Edge bundle does NOT even import the production Resend worker.
type ClaimedS1Job = {
  id: string;
  listing_id: string;
  recipient_user_id: string;
  event_type: string;
  lock_token: string | null;
};

function parseS1InvocationPayload(body: unknown): { targetJobId?: string } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length === 0) return { targetJobId: undefined };
  if ("record" in value) {
    const parsed = z.object({ record: z.object({ id: z.string().uuid() }).passthrough() })
      .passthrough().safeParse(value);
    return parsed.success ? { targetJobId: parsed.data.record.id } : null;
  }
  const parsed = z.object({ id: z.string().uuid() }).strict().safeParse(value);
  return parsed.success ? { targetJobId: parsed.data.id } : null;
}

async function claimS1Jobs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  targetJobId?: string
): Promise<ClaimedS1Job[]> {
  const lockToken = crypto.randomUUID();
  const { data, error } = targetJobId
    ? await supabase.rpc("claim_email_outbox_job_by_id", {
      p_job_id: targetJobId, p_lock_token: lockToken, p_stale_timeout_seconds: 600,
    })
    : await supabase.rpc("claim_email_outbox_batch", {
      p_batch_size: 10, p_lock_token: lockToken, p_stale_timeout_seconds: 600,
    });
  if (error || !Array.isArray(data)) throw new Error("S1 email capture could not claim jobs");
  return data as ClaimedS1Job[];
}

async function assertS1CapturePersisted(
  rpc: PromiseLike<{ data: boolean | null; error: { message: string } | null }>
): Promise<void> {
  const { data, error } = await rpc;
  if (error || data !== true) throw new Error("S1 email capture persistence failed");
}


export const S1_TEST_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
export const S1_CAPTURE_CODE = "S1_TEST_CAPTURE_NOT_DELIVERED";

const captureSchemaBase = z.object({
  supabaseUrl: z.literal(S1_TEST_SUPABASE_URL),
  supabaseServiceRoleKey: z.string().min(1),
  emailWorkerSecret: z.string().min(16),
  approval: z.literal("ISSUE-118-TEST-CAPTURE-NO-DELIVERY"),
  runId: z.string().regex(/^S1-[A-Za-z0-9-]{12,64}$/),
  expiresAtUtc: z.string().datetime({ offset: true }),
  approvedListingIds: z.array(z.string().uuid()).length(3),
  approvedStaffRecipientId: z.string().uuid(),
});

export const S1CaptureConfigSchema = captureSchemaBase.superRefine((cfg, ctx) => {
  const remainingMs = Date.parse(cfg.expiresAtUtc) - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0 || remainingMs > 60 * 60 * 1000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiresAtUtc"],
      message: "S1 capture requires an unexpired maximum 60-minute authorization window",
    });
  }
  if (new Set(cfg.approvedListingIds).size !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["approvedListingIds"],
      message: "S1 capture requires three distinct new disposable listing IDs",
    });
  }
});

export type S1CaptureConfig = z.infer<typeof S1CaptureConfigSchema>;

const json = (status: number, data: object) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

/**
 * The same function handles BOTH immediate pg_net webhook calls and scheduled
 * retry batch calls. Unknown rows are never sent or marked captured. They stay
 * claimed until the normal lease expires, and the operator must STOP/inspect.
 */
export async function handleS1CaptureRequest(
  req: Request,
  rawConfig: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<Response> {
  // On expired/mismatched configuration, fail BEFORE claiming jobs. Never
  // revert automatically to a live sender when the 60-minute window expires.
  const parsedConfig = S1CaptureConfigSchema.safeParse(rawConfig);
  if (!parsedConfig.success) {
    return json(503, { error: "S1 capture disabled: incorrect project, manifest, or window" });
  }
  const cfg = parsedConfig.data;

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const secret = req.headers.get("x-email-worker-secret") ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice(7).trim() : "");
  if (secret !== cfg.emailWorkerSecret) {
    return json(401, { error: "Unauthorized" });
  }

  let body: unknown;
  try {
    const raw = await req.text();
    body = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const parsedPayload = parseS1InvocationPayload(body);
  if (parsedPayload === null) {
    return json(400, { error: "Invalid outbox invocation" });
  }

  try {
    const jobs = await claimS1Jobs(supabase, parsedPayload.targetJobId);
    const allowedIds = new Set(cfg.approvedListingIds);

    // Validate the entire claimed batch BEFORE completing any capture.
    // A changed staff recipient, unexpected family, pre-existing row or an
    // unexpected event immediately stops the run: zero provider calls.
    if (jobs.some((j) =>
      j.event_type !== "listing_submitted_for_review" ||
      j.recipient_user_id !== cfg.approvedStaffRecipientId ||
      !allowedIds.has(j.listing_id)
    ) || jobs.length > 3) {
      return json(503, { error: "Unexpected outbox target. STOP S1; inspect claimed lease." });
    }

    for (const job of jobs) {
      await assertS1CapturePersisted(supabase.rpc("fail_email_outbox_job", {
        p_job_id: job.id,
        p_lock_token: job.lock_token,
        p_error_code: S1_CAPTURE_CODE,
        p_error_status: 0,
        p_error_message: `Issue 118 ${cfg.runId}: intentionally not delivered; no email-provider request`,
        p_is_permanent: true,
        p_max_attempts: 5,
        p_backoff_seconds: 0,
      }));
    }

    return json(200, {
      ok: true,
      mode: "no_delivery",
      processed: jobs.length,
      captured: jobs.length,
      delivered: 0,
    });
  } catch {
    // No generic error fallback into the live sender, ever.
    return json(503, { error: "S1 capture operational failure. STOP and inspect database." });
  }
}
