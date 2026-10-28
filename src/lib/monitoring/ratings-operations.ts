import "server-only";
import { timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendOperationsTextAlert } from "./operations-alert";

const codes = z.enum(["schedule_drift", "cron_failed", "cron_stalled", "publication_missing",
  "reminder_missing", "publication_backlog", "invalid_reputation", "duplicate_notifications",
  "notification_missing", "moderation_unresolved"]);
const claimSchema = z.array(z.object({ code: codes, token: z.string().uuid() }).strict()).max(10);
type OperationsDatabase = { public: { Tables: Record<string, never>; Views: Record<string, never>;
  Functions: { ratings_operations_claim: { Args: Record<string, never>; Returns: unknown };
    ratings_operations_ack: { Args: { code: string; token: string }; Returns: unknown } } } };

export function authorizedRatingsMonitor(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(request.headers.get("authorization") ?? ""), hash(`Bearer ${secret}`));
}

export function ratingsMonitorEnvironment(): "FairSwapTest" | "FairSwapProd" {
  const environment = process.env.RATINGS_OPERATIONS_ENVIRONMENT;
  const expected = environment === "FairSwapTest" ? "https://wpppxlnbzqynvhpeuavd.supabase.co"
    : environment === "FairSwapProd" ? "https://kriuhwppxgxsyyrbjsau.supabase.co" : null;
  if (!expected || process.env.NEXT_PUBLIC_SUPABASE_URL !== expected) throw new Error("RATINGS_MONITOR_ENVIRONMENT_MISMATCH");
  return environment as "FairSwapTest" | "FairSwapProd";
}

/** Only aggregate alert codes leave the service boundary. Failed delivery is not acknowledged. */
export async function monitorRatingsOperations(): Promise<number> {
  const environment = ratingsMonitorEnvironment();
  const db = createServiceRoleClient() as unknown as SupabaseClient<OperationsDatabase>;
  const result = await db.rpc("ratings_operations_claim", {});
  if (result.error) throw new Error("RATINGS_MONITOR_UNAVAILABLE");
  const claims = claimSchema.parse(result.data);
  if (!claims.length) return 0;
  const delivery = await sendOperationsTextAlert(
    `[FairSwap] Ratings V1 environment=${environment} severity=error owner=Vivek-Kumar codes=${claims.map(c => c.code).join(",")} runbook=FairSwap-Backend/docs/operations/RATINGS_V1_OPERATIONS.md`
  );
  if (!delivery.ok) throw new Error("RATINGS_ALERT_DELIVERY_FAILED");
  for (const claim of claims) {
    const ack = await db.rpc("ratings_operations_ack", claim);
    if (ack.error || ack.data !== true) throw new Error("RATINGS_ALERT_ACK_FAILED");
  }
  return claims.length;
}
