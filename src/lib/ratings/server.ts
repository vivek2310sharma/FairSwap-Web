import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { isSellerWriteMaintenanceEnabled } from "@/lib/maintenance/seller-writes";
import * as c from "./contracts";

export const ratingsEnabled = () => process.env.FAIRSWAP_RATINGS_V1_ENABLED === "true";
export const publicRatingsEnabled = () => ratingsEnabled() && process.env.FAIRSWAP_RATINGS_PUBLIC_SCORE_ENABLED === "true";
// Domain-only schema until hosted migrations can generate the canonical database artifact.
type Args = {
  ratings_sell: z.infer<typeof c.sellSchema>; ratings_buyer_action: z.infer<typeof c.buyerActionSchema>;
  ratings_submit: z.infer<typeof c.submissionSchema>; ratings_reply: { review_id: string; body: string }; ratings_report: { review_id: string; reason: string };
  ratings_buyer_candidates: PageArgs & { listing_id: string }; ratings_pending: PageArgs; ratings_pending_count: Record<string, never>;
  ratings_given_history: PageArgs; ratings_received: PageArgs; ratings_public_reviews: PageArgs & { user_id: string };
  ratings_summary: { user_id: string }; ratings_trade: { trade_id: string }; ratings_trade_for_conversation: { conversation_id: string };
  ratings_events: PageArgs & { trade_id: string };
};
type PageArgs = { before_at: string | null; before_id: string | null };
type DomainDatabase = { public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: { [K in keyof Args]: { Args: Args[K]; Returns: unknown } } } };
export async function callRatings<K extends keyof Args, S extends z.ZodTypeAny>(db: SupabaseClient, name: K, args: Args[K], schema: S): Promise<c.Result<z.infer<S>>> {
  try {
    const domain = db as unknown as SupabaseClient<DomainDatabase>;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await domain.rpc(name, args);
      if (result.error) {
        if (["40P01", "40001", "55P03"].includes(result.error.code) && attempt < 2) continue;
        return { error: result.error.code === "42501" ? "forbidden" : result.error.message === "RATINGS_WINDOW_CLOSED" ? "expired" : "unavailable" };
      }
      const parsed = schema.safeParse(result.data);
      return parsed.success ? { data: parsed.data } : { error: "unavailable" };
    }
  } catch { /* Fail closed without exposing backend messages or internal evidence. */ }
  return { error: "unavailable" };
}
export async function ratingsSession(write = false) {
  if (!ratingsEnabled()) return { error: "disabled" as const };
  try {
    const db = await createClient(); const auth = await db.auth.getUser();
    if (auth.error || !auth.data.user) return { error: "unauthenticated" as const };
    const account = await db.from("user_accounts").select("account_status").eq("user_id", auth.data.user.id).single();
    if (account.error || account.data?.account_status !== "active") return { error: "forbidden" as const };
    if (write) {
      if (isSellerWriteMaintenanceEnabled()) return { error: "unavailable" as const };
      const policy = await requireCurrentPolicyAcceptance(db, "/account/ratings");
      if (!policy.allowed) return { error: "forbidden" as const };
    }
    return { db, userId: auth.data.user.id };
  } catch { return { error: "unavailable" as const }; }
}
export type ReadName = "ratings_pending" | "ratings_given_history" | "ratings_received" | "ratings_buyer_candidates" | "ratings_events";
const schemas = { ratings_pending: c.pageSchema(c.pendingSchema), ratings_given_history: c.pageSchema(c.historySchema), ratings_received: c.pageSchema(c.reviewSchema), ratings_buyer_candidates: c.pageSchema(c.candidateSchema), ratings_events: c.pageSchema(c.eventSchema) };
export async function readPage<K extends ReadName>(name: K, input: unknown): Promise<c.Result<z.infer<(typeof schemas)[K]>>> {
  const parsed = z.object({ id: c.uuid.optional(), cursor: c.cursorSchema.nullable().optional() }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const session = await ratingsSession(); if (session.error) return { error: session.error };
  const page = { before_at: parsed.data.cursor?.before_at ?? null, before_id: parsed.data.cursor?.before_id ?? null };
  if ((name === "ratings_buyer_candidates" || name === "ratings_events") && !parsed.data.id) return { error: "invalid" };
  const args = name === "ratings_buyer_candidates" ? { ...page, listing_id: parsed.data.id! } : name === "ratings_events" ? { ...page, trade_id: parsed.data.id! } : page;
  const result = await callRatings(session.db, name, args as Args[K], schemas[name]);
  if (result.error) return result;
  if (name === "ratings_received" && (result.data.items as c.Review[]).some(r => !r.published_at || r.recipient_id !== session.userId)) return { error: "unavailable" };
  if (name === "ratings_given_history" && (result.data.items as z.infer<typeof c.historySchema>[]).some(r => r.kind === "review" && r.review.author_id !== session.userId)) return { error: "unavailable" };
  if (name === "ratings_events" && (result.data.items as z.infer<typeof c.eventSchema>[]).some(e => e.trade_id !== parsed.data.id)) return { error: "unavailable" };
  return result;
}
export async function readTrade(id: unknown, conversation = false) {
  const parsed = c.uuid.safeParse(id); if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(); if (session.error) return { error: session.error };
  const result = conversation ? await callRatings(session.db, "ratings_trade_for_conversation", { conversation_id: parsed.data }, c.tradeSchema.nullable())
    : await callRatings(session.db, "ratings_trade", { trade_id: parsed.data }, c.tradeSchema);
  if (result.data && (conversation ? result.data.conversation_id !== null && result.data.conversation_id !== parsed.data : result.data.id !== parsed.data)) return { error: "unavailable" as const };
  return result;
}
export async function pendingCount() {
  const session = await ratingsSession(); if (session.error) return { error: session.error };
  return callRatings(session.db, "ratings_pending_count", {}, z.number().int().nonnegative());
}
export async function publicSummary(userId: string) {
  if (!publicRatingsEnabled()) return { error: "disabled" as const };
  if (!c.uuid.safeParse(userId).success) return { error: "invalid" as const };
  try {
    const result = await callRatings(await createClient(), "ratings_summary", { user_id: userId }, c.summarySchema.nullable());
    if (result.data && result.data.user_id !== userId) return { error: "unavailable" as const };
    return result;
  } catch { return { error: "unavailable" as const }; }
}
export async function publicReviews(userId: string, cursor: c.Cursor | null) {
  if (!publicRatingsEnabled()) return { error: "disabled" as const };
  if (!c.uuid.safeParse(userId).success || !c.cursorSchema.nullable().safeParse(cursor).success) return { error: "invalid" as const };
  try {
    const result = await callRatings(await createClient(), "ratings_public_reviews", { user_id: userId, before_at: cursor?.before_at ?? null, before_id: cursor?.before_id ?? null }, c.pageSchema(c.reviewSchema));
    if (result.data?.items.some(r => !r.published_at || r.recipient_id !== userId)) return { error: "unavailable" as const };
    return result;
  } catch { return { error: "unavailable" as const }; }
}
