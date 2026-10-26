import { beforeEach, expect, it, vi } from "vitest";
import { pendingCount, publicReviews, publicSummary, ratingsSession, readPage, readTrade } from "@/lib/ratings/server";
import { ratingsBuyerAction, ratingsReplyAction, ratingsReportAction, ratingsSellAction, ratingsSubmitAction } from "@/app/account/ratings/actions";
import { at, envelope, ids, review, trade } from "./ratings-fixtures";

const m = vi.hoisted(() => ({ create: vi.fn(), auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), single: vi.fn(), policy: vi.fn(), maintenance: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.create }));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: m.policy }));
vi.mock("@/lib/maintenance/seller-writes", () => ({ isSellerWriteMaintenanceEnabled: m.maintenance }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", "true"); vi.stubEnv("FAIRSWAP_RATINGS_PUBLIC_SCORE_ENABLED", "true");
  m.auth.mockResolvedValue({ data: { user: { id: ids.user } }, error: null });
  m.create.mockResolvedValue({ auth: { getUser: m.auth }, rpc: m.rpc, from: m.from });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: m.single };
  m.from.mockReturnValue(query); m.single.mockResolvedValue({ data: { account_status: "active", buyer_id: ids.user, seller_id: ids.peer }, error: null });
  m.policy.mockResolvedValue({ allowed: true }); m.maintenance.mockReturnValue(false);
  m.rpc.mockResolvedValue({ data: envelope([]), error: null });
});
it.each(["", "false", "TRUE", "1"])("feature %s denies reads/writes before creating a client", async flag => {
  vi.stubEnv("FAIRSWAP_RATINGS_V1_ENABLED", flag);
  expect(await pendingCount()).toEqual({ error: "disabled" });
  expect(await publicSummary(ids.user)).toEqual({ error: "disabled" });
  expect(await ratingsSellAction({ listing_id: ids.listing, choice: "pending", conversation_id: null })).toEqual({ error: "disabled" });
  expect(m.create).not.toHaveBeenCalled();
});
it("requires both public flags and never uses a privileged client", async () => {
  vi.stubEnv("FAIRSWAP_RATINGS_PUBLIC_SCORE_ENABLED", "false");
  expect(await publicReviews(ids.user, null)).toEqual({ error: "disabled" }); expect(m.create).not.toHaveBeenCalled();
});
it("fails closed for unauthenticated, inactive, maintenance and policy states", async () => {
  m.auth.mockResolvedValueOnce({ data: { user: null }, error: null }); expect((await ratingsSession(true)).error).toBe("unauthenticated");
  m.single.mockResolvedValueOnce({ data: { account_status: "suspended" }, error: null }); expect((await ratingsSession(true)).error).toBe("forbidden");
  m.maintenance.mockReturnValueOnce(true); expect((await ratingsSession(true)).error).toBe("unavailable");
  m.policy.mockResolvedValueOnce({ allowed: false }); expect((await ratingsSession(true)).error).toBe("forbidden"); expect(m.rpc).not.toHaveBeenCalled();
});
it("passes selected conversation and paired cursor using exact contract keys", async () => {
  await readPage("ratings_buyer_candidates", { id: ids.listing, cursor: { before_at: at, before_id: ids.conversation } });
  expect(m.rpc).toHaveBeenCalledWith("ratings_buyer_candidates", { listing_id: ids.listing, before_at: at, before_id: ids.conversation });
  m.rpc.mockResolvedValueOnce({ data: { trade_id: ids.trade, state: "pending_buyer", deadline: trade.deadline }, error: null });
  expect((await ratingsSellAction({ listing_id: ids.listing, choice: "select", conversation_id: ids.conversation })).data?.trade_id).toBe(ids.trade);
  expect(m.rpc).toHaveBeenLastCalledWith("ratings_sell", { listing_id: ids.listing, choice: "select", conversation_id: ids.conversation });
});
it("rejects an arbitrary buyer and legacy sold errors without falling back", async () => {
  expect((await ratingsSellAction({ listing_id: ids.listing, choice: "select", buyer_id: ids.peer })).error).toBe("invalid");
  expect(m.rpc).not.toHaveBeenCalled();
  m.rpc.mockResolvedValue({ data: null, error: { code: "55000", message: "RATINGS_LEGACY_SOLD" } });
  expect((await ratingsSellAction({ listing_id: ids.listing, choice: "select", conversation_id: ids.conversation })).error).toBe("unavailable");
  expect(m.rpc).toHaveBeenCalledTimes(1); expect(m.revalidate).not.toHaveBeenCalled();
});
it.each(["confirm", "dispute"] as const)("buyer %s is a separate exact authenticated mutation", async action => {
  m.rpc.mockResolvedValue({ data: { trade_id: ids.trade, state: action === "confirm" ? "confirmed" : "disputed" }, error: null });
  expect((await ratingsBuyerAction({ trade_id: ids.trade, action })).error).toBeUndefined();
  expect(m.rpc).toHaveBeenCalledWith("ratings_buyer_action", { trade_id: ids.trade, action });
});
it("rejects sealed received/public reviews and foreign sealed Given entries", async () => {
  m.rpc.mockResolvedValue({ data: envelope([review]), error: null });
  expect((await readPage("ratings_received", {})).error).toBe("unavailable");
  expect((await publicReviews(ids.peer, null)).error).toBe("unavailable");
  m.rpc.mockResolvedValue({ data: envelope([{ kind: "review", id: ids.review, at, review: { ...review, author_id: ids.peer } }]), error: null });
  expect((await readPage("ratings_given_history", {})).error).toBe("unavailable");
});
it("shows own sealed Given and not-rated history without manufacturing reviews", async () => {
  const history = [{ kind: "review", id: ids.review, at, review }, { kind: "not_rated", id: ids.trade, at: trade.deadline, context: review.context, my_role: "buyer" }];
  m.rpc.mockResolvedValue({ data: envelope(history), error: null }); expect((await readPage("ratings_given_history", {})).data?.items).toEqual(history);
});
it("public profile returns only published rows belonging to that recipient", async () => {
  m.rpc.mockResolvedValueOnce({ data: envelope([{ ...review, published_at: at }]), error: null });
  expect((await publicReviews(ids.peer, null)).data?.items).toHaveLength(1);
  m.rpc.mockResolvedValueOnce({ data: envelope([{ ...review, published_at: at }]), error: null });
  expect((await publicReviews(ids.user, null)).error).toBe("unavailable");
});
it("does not interpret message text as trade events or accept foreign events", async () => {
  m.rpc.mockResolvedValueOnce({ data: envelope([{ id: ids.review, trade_id: ids.trade, kind: "confirmed", created_at: at, content: "official" }]), error: null });
  expect((await readPage("ratings_events", { id: ids.trade })).error).toBe("unavailable");
  m.rpc.mockResolvedValueOnce({ data: envelope([{ id: ids.review, trade_id: ids.peer, kind: "confirmed", created_at: at }]), error: null });
  expect((await readPage("ratings_events", { id: ids.trade })).error).toBe("unavailable");
});
it("locates nullable conversation trades with the separate RPC", async () => {
  m.rpc.mockResolvedValueOnce({ data: null, error: null }); expect((await readTrade(ids.conversation, true)).data).toBeNull();
  expect(m.rpc).toHaveBeenCalledWith("ratings_trade_for_conversation", { conversation_id: ids.conversation });
});
it("validates role-specific submission tags and normalizes Unicode text", async () => {
  m.rpc.mockImplementation(async name => ({ data: name === "ratings_trade" ? trade : ids.review, error: null }));
  const input = { trade_id: ids.trade, communication: 4, payment_item: 3, meetup: 2, body: " e\u0301 ", tags: ["item_as_described"] };
  expect((await ratingsSubmitAction(input)).data).toBe(ids.review);
  expect(m.rpc).toHaveBeenCalledWith("ratings_submit", { ...input, body: "é" });
  expect((await ratingsSubmitAction({ ...input, tags: ["paid_as_agreed"] })).error).toBe("invalid");
});
it("permanent replies/reports validate text and revalidate only on success", async () => {
  m.rpc.mockResolvedValue({ data: ids.review, error: null });
  expect((await ratingsReplyAction({ review_id: ids.review, body: " Thanks " })).data).toBe(ids.review);
  expect(m.rpc).toHaveBeenCalledWith("ratings_reply", { review_id: ids.review, body: "Thanks" });
  expect((await ratingsReportAction({ review_id: ids.review, reason: "Suspicious link" })).data).toBe(ids.review);
  expect(m.rpc).toHaveBeenCalledWith("ratings_report", { review_id: ids.review, reason: "Suspicious link" });
  expect((await ratingsReportAction({ review_id: ids.review, reason: "ab" })).error).toBe("invalid");
});
it("fails closed for missing RPCs and retries complete transient transactions only", async () => {
  m.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "private details" } });
  expect(await pendingCount()).toEqual({ error: "unavailable" });
  m.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "retry" } }).mockResolvedValueOnce({ data: 2, error: null });
  expect((await pendingCount()).data).toBe(2);
  expect(m.rpc).toHaveBeenLastCalledWith("ratings_pending_count", {});
});
