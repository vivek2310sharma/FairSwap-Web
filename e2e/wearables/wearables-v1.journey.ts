import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { CleanupError, REMOVAL_REASON, retireListings, scanSearchPages } from "./cleanup.mjs";
import {
  anonApi, anonClient, loadEnv, recordCleanup, recordStep, recordTestFlag, signIn, upgradeToAal2,
  type Actor, type E2eEnv,
} from "./helpers";

/**
 * Wearables V1 authenticated journey against the deployed runner-commit Preview deployment on FairSwapTest.
 * Real Supabase Auth sessions (password + genuine TOTP for the moderator), real uploads, real RLS/RPC calls.
 * No mocks, no service-role key. A step is recorded only after all of its assertions passed.
 */
type Json = Record<string, unknown>;
type Api = ReturnType<Actor["api"]>;
type Listing = { sessionId: string; mediaId: string; listingId: string; title: string };
const PIN = "560034";
const suffix = () => randomBytes(4).toString("hex").replace(/[0-9]/g, c => "qrstuvwxyz"[Number(c)]); // letters only: avoids phone-number heuristics
const catalogue = JSON.parse(readFileSync(join(process.cwd(), "src/lib/listings/wearables/catalogue.generated.json"), "utf8")) as { revision: string; brands: { id: string }[]; models: { id: string; brand_id: string; type: string }[] };
const model = catalogue.models.find(m => m.type === "smartwatch")!;

let env: E2eEnv, seller: Actor, buyer: Actor, moderator: Actor;
let anon: Api;
let anonSb: ReturnType<typeof anonClient>;
let place: { city_id: string; locality_id: string };
const A = {} as Listing; // still_paired -> flagged, held for moderator review, later published
const B = {} as Listing; // unknown pairing -> flagged, never published
let hiddenBeforePublication = false;
/** Everything this run creates is registered here the moment it exists, so teardown can retire it even after a failure. */
const created = { ids: new Set<string>(), titles: new Set<string>() };

test.describe.configure({ mode: "serial" });

const json = async (res: Awaited<ReturnType<Api["get"]>>) => (await res.json()) as Json;
const rows = (r: { data: unknown; error: unknown }) => { expect(r.error, "query must not error").toBeNull(); return (r.data ?? []) as Json[]; };
/** Access is "denied" if the query errors or returns nothing; positive controls elsewhere prove the data exists. */
const deniedOrEmpty = (r: { data: unknown; error: unknown }) => { if (!r.error) expect(r.data).toEqual(Array.isArray(r.data) ? [] : null); };

function payload(l: Pick<Listing, "sessionId" | "mediaId" | "title">, pairing: "still_paired" | "unknown" | "locked" | "reset_ready", extra: Json = {}): Json {
  return {
    selection: { category: "mobiles", subcategory: "wearables", version: 1 }, session_id: l.sessionId, catalogue_revision: catalogue.revision,
    device_type: "smartwatch", brand_id: model.brand_id, other_brand: "", model_id: model.id, other_model: "", generation: "", phone_os: ["android"], finish: "",
    condition: "good", sensors: "working", charging: "working", battery_mode: "not_tested", included: ["charger"], purchase_month: "", warranty_until: "",
    pairing_status: pairing, transfer_ack: pairing === "still_paired", ownership_confirmed: true,
    title: l.title, description: "Used carefully with a screen guard. Charger included. Inspection and handover in person only.",
    trade: "sell", price_paise: 1200000, negotiable: false, pin_code: PIN, ...place, media_ids: [l.mediaId], plan_id: "free-v1",
    screen: "perfect", controls: "working", strap: "good", case_size_mm: null, connectivity: "bluetooth", ...extra,
  };
}

async function createSession(a: Actor): Promise<string> {
  const sessionId = randomUUID();
  const res = await a.api().post("/api/post-ad/wearables/sessions", { data: { session_id: sessionId, operation: "create" } });
  expect(res.status(), "wearable session creation (flag + DB release + policy prerequisites)").toBe(200);
  const body = await json(res); const session = body.session as Json;
  expect(session.owner_id).toBe(a.userId);
  return String(session.id);
}
async function upload(a: Actor, sessionId: string) {
  const mediaId = randomUUID();
  const file = await sharp({ create: { width: 96, height: 96, channels: 3, background: { r: randomBytes(1)[0], g: randomBytes(1)[0], b: randomBytes(1)[0] } } }).png().toBuffer();
  const res = await a.api().post(`/api/post-ad/wearables/sessions/${sessionId}/media`, { multipart: { media_id: mediaId, file: { name: "watch.png", mimeType: "image/png", buffer: file } } });
  expect(res.status(), "photo upload").toBe(200);
  return mediaId;
}
const ownListing = async (a: Actor, id: string) => rows(await a.client.from("listings").select("id,seller_id,status,title,revision,slug").eq("id", id))[0];
async function search(c: { rpc: Actor["client"]["rpc"] }, filters: Json) {
  const r = await c.rpc("search_wearables_v1", { filters });
  expect(r.error).toBeNull();
  return r.data as { items: { id: string; slug: string; wearable: { transfer_ready: boolean; pairing_status: string } }[]; total_count: number; total_pages?: number };
}
const listingFilters = { type: "smartwatch", brand_id: model.brand_id, model_id: model.id };

test.beforeAll(async () => {
  env = loadEnv();
  [seller, buyer, moderator] = await Promise.all([signIn(env, "seller", env.seller), signIn(env, "buyer", env.buyer), signIn(env, "moderator", env.moderator)]);
  expect(new Set([seller.userId, buyer.userId, moderator.userId]).size, "three distinct accounts").toBe(3);
  anon = await anonApi(env); anonSb = anonClient(env);
  const loc = await json(await seller.api().get(`/api/location/pincode/${PIN}`));
  const locality = (loc.localities as { id: string }[] | undefined)?.[0];
  expect(loc.city_id && locality, `Test location data for PIN ${PIN}`).toBeTruthy();
  place = { city_id: String(loc.city_id), locality_id: locality!.id };
});

type OwnRow = { id: string; seller_id: string; status: string; title: string; revision: number; slug: string | null };
const OWN_COLUMNS = "id,seller_id,status,title,revision,slug";

/** Retires every listing this run created (authorised seller/moderator operations under real RLS) and proves none is discoverable. */
async function retireCreated() {
  const ids = [...created.ids], titles = [...created.titles];
  try {
    const result = await retireListings({ sellerId: seller?.userId, ids, titles }, {
      readOwn: async q => {
        const out = new Map<string, OwnRow>();
        const add = (list: Json[]) => list.forEach(r => out.set(String(r.id), r as unknown as OwnRow));
        if (q.ids.length) add(rows(await seller.client.from("listings").select(OWN_COLUMNS).in("id", q.ids)));
        if (q.titles.length) add(rows(await seller.client.from("listings").select(OWN_COLUMNS).eq("seller_id", seller.userId).in("title", q.titles)));
        return [...out.values()];
      },
      ensureModeratorAal2: async () => { if ((await moderator.aal()) !== "aal2") await upgradeToAal2(moderator, env.moderator.totpSecret); },
      remove: async row => ({ error: (await moderator.client.rpc("moderate_listing_reviewed", { listing_id: row.id, action: "remove", reason: REMOVAL_REASON, expected_revision: Number(row.revision), expected_status: row.status })).error }),
      discoverable: async list => {
        const wanted = new Set(list.map(r => r.id)), leaked = new Set<string>();
        for (const r of rows(await anonSb.from("listings").select("id").in("id", [...wanted]))) leaked.add(String(r.id));
        for (const c of [anonSb, buyer.client]) {
          (await scanSearchPages(page => search(c, { ...listingFilters, sort: "newest", page }), wanted)).forEach(id => leaked.add(id));
        }
        for (const r of list) {
          if (!r.slug) continue;
          const res = await anon.get(`/listings/${r.slug}`);
          if (res.status() === 200 && (await res.text()).includes(r.title)) leaked.add(r.id);
        }
        return [...leaked];
      },
      sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    });
    recordCleanup({ verified: true, retired: result.retired.length, alreadyInactive: result.alreadyInactive.length });
  } catch (error) {
    recordCleanup({ verified: false, retired: 0, alreadyInactive: 0, error: error instanceof CleanupError ? error.code : "UNEXPECTED" });
    throw error; // an unsuccessful cleanup fails the run, so no PASS evidence can be produced
  }
}

// Runs after the last test AND after a failed test (serial mode skips later tests, never the hook).
test.afterAll(async () => {
  test.setTimeout(300_000);
  try { await retireCreated(); }
  finally { await Promise.all([seller?.api().dispose(), buyer?.api().dispose(), moderator?.api().dispose(), anon?.dispose()]); }
});

test("Test deployment has Wearables enabled and is bound to FairSwapTest", async () => {
  // Flag order in the route: feature flag -> auth. Unauthenticated + flag ON => "Sign in", never "coming soon".
  const unauth = await anon.get("/api/post-ad/wearables/sessions");
  expect(unauth.status()).toBe(400);
  expect((await json(unauth)).error).toBe("Sign in to continue.");
  // An authenticated FairSwapTest JWT is accepted by the deployed app (proves its Supabase project) and the catalogue loads (flag + DB release row).
  const models = await seller.api().get(`/api/post-ad/wearables/models?brand_id=${model.brand_id}&type=smartwatch`);
  expect(models.status()).toBe(200);
  expect(((await json(models)).models as { id: string }[]).some(m => m.id === model.id)).toBe(true);
  recordTestFlag();
});

test("media_upload: real photo upload into a seller-owned session", async () => {
  expect((await anon.post("/api/post-ad/wearables/sessions", { data: { session_id: randomUUID(), operation: "create" } })).status()).toBe(400);
  for (const l of [A, B]) {
    l.sessionId = await createSession(seller); l.mediaId = await upload(seller, l.sessionId);
    const media = await json(await seller.api().get(`/api/post-ad/wearables/sessions/${l.sessionId}/media`));
    const item = (media.media as { id: string; state: string; url: string | null }[]).find(m => m.id === l.mediaId);
    expect(item?.state).toBe("ready");
    const signed = await fetch(item!.url!); // signed Storage URL of the processed derivative; plain fetch so no app headers reach Supabase
    expect(signed.status).toBe(200);
    const bytes = Buffer.from(await signed.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(100);
    expect((await sharp(bytes).metadata()).format).toBe("webp");
  }
  recordStep("media_upload", { sessions: 2 });
});

test("authenticated_listing_creation: seller submits wearable listings", async () => {
  A.title = `Wearable check ${suffix()}`; B.title = `Wearable check ${suffix()}`;
  expect((await anon.post("/api/post-ad/wearables/submit", { data: payload(A, "still_paired") })).status(), "unauthenticated submit").toBe(400);
  for (const [l, pairing] of [[A, "still_paired"], [B, "unknown"]] as const) {
    created.titles.add(l.title); // registered immediately before its own submit: an unresolved title fails cleanup closed
    const res = await seller.api().post("/api/post-ad/wearables/submit", { data: payload(l, pairing) });
    expect(res.status(), "submit").toBe(200);
    l.listingId = String((await json(res)).listing_id);
    created.ids.add(l.listingId);
    const row = await ownListing(seller, l.listingId);
    expect(row.seller_id).toBe(seller.userId);
    expect(row.status).toBe("pending_review");
    expect(row.title).toBe(l.title);
  }
  recordStep("authenticated_listing_creation", { listings: 2 });
});

test("ownership_rls: a second authenticated user and anonymous users are isolated", async () => {
  // Positive control: the owner sees everything the others must not.
  expect(await ownListing(seller, A.listingId)).toBeTruthy();
  expect(rows(await seller.client.from("listing_wearable_contexts_v1").select("listing_id").eq("listing_id", A.listingId))).toHaveLength(1);
  // Web API surface.
  const mediaUrl = `/api/post-ad/wearables/sessions/${A.sessionId}/media`;
  expect((await buyer.api().get(mediaUrl)).status()).toBe(400);
  expect((await buyer.api().post(mediaUrl, { multipart: { media_id: randomUUID(), file: { name: "x.png", mimeType: "image/png", buffer: await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } }).png().toBuffer() } } })).status()).toBe(400);
  expect((await buyer.api().delete(mediaUrl, { data: { media_id: A.mediaId } })).status()).toBe(400);
  expect((await buyer.api().post("/api/post-ad/wearables/submit", { data: payload({ ...A, title: `Wearable hijack ${suffix()}` }, "reset_ready") })).status(), "submit with another user's session").not.toBe(200);
  const stillReady = await json(await seller.api().get(mediaUrl));
  expect((stillReady.media as { id: string; state: string }[]).find(m => m.id === A.mediaId)?.state).toBe("ready");
  // Direct Supabase RPC / PostgREST under the second user's own JWT.
  expect((await buyer.client.rpc("wearable_v1_session", { session_id: A.sessionId, operation: "read", media_id: null })).error).not.toBeNull();
  for (const c of [buyer.client, anonSb]) {
    expect(rows(await c.from("listings").select("id").eq("id", A.listingId))).toHaveLength(0);
    expect(rows(await c.from("listing_wearable_contexts_v1").select("listing_id").eq("listing_id", A.listingId))).toHaveLength(0);
    deniedOrEmpty(await c.from("listing_wearable_risk_flags_v1").select("listing_id").eq("listing_id", A.listingId));
    deniedOrEmpty(await c.from("posting_upload_sessions").select("id").eq("id", A.sessionId));
  }
  deniedOrEmpty(await buyer.client.from("listings").update({ title: "tampered" }).eq("id", A.listingId).select("id"));
  deniedOrEmpty(await buyer.client.from("listings").update({ status: "active" }).eq("id", A.listingId).select("id"));
  const after = await ownListing(seller, A.listingId);
  expect(after.title).toBe(A.title);
  expect(after.status).toBe("pending_review");
  recordStep("ownership_rls");
});

test("pairing_state_restrictions: locked/ack rules, flagged states and no self-activation", async () => {
  const draft = { sessionId: randomUUID(), mediaId: randomUUID(), title: `Wearable draft ${suffix()}` };
  const invalid = [
    payload(draft, "locked"), // activation-locked devices are not an accepted pairing state
    payload(draft, "still_paired", { transfer_ack: false }), // still paired requires the unpair acknowledgement
    payload(draft, "reset_ready", { transfer_ack: true }), // acknowledgement only valid for still_paired
    payload(draft, "unknown", { ownership_confirmed: false }),
  ];
  for (const body of invalid) expect((await seller.api().post("/api/post-ad/wearables/submit", { data: body })).status()).toBe(422);
  // Database-level state for the two stored declarations.
  const ctx = rows(await seller.client.from("listing_wearable_contexts_v1").select("listing_id,pairing_status,transfer_ready").in("listing_id", [A.listingId, B.listingId]));
  const by = (id: string) => ctx.find(c => c.listing_id === id)!;
  expect(by(A.listingId)).toMatchObject({ pairing_status: "still_paired", transfer_ready: false });
  expect(by(B.listingId)).toMatchObject({ pairing_status: "unknown", transfer_ready: false });
  // A seller can never self-activate or self-publish a flagged listing.
  for (const l of [A, B]) {
    deniedOrEmpty(await seller.client.from("listings").update({ status: "active" }).eq("id", l.listingId).select("id"));
    expect((await ownListing(seller, l.listingId)).status).toBe("pending_review");
  }
  recordStep("pairing_state_restrictions");
});

test("flagged listings are invisible to buyers before publication", async () => {
  for (const c of [buyer.client, anonSb]) {
    const result = await search(c, { ...listingFilters, sort: "newest" });
    const ids = result.items.map(i => i.id);
    expect(ids).not.toContain(A.listingId);
    expect(ids).not.toContain(B.listingId);
  }
  hiddenBeforePublication = true;
});

test("moderator_aal2_review: AAL1 and non-staff are refused; AAL2 moderator reviews flags and approves", async () => {
  const review = (a: Actor, revision: number) => a.client.rpc("moderate_listing_reviewed", { listing_id: A.listingId, action: "approve", reason: "Automated Wearables V1 Test E2E review", expected_revision: revision, expected_status: "pending_review" });
  const row = await ownListing(seller, A.listingId);
  const revision = Number(row.revision);
  // Not AAL2 yet: password-only moderator session.
  expect(await moderator.aal()).toBe("aal1");
  expect(rows(await moderator.client.from("listing_wearable_risk_flags_v1").select("listing_id").eq("listing_id", A.listingId))).toHaveLength(0);
  for (const actor of [moderator, seller, buyer]) expect((await review(actor, revision)).error, `${actor.label} must not approve`).not.toBeNull();
  expect((await ownListing(seller, A.listingId)).status).toBe("pending_review");
  // Genuine TOTP step-up.
  await upgradeToAal2(moderator, env.moderator.totpSecret);
  expect(await moderator.aal()).toBe("aal2");
  const flags = rows(await moderator.client.from("listing_wearable_risk_flags_v1").select("listing_id,signal").in("listing_id", [A.listingId, B.listingId]));
  expect(flags).toEqual(expect.arrayContaining([{ listing_id: A.listingId, signal: "still_paired" }, { listing_id: B.listingId, signal: "unknown_pairing" }]));
  const approved = await review(moderator, revision);
  expect(approved.error, "AAL2 moderator approval").toBeNull();
  expect((await ownListing(seller, A.listingId)).status).toBe("active");
  expect((await ownListing(seller, B.listingId)).status, "unreviewed flagged listing stays held").toBe("pending_review");
  recordStep("moderator_aal2_review", { flags: flags.length });
});

test("buyer_visibility: published listing is visible to buyers, with pairing never transfer-ready", async () => {
  expect(hiddenBeforePublication, "pre-publication invisibility must have been proven first").toBe(true);
  let found: Awaited<ReturnType<typeof search>>["items"][number] | undefined;
  for (let i = 0; i < 12 && !found; i++) {
    found = (await search(buyer.client, { ...listingFilters, sort: "newest" })).items.find(x => x.id === A.listingId);
    if (!found) await new Promise(r => setTimeout(r, 5_000));
  }
  expect(found, "approved listing appears in buyer search").toBeDefined();
  expect(found!.wearable).toMatchObject({ pairing_status: "still_paired", transfer_ready: false });
  const anonymousView = await search(anonSb, { ...listingFilters, sort: "newest" });
  expect(anonymousView.items.map(i => i.id)).toContain(A.listingId);
  expect(anonymousView.items.map(i => i.id)).not.toContain(B.listingId);
  expect((await search(buyer.client, { ...listingFilters, transfer_ready: "true" })).items.map(i => i.id)).not.toContain(A.listingId);
  const page = await anon.get(`/listings/${found!.slug}`);
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain(A.title);
  recordStep("buyer_visibility", { slug: found!.slug });
});
