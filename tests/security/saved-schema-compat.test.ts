import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPublicSavedListings, VISIBILITY_CONCURRENCY } from "@/lib/favourites/public-saved";
import { getUserFavourites } from "@/lib/discovery/queries";
import { listingRow, makeServiceMock, mediaRow, sellerRow, uuid, type MockDb, type SchemaVariant } from "../helpers/saved-db-mock";

const holder = vi.hoisted(() => ({ service: null as unknown, user: null as unknown }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => holder.service }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => holder.user }));

const VARIANTS: SchemaVariant[] = ["test", "prod"];
const baseDb = (): MockDb => ({
  listings: [listingRow(1), listingRow(2), listingRow(3), listingRow(4), listingRow(5), listingRow(6)],
  user_accounts: [sellerRow(1), sellerRow(2), sellerRow(3, "suspended"), sellerRow(4), sellerRow(5), /* seller-6 has no account row */],
  listing_media: [
    mediaRow(1), mediaRow(2, { thumbnail_storage_path: null }), mediaRow(3), mediaRow(4, { processing_status: "processing" }),
    mediaRow(5, { listing_id: uuid(99) }), // cover pointer to another listing's photo
    mediaRow(6),
  ],
});
const ids = [1, 2, 3, 4, 5, 6].map(uuid);

describe.each(VARIANTS)("saved listings against the %s schema", (variant) => {
  let mock: ReturnType<typeof makeServiceMock>;
  beforeEach(() => { mock = makeServiceMock(baseDb(), { variant }); holder.service = mock.client; });

  it("never names a foreign-key embed, so it works whichever FK names the database has", async () => {
    const result = await getPublicSavedListings(ids);
    expect(result.ok).toBe(true);
    for (const select of mock.selects) expect(select).not.toMatch(/!|_fkey|fk_listings/);
  });

  it("returns cards for active sellers and suppresses the suspended seller and the seller with no account row", async () => {
    const result = await getPublicSavedListings(ids);
    if (!result.ok) throw new Error("expected ok");
    expect(result.listings.map((l) => l.id)).toEqual([uuid(1), uuid(2), uuid(4), uuid(5)]);
    expect(result.unavailableIds).toEqual([uuid(3), uuid(6)]);
  });

  it("only exposes a cover id for a ready thumbnail that belongs to that listing", async () => {
    const result = await getPublicSavedListings(ids);
    if (!result.ok) throw new Error("expected ok");
    const cover = (n: number) => result.listings.find((l) => l.id === uuid(n))!.cover_photo;
    expect(cover(1)).toEqual({ id: "media-1" });
    expect(cover(2)).toBeNull(); // no thumbnail yet
    expect(cover(4)).toBeNull(); // still processing
    expect(cover(5)).toBeNull(); // pointer to another listing's photo
  });

  it("excludes every private field from both the request and the response", async () => {
    const result = await getPublicSavedListings(ids);
    const json = JSON.stringify(result);
    for (const secret of ["PRIVATE-DESCRIPTION", "PRIVATE-LANDMARK", "560001", "seller-1", "private@example.com", "private/", "ORIGINAL", "account_status", "storage_path"]) expect(json).not.toContain(secret);
    for (const select of mock.selects) expect(select).not.toMatch(/pin_code|landmark|description|original_storage_path|large_storage_path|email/);
  });

  it("treats listings the visibility check rejects as unavailable and never looks up their media", async () => {
    mock = makeServiceMock(baseDb(), { variant, visible: (id) => id !== uuid(1) });
    holder.service = mock.client;
    const result = await getPublicSavedListings(ids);
    if (!result.ok) throw new Error("expected ok");
    expect(result.unavailableIds).toContain(uuid(1));
    expect(result.listings.map((l) => l.id)).not.toContain(uuid(1));
  });

  it("skips paused and expired listings without any visibility call for them", async () => {
    const db = baseDb();
    db.listings[0] = listingRow(1, { status: "paused" });
    db.listings[1] = listingRow(2, { expires_at: new Date(Date.now() - 1000).toISOString() });
    mock = makeServiceMock(db, { variant }); holder.service = mock.client;
    await getPublicSavedListings(ids);
    expect(mock.state.rpcCalls).not.toContain(uuid(1));
    expect(mock.state.rpcCalls).not.toContain(uuid(2));
  });

  it("bounds visibility-check concurrency", async () => {
    const db: MockDb = { listings: [], user_accounts: [], listing_media: [] };
    for (let n = 1; n <= 50; n++) { db.listings.push(listingRow(n)); db.user_accounts.push(sellerRow(n)); db.listing_media.push(mediaRow(n)); }
    mock = makeServiceMock(db, { variant, rpcDelayMs: 3 }); holder.service = mock.client;
    const result = await getPublicSavedListings(Array.from({ length: 50 }, (_, i) => uuid(i + 1)));
    expect(result.ok && result.listings.length).toBe(50);
    expect(mock.state.maxInFlight).toBeLessThanOrEqual(VISIBILITY_CONCURRENCY);
    expect(mock.state.rpcCalls).toHaveLength(50);
  });

  it("fails closed with a generic error when a database read fails", async () => {
    holder.service = { from: () => ({ select: () => ({ in: async () => ({ data: null, error: { message: "boom" } }) }) }), rpc: vi.fn() };
    expect(await getPublicSavedListings(ids)).toEqual({ ok: false, error: "Saved ads could not be loaded right now." });
  });

  it("still returns cards (without photos) if only the media lookup fails", async () => {
    const real = mock.client;
    holder.service = { ...real, from: (t: keyof MockDb) => (t === "listing_media" ? { select: () => ({ in: async () => ({ data: null, error: { message: "boom" } }) }) } : real.from(t)) };
    const result = await getPublicSavedListings([uuid(1)]);
    expect(result.ok && result.listings[0].cover_photo).toBeNull();
  });
});

describe.each(VARIANTS)("authenticated getUserFavourites against the %s schema", (variant) => {
  const favourites = (listingIds: string[]) => ({
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: listingIds.map((listing_id) => ({ listing_id, created_at: "2026-01-01" })), error: null }) }) }) }),
  });

  it("keeps its contract: active public listings with a cover, everything else unavailable, no FK-named embeds", async () => {
    const mock = makeServiceMock(baseDb(), { variant });
    holder.service = mock.client;
    holder.user = favourites(ids);
    const { activeListings, unavailableIds } = await getUserFavourites("user-1");
    expect(activeListings.map((l) => l.id)).toEqual([uuid(1), uuid(2), uuid(4), uuid(5)]);
    expect(unavailableIds).toEqual([uuid(3), uuid(6)]);
    expect(activeListings[0].cover_photo).toMatchObject({ id: "media-1" });
    expect(activeListings[3].cover_photo).toBeNull(); // pointer to another listing's photo is dropped
    for (const select of mock.selects) expect(select).not.toMatch(/!|_fkey|fk_listings/);
  });

  it("treats a deleted or paused favourite as unavailable", async () => {
    const db = baseDb();
    db.listings[0] = listingRow(1, { status: "removed" });
    holder.service = makeServiceMock(db, { variant }).client;
    holder.user = favourites([uuid(1), uuid(777)]);
    const { activeListings, unavailableIds } = await getUserFavourites("user-1");
    expect(activeListings).toEqual([]);
    expect(unavailableIds).toEqual([uuid(1), uuid(777)]);
  });
});
