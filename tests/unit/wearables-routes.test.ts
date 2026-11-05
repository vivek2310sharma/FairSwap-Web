// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(), catalogue: vi.fn(), session: vi.fn(), recovery: vi.fn(), prepare: vi.fn(), rpc: vi.fn(), revision: vi.fn(), process: vi.fn(), upload: vi.fn(), ready: vi.fn(), signed: vi.fn(),
}));
vi.mock("@/lib/listings/wearables/server", () => ({
  wearablePostingGuard: m.guard, loadWearableCatalogue: m.catalogue, wearableSession: m.session, wearableRecoveryChoices: m.recovery, prepareWearableMedia: m.prepare, catalogueRevision: m.revision,
  readPostingBody: async (r: Request) => new Uint8Array(await r.arrayBuffer()), wearableModelsFor: (b: string, t: string) => [{ id: "wm_0123456789ab", name: `${b}/${t}`, series: "S" }],
  wearablePostingError: (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "x" }, { status: e instanceof Error && /Cross|denied/.test(e.message) ? 503 : 400 }),
}));
vi.mock("@/lib/listings/mobiles/server", () => ({ stagedPrefix: (...a: string[]) => a.join("/") }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({ storage: { from: () => ({ upload: m.upload, remove: vi.fn(), createSignedUrl: m.signed }) }, rpc: m.ready }) }));
vi.mock("@/lib/media/processor", () => ({ detectImageMimeFromMagicBytes: (b: Uint8Array) => (b[0] === 0xff ? "image/jpeg" : null), processImageBuffer: m.process }));
vi.mock("sharp", () => ({ default: () => ({ metadata: async () => ({ width: 800, height: 600 }) }) }));
import { POST as submit } from "@/app/api/post-ad/wearables/submit/route";
import { GET as sessionsGet, POST as sessionsPost, DELETE as sessionsDelete } from "@/app/api/post-ad/wearables/sessions/route";
import { GET as mediaGet, POST as mediaPost, DELETE as mediaDelete } from "@/app/api/post-ad/wearables/sessions/[id]/media/route";
import { GET as modelsGet } from "@/app/api/post-ad/wearables/models/route";
import { SESSION, MEDIA, valid, catalogue } from "./wearable-fixture";

const rev = catalogue.revision;
const post = (url: string, v: unknown, h: Record<string, string> = {}) => new Request(`http://localhost${url}`, { method: "POST", headers: { origin: "http://localhost", ...h }, body: typeof v === "string" ? v : JSON.stringify(v) });
const snap = (state: "uploading" | "ready" = "ready") => ({ session: { id: SESSION, owner_id: SESSION, listing_id: SESSION, state: "open" }, media: [{ id: MEDIA, session_id: SESSION, attempt: SESSION, state, file_size: 1, width: 1, height: 1 }] });
beforeEach(() => {
  vi.clearAllMocks();
  m.guard.mockResolvedValue({ client: { rpc: m.rpc }, user: { id: SESSION } }); m.catalogue.mockResolvedValue(catalogue); m.revision.mockReturnValue(rev);
  m.rpc.mockResolvedValue({ data: { success: true, listing_id: SESSION }, error: null }); m.session.mockResolvedValue(snap()); m.recovery.mockResolvedValue({ limit: 5, sessions: [] });
  m.process.mockResolvedValue({ large: Buffer.from("l"), thumb: Buffer.from("t"), medium: Buffer.from("m") }); m.upload.mockResolvedValue({ error: null }); m.ready.mockResolvedValue({ data: true, error: null }); m.signed.mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });
});

describe("submit boundary", () => {
  it.each([
    [{ ram: "8 GB" }], [{ imei: "1234" }], [{ pairing_status: "locked" }], [{ ownership_confirmed: false }], [{ device_type: "smartphone" }], [{ price_paise: 0 }], [{ plan_id: "paid" }], [{ selection: { category: "mobiles", subcategory: "mobile-phones", version: 2 } }],
  ])("rejects forged or invalid payloads before media or the database: %j", async over => {
    const r = await submit(post("/api/post-ad/wearables/submit", { ...valid(), ...over }));
    expect(r.status).toBe(422); expect(m.prepare).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each(["Send advance payment to seller@okaxis", "Call me on 98765 43210", "pay upi://pay?pa=x@ok", "courier fee needed first", "chat on wa.me/919876543210"])("blocks India-specific scams in free text: %s", async text => {
    const r = await submit(post("/api/post-ad/wearables/submit", { ...valid(), description: `Great watch in good shape. ${text}` }));
    expect(r.status).toBe(422); expect((await r.json()).error).toMatch(/payment|contact|courier/i); expect(m.prepare).not.toHaveBeenCalled();
  });
  it("a stale catalogue revision is refused (409) and a disabled category fails closed", async () => {
    m.revision.mockReturnValue("ffffffffffffffff");
    expect((await submit(post("/api/post-ad/wearables/submit", valid()))).status).toBe(409); expect(m.prepare).not.toHaveBeenCalled();
    m.revision.mockReturnValue(rev); m.catalogue.mockResolvedValue(null);
    expect((await submit(post("/api/post-ad/wearables/submit", valid()))).status).toBe(400); expect(m.prepare).not.toHaveBeenCalled();
  });
  it("prepares media, then calls only the dedicated RPC", async () => {
    const r = await submit(post("/api/post-ad/wearables/submit", valid()));
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ success: true, listing_id: SESSION });
    expect(m.prepare).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledTimes(1); expect(m.rpc.mock.calls[0][0]).toBe("submit_wearable_v1");
    expect(m.rpc.mock.invocationCallOrder[0]).toBeGreaterThan(m.prepare.mock.invocationCallOrder[0]);
  });
  it("database refusal and auth rejection never look like success and never reach media", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: "WEARABLE_LOCKED" } });
    const r = await submit(post("/api/post-ad/wearables/submit", valid())); expect(r.status).toBe(400); expect((await r.json()).error).toBe("WEARABLE_LOCKED");
    m.guard.mockRejectedValue(new Error("denied")); m.prepare.mockClear();
    expect((await submit(post("/api/post-ad/wearables/submit", valid()))).status).toBe(503); expect(m.prepare).not.toHaveBeenCalled();
  });
  it("oversize bodies are rejected", async () => {
    expect((await submit(post("/api/post-ad/wearables/submit", "x", { "content-length": "99999" }))).status).toBe(413);
  });
});

describe("session routes", () => {
  it("create/claim/acquire use only the wearable wrapper; unknown keys and operations are refused", async () => {
    for (const operation of ["create", "create_empty", "claim_draft", "acquire_draft"]) { m.session.mockClear(); expect((await sessionsPost(post("/api/post-ad/wearables/sessions", { session_id: SESSION, operation }))).status).toBe(200); expect(m.session).toHaveBeenCalledWith(expect.anything(), SESSION, operation); }
    for (const bad of [{ session_id: SESSION, operation: "prepare" }, { session_id: SESSION, operation: "abandon_empty" }, { session_id: "nope" }, { session_id: SESSION, extra: 1 }]) expect((await sessionsPost(post("/api/post-ad/wearables/sessions", bad))).status, JSON.stringify(bad)).toBe(400);
  });
  it("a disabled category is unavailable and never opens a session", async () => {
    m.catalogue.mockResolvedValue(null); expect((await sessionsPost(post("/api/post-ad/wearables/sessions", { session_id: SESSION }))).status).toBe(400); expect(m.session).not.toHaveBeenCalled();
  });
  it("recovery listing and abandon use wearable operations; cache is private", async () => {
    const g = await sessionsGet(new Request("http://localhost/api/post-ad/wearables/sessions")); expect(g.status).toBe(200); expect(m.recovery).toHaveBeenCalled(); expect(g.headers.get("cache-control")).toBe("private, no-store");
    const d = await sessionsDelete(new Request("http://localhost/api/post-ad/wearables/sessions", { method: "DELETE", headers: { origin: "http://localhost" }, body: JSON.stringify({ session_id: SESSION }) }));
    expect(d.status).toBe(200); expect(m.session).toHaveBeenLastCalledWith(expect.anything(), SESSION, "abandon_empty");
  });
  it("a cross-category session surfaces as unavailable, not as another category's data", async () => {
    m.session.mockRejectedValue(new Error("Cross-category session")); const r = await sessionsPost(post("/api/post-ad/wearables/sessions", { session_id: SESSION })); expect(r.status).toBe(503);
  });
});

describe("media route (wearable twin)", () => {
  const ctx = { params: Promise.resolve({ id: SESSION }) };
  const upload = (file: Uint8Array, mediaId: string = MEDIA) => { const f = new FormData(); f.set("media_id", mediaId); f.set("file", new File([file as BlobPart], "p.jpg", { type: "image/jpeg" })); return new Request(`http://localhost/api/post-ad/wearables/sessions/${SESSION}/media`, { method: "POST", headers: { origin: "http://localhost" }, body: f }); };
  const jpeg = new Uint8Array(64).fill(0xff);
  it("checks ownership/category before parsing the body, reserves, uploads sanitized copies, then marks ready", async () => {
    m.session.mockImplementation(async (_c: unknown, _id: string, op: string) => (op === "reserve" ? snap("uploading") : snap("uploading")));
    const r = await mediaPost(upload(jpeg), ctx);
    expect(r.status).toBe(200);
    expect(m.session.mock.calls.map(c => c[2])).toEqual(["read", "reserve"]);
    expect(m.upload).toHaveBeenCalledTimes(4); expect(m.ready).toHaveBeenCalledWith("posting_v2_media_ready", expect.objectContaining({ session_id: SESSION, media_id: MEDIA, attempt_id: SESSION }));
    expect(m.session.mock.invocationCallOrder[0]).toBeLessThan(m.process.mock.invocationCallOrder[0]);
  });
  it("rejects non-owned/cross-category sessions before reading the upload, invalid ids and non-images before any storage write", async () => {
    m.session.mockRejectedValueOnce(new Error("Cross-category session")); expect((await mediaPost(upload(jpeg), ctx)).status).toBe(503); expect(m.process).not.toHaveBeenCalled(); expect(m.upload).not.toHaveBeenCalled();
    m.session.mockResolvedValue(snap("uploading"));
    expect((await mediaPost(upload(jpeg, "nope"), ctx)).status).toBe(400);
    expect((await mediaPost(upload(new Uint8Array(64).fill(1)), ctx)).status).toBe(400); expect(m.upload).not.toHaveBeenCalled();
    expect((await mediaPost(new Request("http://localhost/x", { method: "POST", headers: { origin: "http://localhost", "content-length": String(7 * 1024 * 1024) }, body: "x" }), ctx)).status).toBe(413);
  });
  it("an already-ready photo is idempotent and an unconfirmed completion is an error", async () => {
    m.session.mockResolvedValue(snap("ready")); const again = await mediaPost(upload(jpeg), ctx); expect(again.status).toBe(200); expect(m.upload).not.toHaveBeenCalled();
    m.session.mockImplementation(async () => snap("uploading")); m.ready.mockResolvedValue({ data: false, error: null });
    expect((await mediaPost(upload(jpeg), ctx)).status).toBe(400);
  });
  it("GET signs only ready photos under the owner's prefix; DELETE uses remove", async () => {
    const g = await mediaGet(new Request("http://localhost/x"), ctx); expect(g.status).toBe(200);
    expect(m.signed).toHaveBeenCalledWith(`${SESSION}/${SESSION}/${MEDIA}/${SESSION}/medium.webp`, 600);
    expect((await g.json()).media[0].url).toBe("https://signed");
    const d = await mediaDelete(new Request("http://localhost/x", { method: "DELETE", headers: { origin: "http://localhost" }, body: JSON.stringify({ media_id: MEDIA }) }), ctx);
    expect(d.status).toBe(200); expect(m.session).toHaveBeenLastCalledWith(expect.anything(), SESSION, "remove", MEDIA);
  });
});

describe("models route", () => {
  const get = (q: string) => modelsGet(new Request(`http://localhost/api/post-ad/wearables/models?${q}`));
  it("serves one brand + type, validates inputs and fails closed", async () => {
    const r = await get("brand_id=wb_apple&type=smartwatch"); expect(r.status).toBe(200); expect((await r.json()).models).toHaveLength(1);
    for (const q of ["brand_id=wb_apple", "type=smartwatch", "brand_id=x&type=smartwatch", "brand_id=wb_apple&type=phone", "brand_id=wb_apple&type=smartwatch&all=1"]) expect((await get(q)).status, q).toBe(400);
    m.catalogue.mockResolvedValue(null); expect((await get("brand_id=wb_apple&type=smartwatch")).status).toBe(400);
  });
});
