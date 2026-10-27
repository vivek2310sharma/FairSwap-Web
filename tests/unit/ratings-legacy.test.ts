import { beforeEach, expect, it, vi } from "vitest";
import { transitionListingAction } from "@/app/account/listings/actions";
import { ids } from "./ratings-fixtures";
const m = vi.hoisted(() => ({ create: vi.fn(), rpc: vi.fn(), enabled: vi.fn(), sell: vi.fn(), policy: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.create }));
vi.mock("@/lib/ratings/server", () => ({ ratingsEnabled: m.enabled }));
vi.mock("@/app/account/ratings/actions", () => ({ ratingsSellAction: m.sell }));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: m.policy }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); m.create.mockResolvedValue({ rpc: m.rpc }); m.policy.mockResolvedValue({ allowed: true }); m.rpc.mockResolvedValue({ error: null }); });
it("feature OFF retains the existing sold RPC and does not call Ratings", async () => {
  m.enabled.mockReturnValue(false); expect((await transitionListingAction(ids.listing, "mark_sold")).success).toBe(true);
  expect(m.rpc).toHaveBeenCalledWith("seller_transition_listing", { listing_id: ids.listing, action: "mark_sold" }); expect(m.sell).not.toHaveBeenCalled();
});
it("feature ON uses Ratings atomically without falling back on failure", async () => {
  m.enabled.mockReturnValue(true); m.sell.mockResolvedValue({ error: "unavailable" });
  expect((await transitionListingAction(ids.listing, "mark_sold")).error).toBeTruthy(); expect(m.rpc).not.toHaveBeenCalled();
  expect(m.sell).toHaveBeenCalledWith({ listing_id: ids.listing, choice: "pending", conversation_id: null });
});
