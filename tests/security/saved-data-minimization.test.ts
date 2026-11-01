import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSavedListingsAction } from "@/app/saved/actions";
import { savedLookupBudget } from "@/lib/favourites/saved-budget";
import { listingRow, makeServiceMock, mediaRow, sellerRow, uuid } from "../helpers/saved-db-mock";

const [A, B, C, D, E, F, G] = [1, 2, 3, 4, 5, 6, 7].map(uuid);
const past = () => new Date(Date.now() - 86_400_000).toISOString();
const holder = vi.hoisted(() => ({ service: null as unknown }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => holder.service }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => "203.0.113.1" }) }));

let mock: ReturnType<typeof makeServiceMock>;
beforeEach(() => {
  savedLookupBudget.reset();
  mock = makeServiceMock({
    listings: [
      listingRow(1), // A: public, has thumbnail
      listingRow(2), // B: public, no derivative yet
      listingRow(3, { status: "paused" }), // C
      listingRow(4), // D: seller suspended
      listingRow(5, { expires_at: past() }), // E
      listingRow(6), // F: active but the visibility RPC says no
    ],
    user_accounts: [sellerRow(1), sellerRow(2), sellerRow(3), sellerRow(4, "suspended"), sellerRow(5), sellerRow(6)],
    listing_media: [mediaRow(1), mediaRow(2, { thumbnail_storage_path: null }), mediaRow(3), mediaRow(4), mediaRow(5), mediaRow(6)],
  }, { variant: "prod", visible: (id) => id !== F });
  holder.service = mock.client;
});

describe("public /saved lookup: data minimisation", () => {
  it("returns only allowlisted public card fields", async () => {
    const result = await getSavedListingsAction([A]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.listings[0]).sort()).toEqual(["category", "city", "cover_photo", "condition", "id", "locality", "price_paise", "price_type", "slug", "title"].sort());
    expect(result.listings[0].category).toEqual({ name: "Furniture", slug: "furniture" });
    expect(result.listings[0].city).toEqual({ name: "Pune" });
    const json = JSON.stringify(result);
    for (const secret of ["seller-1", "PRIVATE-DESCRIPTION", "560001", "PRIVATE-LANDMARK", "storage_path", "private/", "ORIGINAL", "account_status", "private@example.com"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("exposes a cover photo id only when a public thumbnail derivative exists, never a storage path", async () => {
    const result = await getSavedListingsAction([A, B]);
    if (!result.ok) throw new Error("expected ok");
    expect(result.listings.find((l) => l.id === A)!.cover_photo).toEqual({ id: "media-1" });
    expect(result.listings.find((l) => l.id === B)!.cover_photo).toBeNull();
  });

  it("treats paused, suspended-seller, expired, not-visible and unknown ads identically as unavailable", async () => {
    const result = await getSavedListingsAction([A, C, D, E, F, G]);
    if (!result.ok) throw new Error("expected ok");
    expect(result.listings.map((l) => l.id)).toEqual([A]);
    expect(result.unavailableIds).toEqual([C, D, E, F, G]);
  });

  it("asks the public-visibility RPC only about ads that already passed the basic checks", async () => {
    await getSavedListingsAction([A, C, D, E, F, G]);
    expect([...mock.state.rpcCalls].sort()).toEqual([A, F].sort());
  });

  it("rejects non-arrays, invalid uuids and more than 50 ids without querying", async () => {
    for (const bad of [undefined, "x", [A, "nope"], Array.from({ length: 51 }, () => A)]) {
      const result = await getSavedListingsAction(bad);
      expect(result.ok).toBe(false);
    }
    expect(mock.selects).toHaveLength(0);
  });

  it("does not query at all for an empty list, and de-duplicates before querying", async () => {
    expect(await getSavedListingsAction([])).toEqual({ ok: true, listings: [], unavailableIds: [] });
    expect(mock.selects).toHaveLength(0);
    await getSavedListingsAction([A, A.toUpperCase(), A]);
    expect(mock.state.rpcCalls).toEqual([A]);
  });
});

describe("FSW-SEC-001 media privacy regression (original photos stay private)", () => {
  const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");

  it("listing cards only ever reference the derivative thumb route", () => {
    const card = read("src/components/listings/ListingCard.tsx");
    const urls = card.match(/\/api\/listings\/\$\{[^}]+\}\/media\/\$\{[^}]+\}\/[a-z]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/\/thumb$/);
    expect(card).not.toMatch(/original|storage_path/);
  });

  it("the saved lookup, view and server action never touch original or storage paths", () => {
    for (const file of ["src/lib/favourites/public-saved.ts", "src/lib/favourites/types.ts", "src/app/saved/actions.ts", "src/components/favourites/GuestFavouritesView.tsx"]) {
      const text = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(text, file).not.toMatch(/original_storage_path|large_storage_path|medium_storage_path|createSignedUrl|\.storage\b/);
    }
  });

  it("the shared schema-compat helper never selects original or large storage paths or signs URLs", () => {
    const text = read("src/lib/favourites/schema-compat.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(text).not.toMatch(/original_storage_path|large_storage_path|createSignedUrl|\.storage/);
  });

  it("the device store holds no listing metadata and no credentials", () => {
    const text = read("src/lib/favourites/guest.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(text).not.toMatch(/token|session|jwt|password|email|phone/i);
  });
});
