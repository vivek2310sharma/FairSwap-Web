import { describe, expect, it, vi } from "vitest";
import { getSellerListingsPage, getSellerPublicListings } from "@/lib/discovery/queries";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({}) }));

describe("seller listings read", () => {
  it("treats a payload with no items array as a failed read, not a crash", async () => {
    for (const payload of [true, {}, { categories: [] }, { items: null }, []]) {
      rpc.mockResolvedValueOnce({ data: payload, error: null });
      expect(await getSellerListingsPage("seller-1")).toBeNull();
    }
  });

  it("the listing-detail 'more from this seller' list degrades to empty on a malformed payload", async () => {
    rpc.mockResolvedValueOnce({ data: {}, error: null });
    await expect(getSellerPublicListings("seller-1", "x")).resolves.toEqual([]);
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(getSellerPublicListings("seller-1", "x")).resolves.toEqual([]);
  });

  it("still excludes the current listing and caps at 8 for a valid payload", async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `id-${i}` }));
    rpc.mockResolvedValueOnce({ data: { items, categories: [] }, error: null });
    const result = await getSellerPublicListings("seller-1", "id-0");
    expect(result).toHaveLength(8);
    expect(result.map((l) => l.id)).not.toContain("id-0");
  });
});
