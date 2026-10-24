import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSellerListingsParams } from "@/types/listing";
import { formatMemberSince } from "@/lib/account/copy";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => {
    throw new Error("service-role client must not be used for seller listings");
  },
}));

import { getSellerListingsPage, getSellerPublicListings } from "@/lib/discovery/queries";

function item(id: string) {
  return { id, seller_id: "s1", slug: `slug-${id}`, title: id };
}

beforeEach(() => rpc.mockReset());

describe("parseSellerListingsParams", () => {
  it("defaults to the listings tab, newest sort and page 1", () => {
    const { params, invalid } = parseSellerListingsParams({});
    expect(invalid).toBe(false);
    expect(params).toMatchObject({ tab: "listings", sort: "newest", page: 1, q: "", category: "" });
  });

  it("treats empty form fields as absent (blank price_max must not become 0)", () => {
    const { params, invalid } = parseSellerListingsParams({ q: "", price_min: "", price_max: "", condition: "", category: "" });
    expect(invalid).toBe(false);
    expect(params.price_max).toBeUndefined();
    expect(params.condition).toBeUndefined();
  });

  it("falls back for invalid tab, sort and page (these do not widen results)", () => {
    const { params, invalid } = parseSellerListingsParams({ tab: "admin", sort: "random", page: "-4" });
    expect(invalid).toBe(false);
    expect(params).toMatchObject({ tab: "listings", sort: "newest", page: 1 });
  });

  it.each([
    [{ condition: "broken" }],
    [{ price_min: "abc" }],
    [{ price_max: "-5" }],
    [{ category: "Bad Slug!" }],
    [{ q: "x".repeat(300) }],
    [{ price_min: "500", price_max: "100" }],
  ])("marks malformed filters invalid so they fail closed: %j", (raw) => {
    expect(parseSellerListingsParams(raw).invalid).toBe(true);
  });

  it("accepts valid filters", () => {
    const { params, invalid } = parseSellerListingsParams({
      tab: "ratings", sort: "price_asc", page: "3", condition: "good", price_min: "100", category: "mobile-phones",
    });
    expect(invalid).toBe(false);
    expect(params).toMatchObject({ tab: "ratings", sort: "price_asc", page: 3, condition: "good", price_min: 100 });
  });
});

describe("formatMemberSince", () => {
  it("derives month and year from the registration date", () => {
    expect(formatMemberSince("2026-09-15T10:00:00Z")).toBe("FairSwap member since September 2026");
  });

  it("falls back to a neutral label for an invalid date", () => {
    expect(formatMemberSince("not-a-date")).toBe("FairSwap member");
  });
});

describe("getSellerListingsPage", () => {
  it("calls the visibility-enforcing RPC as the caller and converts rupees to paise", async () => {
    rpc.mockResolvedValue({ data: { items: [], total_count: 0, page: 1, per_page: 12, total_pages: 0 }, error: null });
    const result = await getSellerListingsPage("s1", { q: " phone ", price_min: 10, price_max: 20, condition: "good", page: 2 });
    expect(rpc).toHaveBeenCalledWith("search_seller_public_listings", expect.objectContaining({
      seller_id: "s1", query: "phone", price_min: 1000, price_max: 2000, condition: "good", page: 2, per_page: 12, sort: "newest",
    }));
    expect(result?.categories).toEqual([]);
  });

  it("returns null on RPC error so the UI shows an error, not an empty profile", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getSellerListingsPage("s1")).toBeNull();
  });
});

describe("getSellerPublicListings (listing detail: other listings)", () => {
  it("returns up to 8 listings and excludes the current one", async () => {
    const items = Array.from({ length: 9 }, (_, i) => item(`l${i}`));
    rpc.mockResolvedValue({ data: { items, total_count: 12, page: 1, per_page: 9, total_pages: 2 }, error: null });

    const withCurrentInPage = await getSellerPublicListings("s1", "l3");
    expect(withCurrentInPage).toHaveLength(8);
    expect(withCurrentInPage.map((l) => l.id)).not.toContain("l3");

    const currentNotInPage = await getSellerPublicListings("s1", "other");
    expect(currentNotInPage).toHaveLength(8);
    expect(rpc).toHaveBeenCalledWith("search_seller_public_listings", expect.objectContaining({ per_page: 9 }));
  });

  it("returns an empty list on error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getSellerPublicListings("s1", "x")).toEqual([]);
  });
});
