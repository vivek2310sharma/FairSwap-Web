"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import * as c from "@/lib/ratings/contracts";
import { callRatings, pendingCount, ratingsSession, readPage, readTrade } from "@/lib/ratings/server";

export async function ratingsPageAction(name: "ratings_pending" | "ratings_received" | "ratings_given_history" | "ratings_buyer_candidates" | "ratings_events", input: unknown) {
  if (!["ratings_pending", "ratings_received", "ratings_given_history", "ratings_buyer_candidates", "ratings_events"].includes(name)) return { error: "invalid" as const };
  return readPage(name, input);
}
export async function ratingsCountAction() { return pendingCount(); }
function refreshRatings() {
  revalidatePath("/account/ratings", "layout"); revalidatePath("/account"); revalidatePath("/account/listings");
  revalidatePath("/account/messages", "layout"); revalidatePath("/seller/[id]", "page"); revalidatePath("/listings/[slug]", "page");
}
export async function ratingsSellAction(input: unknown) {
  const parsed = c.sellSchema.safeParse(input); if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(true); if (session.error) return { error: session.error };
  const result = await callRatings(session.db, "ratings_sell", parsed.data, c.sellResultSchema);
  if (result.data) refreshRatings(); return result;
}
export async function ratingsBuyerAction(input: unknown) {
  const parsed = c.buyerActionSchema.safeParse(input); if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(true); if (session.error) return { error: session.error };
  const result = await callRatings(session.db, "ratings_buyer_action", parsed.data, c.buyerResultSchema);
  if (result.data) refreshRatings(); return result;
}
export async function ratingsSubmitAction(input: unknown) {
  const parsed = c.submissionSchema.safeParse(input); if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(true); if (session.error) return { error: session.error };
  const role = await ratingsRole(parsed.data.trade_id); if (!role.data) return { error: "unavailable" as const };
  if (parsed.data.tags.some(t => !c.tagsFor(role.data).includes(t))) return { error: "invalid" as const };
  const result = await callRatings(session.db, "ratings_submit", parsed.data, c.uuid);
  if (result.data) refreshRatings(); return result;
}
export async function ratingsReplyAction(input: unknown) {
  const parsed = z.object({ review_id: c.uuid, body: c.requiredTextSchema }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(true); if (session.error) return { error: session.error };
  const result = await callRatings(session.db, "ratings_reply", parsed.data, c.uuid);
  if (result.data) refreshRatings(); return result;
}
export async function ratingsReportAction(input: unknown) {
  const parsed = z.object({ review_id: c.uuid, reason: c.reasonSchema }).strict().safeParse(input);
  if (!parsed.success) return { error: "invalid" as const };
  const session = await ratingsSession(true); if (session.error) return { error: session.error };
  const result = await callRatings(session.db, "ratings_report", parsed.data, c.uuid);
  if (result.data) refreshRatings(); return result;
}
export async function ratingsRole(id: string): Promise<c.Result<"buyer" | "seller">> {
  const trade = await readTrade(id); if (!trade.data?.conversation_id) return { error: "unavailable" };
  const session = await ratingsSession(); if (session.error) return { error: session.error };
  const result = await session.db.from("conversations").select("buyer_id,seller_id").eq("id", trade.data.conversation_id).single();
  const row = z.object({ buyer_id: c.uuid.nullable(), seller_id: c.uuid.nullable() }).safeParse(result.data);
  if (result.error || !row.success) return { error: "unavailable" };
  return row.data.buyer_id === session.userId ? { data: "buyer" } : row.data.seller_id === session.userId ? { data: "seller" } : { error: "forbidden" };
}
