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
import {
  assertRpcSuccess,
  claimJobs,
  parseInvocationPayload,
} from "./email-outbox-worker";

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
  const parsedPayload = parseInvocationPayload(body);
  if ("error" in parsedPayload) {
    return json(400, { error: "Invalid outbox invocation" });
  }

  try {
    const jobs = await claimJobs(supabase, parsedPayload.targetJobId);
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
      await assertRpcSuccess(supabase.rpc("fail_email_outbox_job", {
        p_job_id: job.id,
        p_lock_token: job.lock_token,
        p_error_code: S1_CAPTURE_CODE,
        p_error_status: 0,
        p_error_message: `Issue 118 ${cfg.runId}: intentionally not delivered; no email-provider request`,
        p_is_permanent: true,
        p_max_attempts: 5,
        p_backoff_seconds: 0,
      }), "S1 non-delivering outbox persistence failure");
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
