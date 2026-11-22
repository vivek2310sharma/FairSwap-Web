// @vitest-environment node
/**
 * Books and Tables & Chairs route-boundary tests. EVIDENCE LEVEL: the Supabase client, storage and image
 * processor are mocks. These tests prove this repository's route code validates, orders and fails closed.
 * They do NOT prove database RLS, real session ownership, real storage, or RPC-level idempotency; those need the
 * Backend disposable-DB suites and hosted Test acceptance.
 */
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({
  guard: vi.fn(), rpc: vi.fn(), promote: vi.fn(), upload: vi.fn(), remove: vi.fn(), storageRpc: vi.fn(), process: vi.fn(),
}));
vi.mock("@/lib/listings/posting-base-guard", () => ({ postingBaseGuard: stubs.guard }));
vi.mock("@/lib/listings/prepare-posting-media", () => ({ copyPreparedPostingMedia: stubs.promote }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({
    rpc: stubs.storageRpc,
    storage: { from: () => ({ upload: stubs.upload, remove: stubs.remove, createSignedUrl: vi.fn() }) },
  }),
}));
vi.mock("@/lib/media/processor", () => ({
  detectImageMimeFromMagicBytes: (b: Uint8Array) => (b[0] === 0x89 ? "image/png" : null),
  processImageBuffer: stubs.process,
}));
import { POST as submit } from "@/app/api/post-ad/goods/[slug]/submit/route";
import { POST as createSession } from "@/app/api/post-ad/goods/[slug]/sessions/route";
import { POST as uploadMedia, DELETE as removeMedia } from "@/app/api/post-ad/goods/[slug]/sessions/[id]/media/route";

const owner = "10000000-0000-4000-8000-000000000000";
const stranger = "30000000-0000-4000-8000-000000000000";
const session = "20000000-0000-4000-8000-000000000000";
const media = "40000000-0000-4000-8000-000000000000";
const listing = "50000000-0000-4000-8000-000000000000";
const locality = "60000000-0000-4000-8000-000000000000";
const pilot = {
  "v2-books": {
    category: "c0ba9c51-8d6a-5c81-99e1-6be9c60a8fc5",
    fields: [{ key: "book_title", label: "Book title", required: true, kind: "text" }, { key: "author", label: "Author", required: false, kind: "text" }],
    answers: { book_title: "Collected stories" },
  },
  "v2-tables-chairs": {
    category: "ec6a3d86-1ce8-574e-9a7b-bef64e1ccf41",
    fields: [{ key: "item_type", label: "Table or chair type", required: true, kind: "text" },
      { key: "quantity", label: "Quantity", required: false, kind: "number", min: 1, max: 100 }],
    answers: { item_type: "Dining chair" },
  },
} as const;
type Slug = keyof typeof pilot;
const payloadFor = (slug: Slug) => ({
  slug, category_id: pilot[slug].category, revision: 1, session_id: session, title: "Sample listing",
  description: "Carefully used for two years.", condition: "good", price_type: "fixed", price_paise: 129900,
  answers: { ...pilot[slug].answers, safety_confirmed: true, power_safe: true, defects: "" },
  pin_code: "560034", city_id: owner, locality_id: locality, media_ids: [media],
});
const attempt = "70000000-0000-4000-8000-000000000000";
const photo = (state: string) => ({ id: media, session_id: session, attempt, state, file_size: 1000, width: 32, height: 32 });
const origin = "http://localhost";
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${origin}${url}`, { method: "POST", headers: { origin, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const callSubmit = (slug: string, body: unknown) => submit(post(`/api/post-ad/goods/${slug}/submit`, body), { params: Promise.resolve({ slug }) });
const rpcNames = () => stubs.rpc.mock.calls.map(([name]) => name);

/** Every negative test first proves the identical request is accepted, so a rejection can never be vacuous. */
async function expectBaselineAccepted(slug: Slug) {
  expect((await callSubmit(slug, payloadFor(slug))).status).toBe(200);
  stubs.rpc.mockClear();
  stubs.promote.mockClear();
}

function install(slug: Slug, overrides: Record<string, (args: unknown) => unknown> = {}) {
  const snapshot = (state = "finalizing", ownerId = owner, id = session) => ({
    session: { id, owner_id: ownerId, listing_id: listing, state }, media: [photo("ready")],
  });
  const table: Record<string, (args: unknown) => unknown> = {
    ordinary_goods_v3: () => ({ slug, category_id: pilot[slug].category, revision: 1, risk: "general", fields: pilot[slug].fields }),
    ordinary_goods_prepare_v3: () => snapshot(),
    ordinary_goods_submit_v3: () => ({ success: true, listing_id: listing }),
    ordinary_goods_session_v3: () => snapshot("open"),
    ...overrides,
  };
  stubs.rpc.mockImplementation(async (name: string, args: unknown) => {
    const value = table[name]?.(args);
    return value instanceof Error ? { error: { message: value.message }, data: null } : { error: null, data: value ?? null };
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  stubs.guard.mockResolvedValue({ client: { rpc: stubs.rpc }, user: { id: owner } });
  stubs.upload.mockResolvedValue({ error: null });
  stubs.storageRpc.mockResolvedValue({ error: null, data: true });
  const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#32695d" } }).webp().toBuffer();
  stubs.process.mockResolvedValue({ large: webp, thumb: webp, medium: webp });
});

describe.each(Object.keys(pilot) as Slug[])("%s submit boundary", slug => {
  beforeEach(() => install(slug));

  it("freezes then submits the identical validated payload only after media promotion", async () => {
    const payload = payloadFor(slug);
    const response = await callSubmit(slug, payload);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ success: true, listing_id: listing });
    expect(stubs.rpc.mock.calls.slice(1)).toEqual([["ordinary_goods_prepare_v3", { payload }], ["ordinary_goods_submit_v3", { payload }]]);
    expect(stubs.promote.mock.invocationCallOrder[0]).toBeLessThan(stubs.rpc.mock.invocationCallOrder[2]);
  });

  it.each([
    ["disabled or unreleased contract", () => null],
    ["contract lookup error", () => new Error("boom")],
    ["contract for a different category", () => ({ slug: "v2-tvs", category_id: owner, revision: 1, risk: "general", fields: pilot[slug].fields })],
    ["malformed contract", () => ({ slug, category_id: "not-a-uuid" })],
  ])("fails closed on %s before parsing, freeze or storage", async (_name, definition) => {
    await expectBaselineAccepted(slug);
    install(slug, { ordinary_goods_v3: definition });
    expect((await callSubmit(slug, payloadFor(slug))).status).toBe(422);
    expect(rpcNames()).toEqual(["ordinary_goods_v3"]);
    expect(stubs.promote).not.toHaveBeenCalled();
  });

  it.each([
    ["forged category", { category_id: owner }], ["stale revision", { revision: 2 }],
    ["swapped slug", { slug: slug === "v2-books" ? "v2-tables-chairs" : "v2-books" }],
    ["extra property", { is_verified: true }], ["unsafe link", { description: "Pay on https://fake.example now" }],
    ["duplicate media ids", { media_ids: [media, media] }], ["no photos", { media_ids: [] }],
    ["nine photos", { media_ids: Array.from({ length: 9 }, (_, i) => `40000000-0000-4000-8000-00000000000${i}`) }],
    ["price below INR 1", { price_paise: 99 }], ["free with a price", { price_type: "free" }],
    ["unsafe declaration unchecked", { answers: { ...payloadFor(slug).answers, safety_confirmed: false } }],
  ])("rejects %s before any freeze or private copy", async (_name, change) => {
    await expectBaselineAccepted(slug);
    expect((await callSubmit(slug, { ...payloadFor(slug), ...change })).status).toBe(422);
    expect(rpcNames()).toEqual(["ordinary_goods_v3"]);
    expect(stubs.promote).not.toHaveBeenCalled();
  });

  it("rejects an oversized or non-JSON body before any freeze", async () => {
    await expectBaselineAccepted(slug);
    expect((await callSubmit(slug, "{not json")).ok).toBe(false);
    expect((await callSubmit(slug, { ...payloadFor(slug), description: "x".repeat(20_000) })).ok).toBe(false);
    expect(rpcNames().filter(name => name !== "ordinary_goods_v3")).toEqual([]);
    expect(stubs.promote).not.toHaveBeenCalled();
  });

  it.each([
    ["a session owned by someone else", () => ({ session: { id: session, owner_id: stranger, listing_id: listing, state: "finalizing" }, media: [] })],
    ["a different session", () => ({ session: { id: stranger, owner_id: owner, listing_id: listing, state: "finalizing" }, media: [] })],
    ["a session that is still open", () => ({ session: { id: session, owner_id: owner, listing_id: listing, state: "open" }, media: [] })],
    ["an expired session", () => ({ session: { id: session, owner_id: owner, listing_id: listing, state: "expired" }, media: [] })],
    ["an RPC denial", () => new Error("UPLOAD_SESSION_UNAVAILABLE")],
  ])("never promotes or submits when preparation returns %s (mocked RPC response)", async (_name, prepared) => {
    await expectBaselineAccepted(slug);
    install(slug, { ordinary_goods_prepare_v3: prepared });
    expect((await callSubmit(slug, payloadFor(slug))).ok).toBe(false);
    expect(stubs.promote).not.toHaveBeenCalled();
    expect(rpcNames()).not.toContain("ordinary_goods_submit_v3");
  });

  it("never submits when private media promotion fails, and a retry sends the same payload", async () => {
    const payload = payloadFor(slug);
    stubs.promote.mockRejectedValueOnce(Error("Private copy failed"));
    expect((await callSubmit(slug, payload)).ok).toBe(false);
    expect(rpcNames()).not.toContain("ordinary_goods_submit_v3");
    stubs.rpc.mockClear();
    expect((await callSubmit(slug, payload)).status).toBe(200);
    expect(stubs.rpc.mock.calls.slice(1)).toEqual([["ordinary_goods_prepare_v3", { payload }], ["ordinary_goods_submit_v3", { payload }]]);
  });

  it("route-level retry: duplicate submissions resend a byte-identical payload and return the same listing", async () => {
    const payload = payloadFor(slug);
    const first = await callSubmit(slug, payload);
    const second = await callSubmit(slug, payload);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(await second.json()).toEqual(await first.json());
    const submits = stubs.rpc.mock.calls.filter(([name]) => name === "ordinary_goods_submit_v3").map(([, args]) => JSON.stringify(args));
    expect(submits).toHaveLength(2);
    expect(new Set(submits).size).toBe(1);
  });

  it("maps a frozen-session conflict from the freeze RPC to 422 without promoting or submitting", async () => {
    install(slug, { ordinary_goods_prepare_v3: () => new Error("ORDINARY_GOODS_FROZEN_CONFLICT") });
    const response = await callSubmit(slug, payloadFor(slug));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toMatch(/different details/);
    expect(stubs.promote).not.toHaveBeenCalled();
    expect(rpcNames()).not.toContain("ordinary_goods_submit_v3");
  });

  it("does not report success unless the submit RPC returns the strict success envelope", async () => {
    await expectBaselineAccepted(slug);
    for (const bad of [() => ({ success: true }), () => ({ success: true, listing_id: listing, extra: 1 }), () => ({ success: false, listing_id: listing })]) {
      install(slug, { ordinary_goods_submit_v3: bad });
      expect((await callSubmit(slug, payloadFor(slug))).ok).toBe(false);
    }
  });

  it("denies unauthenticated and unknown-slug requests before any RPC", async () => {
    await expectBaselineAccepted(slug);
    stubs.guard.mockRejectedValue(Error("Denied"));
    expect((await callSubmit(slug, payloadFor(slug))).ok).toBe(false);
    stubs.guard.mockResolvedValue({ client: { rpc: stubs.rpc }, user: { id: owner } });
    stubs.rpc.mockClear();
    for (const bad of ["v2-nonexistent", "__proto__", "v2-books/../v2-cars", ""]) {
      expect((await callSubmit(bad, payloadFor(slug))).ok).toBe(false);
    }
    expect(stubs.rpc).not.toHaveBeenCalled();
  });
});

describe.each(Object.keys(pilot) as Slug[])("%s session and media boundary", slug => {
  beforeEach(() => install(slug));
  const ctx = (id = session) => ({ params: Promise.resolve({ slug, id }) });
  const form = (bytes: number[], id = media) => {
    const body = new FormData();
    body.set("media_id", id);
    body.set("file", new File([new Uint8Array(bytes)], "p.png", { type: "image/png" }));
    return new Request(`${origin}/api/post-ad/goods/${slug}/sessions/${session}/media`, { method: "POST", headers: { origin }, body });
  };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3, 4];

  it("creates a session only for a strict body and the selected slug", async () => {
    const ok = await createSession(post(`/api/post-ad/goods/${slug}/sessions`, { session_id: session }), { params: Promise.resolve({ slug }) });
    expect(ok.status).toBe(200);
    expect(stubs.rpc).toHaveBeenCalledWith("ordinary_goods_session_v3", { slug, session_id: session, operation: "create", media_id: null });
    stubs.rpc.mockClear();
    for (const body of [{ session_id: session, owner_id: stranger }, { session_id: "nope" }, {}]) {
      expect((await createSession(post(`/api/post-ad/goods/${slug}/sessions`, body), { params: Promise.resolve({ slug }) })).ok).toBe(false);
    }
    expect((await createSession(post("/api/post-ad/goods/v2-unknown/sessions", { session_id: session }), { params: Promise.resolve({ slug: "v2-unknown" }) })).ok).toBe(false);
    expect(stubs.rpc).not.toHaveBeenCalled();
  });

  it("propagates a session denial from the owner-scoped RPC and touches no storage (mocked RPC)", async () => {
    install(slug, { ordinary_goods_session_v3: () => new Error("UPLOAD_SESSION_UNAVAILABLE") });
    const response = await uploadMedia(form(png), ctx());
    expect(response.status).toBe(503);
    expect(stubs.upload).not.toHaveBeenCalled();
    expect(stubs.process).not.toHaveBeenCalled();
    const removed = await removeMedia(post(`/api/post-ad/goods/${slug}/sessions/${session}/media`, { media_id: media }), ctx());
    expect(removed.status).toBe(503);
  });

  it("scopes every media RPC to the selected slug and session", async () => {
    expect((await uploadMedia(form(png), ctx())).status).toBe(200);
    for (const [name, args] of stubs.rpc.mock.calls) {
      expect(name).toBe("ordinary_goods_session_v3");
      expect(args).toMatchObject({ slug, session_id: session });
    }
  });

  it("refuses oversized, truncated, non-image and malformed uploads before storage", async () => {
    const huge = new Request(`${origin}/x`, { method: "POST", headers: { origin, "content-length": String(7 * 1024 * 1024) }, body: "x" });
    // An in-flight (not yet ready) photo, so the bytes are actually inspected rather than short-circuited.
    install(slug, { ordinary_goods_session_v3: () => ({ session: { id: session, owner_id: owner, listing_id: listing, state: "open" }, media: [photo("uploading")] }) });
    expect((await uploadMedia(form(png), ctx())).status).toBe(200); // control: valid image passes the same gates
    expect(stubs.upload).toHaveBeenCalled();
    stubs.upload.mockClear();
    expect((await uploadMedia(huge, ctx())).status).toBe(413);
    expect((await uploadMedia(form([1, 2, 3]), ctx())).ok).toBe(false);
    expect((await uploadMedia(form(new Array(32).fill(0x41)), ctx())).ok).toBe(false);
    expect((await uploadMedia(form(png, "not-a-uuid"), ctx())).ok).toBe(false);
    expect((await uploadMedia(form(png), ctx("not-a-uuid"))).ok).toBe(false);
    expect(stubs.upload).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-ready photo: a repeat upload writes nothing (route layer)", async () => {
    expect((await uploadMedia(form(png), ctx())).status).toBe(200);
    expect(stubs.upload).not.toHaveBeenCalled(); // mocked snapshot already reports the photo ready
  });

  it("recovers a failed upload by removing partial private objects and never marking ready", async () => {
    install(slug, { ordinary_goods_session_v3: () =>
      ({ session: { id: session, owner_id: owner, listing_id: listing, state: "open" }, media: [photo("uploading")] }) });
    stubs.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "disk" } });
    expect((await uploadMedia(form(png), ctx())).ok).toBe(false);
    expect(stubs.remove).toHaveBeenCalledTimes(1);
    expect(stubs.remove.mock.calls[0][0]).toHaveLength(1);
    expect(stubs.storageRpc).not.toHaveBeenCalled();
  });
});
