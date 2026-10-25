import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { AVATAR_BUCKET } from "@/lib/profile/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Run budget is ~20s (MAX_RUN_MS) plus one in-flight batch; keep the function limit above it.
export const maxDuration = 60;

// Bounded work per invocation: the claim RPC leases rows, so a partial run is safe to resume.
const BATCH_SIZE = 25;
const MAX_BATCHES = 8;
const MAX_RUN_MS = 20_000;
const LEASE_SECONDS = 120;

const NO_STORE = { "Cache-Control": "no-store" };

type ClaimResult = {
  success?: boolean;
  items?: Array<{ id: string; bucket: string; path: string }>;
};

function matchesSecret(given: Buffer, secret: string | undefined): boolean {
  // Fail closed: an unset or trivially short secret never authorizes anything.
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Accepts AVATAR_CLEANUP_SECRET (any scheduler) or CRON_SECRET (Vercel Cron's injected bearer).
function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const okAvatar = matchesSecret(given, process.env.AVATAR_CLEANUP_SECRET);
  const okCron = matchesSecret(given, process.env.CRON_SECRET);
  return okAvatar || okCron;
}

async function drain(): Promise<Response> {
  const service = createServiceRoleClient();
  const started = Date.now();
  const summary = { claimed: 0, deleted: 0, failed: 0, batches: 0 };

  for (let batch = 0; batch < MAX_BATCHES && Date.now() - started < MAX_RUN_MS; batch++) {
    const { data, error } = await service.rpc("service_claim_avatar_cleanup", {
      p_limit: BATCH_SIZE,
      p_lease_seconds: LEASE_SECONDS,
    });
    const claim = data as ClaimResult | null;
    if (error || !claim?.success) {
      logger.error("avatar_cleanup.claim_failed", {
        operation: "avatar-cleanup.claim",
        error_code: error?.code ?? "CLAIM_REJECTED",
      });
      return NextResponse.json({ ok: false, ...summary }, { status: 500, headers: NO_STORE });
    }

    const items = claim.items ?? [];
    if (items.length === 0) break;
    summary.batches += 1;
    summary.claimed += items.length;

    const completed: string[] = [];
    for (const item of items) {
      // Only the dedicated public avatar bucket is ever touched.
      if (item.bucket !== AVATAR_BUCKET) {
        await service.rpc("service_fail_avatar_cleanup", { p_id: item.id, p_error: "UNEXPECTED_BUCKET" });
        summary.failed += 1;
        continue;
      }
      try {
        // Removing an already-missing object is not an error, so retries are idempotent.
        const { error: removeError } = await service.storage.from(AVATAR_BUCKET).remove([item.path]);
        if (removeError) throw new Error("STORAGE_REMOVE_FAILED");
        completed.push(item.id);
      } catch {
        // Fixed code only: never forward storage error text or object paths.
        await service.rpc("service_fail_avatar_cleanup", { p_id: item.id, p_error: "STORAGE_REMOVE_FAILED" });
        summary.failed += 1;
      }
    }

    if (completed.length > 0) {
      const { error: completeError } = await service.rpc("service_complete_avatar_cleanup", { p_ids: completed });
      if (completeError) {
        // Rows stay leased and are re-claimed after the lease; deletes are idempotent.
        logger.error("avatar_cleanup.complete_failed", {
          operation: "avatar-cleanup.complete",
          error_code: completeError.code ?? "COMPLETE_FAILED",
        });
        summary.failed += completed.length;
      } else {
        summary.deleted += completed.length;
      }
    }

    if (items.length < BATCH_SIZE) break;
  }

  return NextResponse.json({ ok: true, ...summary }, { headers: NO_STORE });
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  return drain();
}

// Vercel Cron issues GET requests with `Authorization: Bearer $CRON_SECRET` (see vercel.json crons).
export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
