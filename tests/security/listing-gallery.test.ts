import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ db: null as unknown, visible: new Set<string>(), queries: [] as string[], rpc: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => {
    const db = state.db as Record<string, Row[]>;
    return {
      from(table: string) {
        state.queries.push(table);
        let rows = db[table] ?? [];
        let max = Infinity;
        const builder = {
          select: () => builder,
          in: (col: string, values: string[]) => { rows = rows.filter((r) => values.includes(r[col] as string)); return builder; },
          eq: (col: string, value: unknown) => { rows = rows.filter((r) => r[col] === value); return builder; },
          not: (col: string, _op: string, value: unknown) => { rows = rows.filter((r) => r[col] !== value); return builder; },
          order: (col: string) => { rows = [...rows].sort((a, b) => (a[col] as number) - (b[col] as number)); return builder; },
          limit: (n: number) => { max = n; return builder; },
          then: (resolve: (v: unknown) => void) => resolve({ data: rows.slice(0, max), error: null }),
        };
        return builder;
      },
      async rpc(name: string, args: { listing_id: string }) {
        if (name !== "is_listing_publicly_visible") throw new Error(`unexpected rpc ${name}`);
        state.rpc.push(args.listing_id);
        return { data: state.visible.has(args.listing_id), error: null };
      },
    };
  },
}));

import { GET } from "@/app/api/listings/gallery/route";
import { galleryBudget, GALLERY_IDS_LIMIT, parseGalleryIds } from "@/lib/listings/public-gallery";

const uuid = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const future = () => new Date(Date.now() + 86_400_000).toISOString();
const listing = (n: number, over: Row = {}): Row => ({ id: uuid(n), status: "active", expires_at: future(), seller_id: `s${n}`, ...over });
const media = (listingN: number, mediaN: number, over: Row = {}): Row => {
  const l = uuid(listingN); const m = uuid(mediaN);
  return {
    id: m, listing_id: l, display_order: mediaN, processing_status: "ready",
    original_storage_path: `${l}/${m}/original.jpg`, thumbnail_storage_path: `${l}/${m}/thumb.webp`,
    medium_storage_path: `${l}/${m}/medium.webp`, large_storage_path: `${l}/${m}/large.webp`, ...over,
  };
};

function call(ids: string, ip = "198.51.100.1") {
  return GET(new NextRequest(`http://localhost/api/listings/gallery?ids=${ids}`, { headers: { "x-forwarded-for": ip } }));
}
let ipCounter = 0;
const freshIp = () => `198.51.100.${++ipCounter % 250}`;

beforeEach(() => {
  galleryBudget.reset();
  state.queries = []; state.rpc = []; state.visible = new Set();
  state.db = {
    listings: [listing(1), listing(2), listing(3, { status: "draft" }), listing(4, { expires_at: new Date(Date.now() - 1000).toISOString() }), listing(5), listing(6)],
    user_accounts: [1, 2, 3, 4, 5].map((n) => ({ user_id: `s${n}`, account_status: "active" })).concat([{ user_id: "s6", account_status: "suspended" }]),
    listing_media: [
      media(1, 11), media(1, 12), media(1, 13, { processing_status: "processing" }), media(1, 14, { thumbnail_storage_path: null }),
      media(2, 21), media(2, 22, { listing_id: uuid(1) }), // 22 is stored under listing 1's id: cross-listing/mismatch
      media(5, 51), media(5, 52, { thumbnail_storage_path: "sealed/v2/bundle/thumb.webp" }),
      media(6, 61), media(6, 62),
    ],
  };
});

describe("GET /api/listings/gallery", () => {
  it("returns only ready, associated media ids for publicly visible listings with 2+ photos", async () => {
    state.visible = new Set([uuid(1), uuid(2), uuid(3), uuid(4), uuid(5), uuid(6)]);
    const res = await call([1, 2, 3, 4, 5, 6].map(uuid).join(","));
    expect(res.status).toBe(200);
    const body = await res.json();
    // listing 1: 11, 12 ready+thumbnailed (13 processing, 14 no thumbnail, 22 belongs to a mismatched path set so is rejected by the path fence)
    expect(body.galleries[uuid(1)]).toEqual([uuid(11), uuid(12)]);
    expect(body.galleries[uuid(2)]).toBeUndefined(); // only one valid photo: 22's paths point at listing 2's prefix but row says listing 1
    expect(body.galleries[uuid(3)]).toBeUndefined(); // not active
    expect(body.galleries[uuid(4)]).toBeUndefined(); // expired
    expect(body.galleries[uuid(5)]).toBeUndefined(); // sealed/unexpected path fails the legacy fence, leaving one photo
    expect(body.galleries[uuid(6)]).toBeUndefined(); // suspended seller
  });

  it("omits listings the visibility RPC rejects", async () => {
    state.visible = new Set([uuid(2)]);
    const body = await (await call(`${uuid(1)},${uuid(2)}`)).json();
    expect(body.galleries).toEqual({});
  });

  it("never leaks storage paths, listing data or private fields", async () => {
    state.visible = new Set([uuid(1)]);
    const text = await (await call(uuid(1))).text();
    expect(text).not.toMatch(/storage|original|thumb\.webp|medium|large|seller|status|expires/i);
    expect(JSON.parse(text)).toEqual({ galleries: { [uuid(1)]: [uuid(11), uuid(12)] } });
  });

  it("uses a bounded number of queries independent of the photo count", async () => {
    state.visible = new Set([uuid(1), uuid(2)]);
    await call(`${uuid(1)},${uuid(2)}`);
    expect(state.queries.filter((t) => t === "listing_media")).toHaveLength(1);
    expect(state.queries.filter((t) => t === "listings")).toHaveLength(1);
    expect(state.rpc).toHaveLength(2); // one visibility check per candidate listing, not per photo
  });

  it("is never cached by shared caches or the browser (no-store), on success and on errors", async () => {
    state.visible = new Set([uuid(1)]);
    expect((await call(uuid(1), freshIp())).headers.get("Cache-Control")).toBe("no-store");
    expect((await call("nope", freshIp())).headers.get("Cache-Control")).toBe("no-store");
  });

  it("moderation: a takedown is reflected on the very next call (no server-side memo)", async () => {
    state.visible = new Set([uuid(1)]);
    const before = await (await call(uuid(1), freshIp())).json();
    expect(before.galleries[uuid(1)]).toEqual([uuid(11), uuid(12)]);
    // Visibility RPC now rejects the listing (moderated / hidden).
    state.visible = new Set();
    expect((await (await call(uuid(1), freshIp())).json()).galleries).toEqual({});
    // Back to visible, but the listing is suspended via its seller.
    state.visible = new Set([uuid(1)]);
    (state.db as Record<string, Row[]>).user_accounts.find((r) => r.user_id === "s1")!.account_status = "suspended";
    expect((await (await call(uuid(1), freshIp())).json()).galleries).toEqual({});
    // An individual photo pulled from `ready` disappears too, leaving a single photo => omitted.
    (state.db as Record<string, Row[]>).user_accounts.find((r) => r.user_id === "s1")!.account_status = "active";
    (state.db as Record<string, Row[]>).listing_media.find((r) => r.id === uuid(12))!.processing_status = "failed";
    expect((await (await call(uuid(1), freshIp())).json()).galleries).toEqual({});
  });

  it("rejects malformed, empty and oversized id lists without touching the database", async () => {
    for (const bad of ["", "not-a-uuid", `${uuid(1)},oops`, Array.from({ length: GALLERY_IDS_LIMIT + 1 }, (_, i) => uuid(i + 1)).join(",")]) {
      state.queries = [];
      const res = await call(bad, freshIp());
      expect(res.status).toBe(400);
      expect(state.queries).toHaveLength(0);
    }
  });

  it("parses ids case-insensitively and de-duplicates", () => {
    const upper = uuid(1).toUpperCase();
    expect(parseGalleryIds(`${upper},${uuid(1)}`)).toEqual({ ok: true, ids: [uuid(1)] });
    expect(parseGalleryIds(null)).toEqual({ ok: false });
  });

  it("rate limits per client with a Retry-After hint and no database work once blocked", async () => {
    const ip = "203.0.113.50";
    let last: Response = await call(uuid(1), ip);
    for (let i = 0; i < 40 && last.status !== 429; i++) last = await call(uuid(1), ip);
    expect(last.status).toBe(429);
    expect(Number(last.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    state.queries = [];
    expect((await call(uuid(1), ip)).status).toBe(429);
    expect(state.queries).toHaveLength(0);
  });
});