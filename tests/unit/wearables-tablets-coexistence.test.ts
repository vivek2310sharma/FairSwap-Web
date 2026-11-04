import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { POST_AD_CATALOGUE, resolveSub, type PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
import { selectionSchema, wearableSchema, DEVICE_TYPES } from "@/lib/listings/wearables/contract";

// Cross-category regression: Wearables V1 must not alter Mobile Phones, Accessories or Tablets behaviour, and must never
// call another category's session/submit RPCs. Written to stay valid when the Tablets Web flow lands (it asserts
// invariance, not the current `route: none` state of Tablets).
const caps = (over: Partial<PostAdCapabilities> = {}): PostAdCapabilities => ({ twoWheelers: "off", cars: "off", property: "off", goodsCategories: [], propertyPaths: [], ...over });
const root = resolve(__dirname, "../..");
const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const wearableSources = [
  ...walk(join(root, "src/app/api/post-ad/wearables")),
  join(root, "src/lib/listings/wearables/server.ts"),
  join(root, "src/lib/listings/wearables/public.ts"),
  join(root, "src/components/listings/WearableForm.tsx"),
  join(root, "src/components/listings/posting/wearable-wizard.ts"),
];

describe("wearables vs phones / accessories / tablets: category readiness", () => {
  it("turning the wearables capability on or off never changes any other sub-category's readiness", () => {
    const all = POST_AD_CATALOGUE.flatMap(c => c.subs).filter(s => s.id !== "wearables");
    expect(all.some(s => s.id === "tablets")).toBe(true);
    for (const s of all) for (const base of [caps(), caps({ mobilePhones: true }), caps({ accessories: true, mobilePhones: true })]) {
      expect(resolveSub(s, { ...base, wearables: true }), s.id).toEqual(resolveSub(s, { ...base, wearables: false }));
    }
  });
  it("the wearables capability is the only thing that opens wearables", () => {
    const w = POST_AD_CATALOGUE.flatMap(c => c.subs).find(s => s.id === "wearables")!;
    expect(resolveSub(w, caps({ mobilePhones: true, accessories: true })).readiness).toBe("coming-soon");
    expect(resolveSub(w, caps({ wearables: true })).readiness).toBe("available");
  });
});

describe("wearables vs tablets: contract isolation", () => {
  const tabletPayload = { selection: { category: "mobiles", subcategory: "tablets", version: 1 }, session_id: "33333333-3333-4333-8333-333333333333", storage: "64 GB", connectivity: "wifi", transfer_lock_status: "clear", title: "iPad 9th generation", description: "Carefully used tablet with no repairs." };
  it("accepts only the wearables selection", () => {
    expect(selectionSchema.safeParse({ category: "mobiles", subcategory: "wearables", version: 1 }).success).toBe(true);
    for (const subcategory of ["tablets", "mobile-phones", "mobile-accessories"]) for (const version of [1, 2]) expect(selectionSchema.safeParse({ category: "mobiles", subcategory, version }).success, `${subcategory} v${version}`).toBe(false);
  });
  it("rejects a tablet-shaped payload and any tablet device type", () => {
    expect(wearableSchema.safeParse(tabletPayload).success).toBe(false);
    expect(wearableSchema.safeParse({ ...tabletPayload, device_type: "tablet" }).success).toBe(false);
    expect(DEVICE_TYPES as readonly string[]).not.toContain("tablet");
  });
});

describe("wearables vs tablets/phones: RPC boundary (source-level)", () => {
  it("wearable code never calls tablet or phone session/submit RPCs", () => {
    for (const f of wearableSources) {
      const src = readFileSync(f, "utf8");
      for (const forbidden of ["tablet_v1_session", "submit_tablet_v1", "tablets_v1_catalogue", "submit_mobile_v2", "posting_v2_session", "search_accessories_v1"]) expect(src.includes(forbidden), `${f.replace(root, "")} must not reference ${forbidden}`).toBe(false);
    }
  });
  it("wearable sessions and submission go only through the wearable wrappers", () => {
    const server = readFileSync(join(root, "src/lib/listings/wearables/server.ts"), "utf8");
    expect(server).toContain('"wearable_v1_session"');
    expect(readFileSync(join(root, "src/app/api/post-ad/wearables/submit/route.ts"), "utf8")).toContain('"submit_wearable_v1"');
  });
  it("only the shared service-role media completion RPC is reused, never a phone/tablet entry point", () => {
    const rpcs = new Set<string>();
    for (const f of wearableSources) for (const m of readFileSync(f, "utf8").matchAll(/\.rpc\(\s*"([a-z0-9_]+)"/g)) rpcs.add(m[1]);
    expect([...rpcs].sort()).toEqual(["posting_v2_media_ready", "submit_wearable_v1", "wearable_v1_session", "wearables_v1_catalogue"]);
  });
});
