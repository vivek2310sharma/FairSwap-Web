// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn(), promote: vi.fn() }));
vi.mock("@/lib/listings/posting-base-guard", () => ({ postingBaseGuard: stubs.guard }));
vi.mock("@/lib/listings/prepare-posting-media", () => ({ copyPreparedPostingMedia: stubs.promote }));
import { POST } from "@/app/api/post-ad/goods/[slug]/submit/route";

const owner = "10000000-0000-4000-8000-000000000000";
const category = "331aa914-39c6-5cb1-9b63-49e50a62dd01";
const session = "20000000-0000-4000-8000-000000000000";
const slug = "v2-tvs";
const payload = {
  slug, category_id: category, revision: 1, session_id: session, title: "Television",
  description: "Carefully used for three years.", condition: "good", price_type: "fixed", price_paise: 50000,
  answers: { screen: 55, safety_confirmed: true, power_safe: true, defects: "" },
  pin_code: "560001", city_id: owner, locality_id: owner, media_ids: [owner],
};
const request = (body: unknown = payload, selected = slug) => POST(
  new Request(`http://localhost/api/post-ad/goods/${selected}/submit`, { method: "POST", body: JSON.stringify(body) }),
  { params: Promise.resolve({ slug: selected }) },
);
beforeEach(() => {
  vi.resetAllMocks();
  stubs.guard.mockResolvedValue({ client: { rpc: stubs.rpc }, user: { id: owner } });
  stubs.rpc.mockImplementation(async (name: string) => ({ error: null, data: ({
    ordinary_goods_v3: { slug, category_id: category, revision: 1, risk: "electronics",
      fields: [{ key: "screen", label: "Screen size", required: true, kind: "number", min: 5, max: 150 }] },
    ordinary_goods_prepare_v3: { session: { id: session, owner_id: owner, listing_id: category, state: "finalizing" }, media: [] },
    ordinary_goods_submit_v3: { success: true, listing_id: category },
  })[name] }));
});

it("passes the same validated scoped payload to freeze and submit, after media promotion", async () => {
  expect((await request()).status).toBe(200);
  expect(stubs.rpc.mock.calls.slice(1)).toEqual([
    ["ordinary_goods_prepare_v3", { payload }], ["ordinary_goods_submit_v3", { payload }],
  ]);
  expect(stubs.promote.mock.invocationCallOrder[0]).toBeLessThan(stubs.rpc.mock.invocationCallOrder[2]);
});
it("refuses category, revision and content spoofing before freeze or storage", async () => {
  for (const change of [{ category_id: owner }, { revision: 2 }, { description: "Pay on https://fake.example now" }]) {
    stubs.rpc.mockClear();
    expect((await request({ ...payload, ...change })).status).toBe(422);
    expect(stubs.rpc.mock.calls.map(([name]) => name)).toEqual(["ordinary_goods_v3"]);
  }
  expect(stubs.promote).not.toHaveBeenCalled();
});
it("fails closed on a disabled contract and when the owning session denies preparation", async () => {
  stubs.rpc.mockResolvedValueOnce({ error: null, data: null });
  expect((await request()).status).toBe(422);
  stubs.rpc.mockClear();
  const original = stubs.rpc.getMockImplementation()!;
  stubs.rpc.mockImplementation((name: string) => name === "ordinary_goods_prepare_v3"
    ? Promise.resolve({ error: { message: "UPLOAD_SESSION_UNAVAILABLE" }, data: null }) : original(name));
  expect((await request()).ok).toBe(false);
  expect(stubs.promote).not.toHaveBeenCalled();
  expect(stubs.rpc.mock.calls.some(([name]) => name === "ordinary_goods_submit_v3")).toBe(false);
});
it("does not submit after private storage promotion fails", async () => {
  stubs.promote.mockRejectedValue(Error("Private copy failed"));
  expect((await request()).ok).toBe(false);
  expect(stubs.rpc.mock.calls.some(([name]) => name === "ordinary_goods_submit_v3")).toBe(false);
});
it("requires the existing authenticated posting boundary before parsing any contract", async () => {
  stubs.guard.mockRejectedValue(Error("Denied"));
  expect((await request()).ok).toBe(false);
  expect(stubs.rpc).not.toHaveBeenCalled();
});


it.each(["v2-cars", "v2-motorcycles-scooters"])(
  "keeps specialist %s draft-only before freeze, photo copy or submit RPC",
  async selected => {
    stubs.rpc.mockResolvedValueOnce({ error: null, data: { slug: selected, category_id: category, revision: 1,
      risk: "general", fields: [{ key: "brand", label: "Make", kind: "text", required: true }] } });
    const response = await request({ ...payload, slug: selected, answers: { brand: "Example", authority: "Registered owner",
      registration: "Registered in India", eligibility_verified: true } }, selected);
    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ code: "REGULATED_VEHICLE_DRAFT_ONLY" });
    expect(stubs.rpc.mock.calls.map(([name]) => name)).toEqual(["ordinary_goods_v3"]);
    expect(stubs.promote).not.toHaveBeenCalled();
  },
);

it.each(["v2-commercial-vehicles", "v2-electric-cycles-low-speed-evs"])(
  "submits reviewed %s only with a valid category-bound payload and prepared session",
  async selected => {
    stubs.rpc.mockResolvedValueOnce({ error: null, data: { slug: selected, category_id: category, revision: 1,
      risk: "general", fields: [{ key: "brand", label: "Make", kind: "text", required: true }] } });
    const scoped = { ...payload, slug: selected,
      answers: { brand: "Example", safety_confirmed: true, power_safe: true, defects: "" } };
    const response = await request(scoped, selected);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(stubs.rpc.mock.calls.map(([name]) => name)).toEqual([
      "ordinary_goods_v3", "ordinary_goods_prepare_v3", "ordinary_goods_submit_v3",
    ]);
    expect(stubs.rpc.mock.calls.slice(1)).toEqual([
      ["ordinary_goods_prepare_v3", { payload: scoped }],
      ["ordinary_goods_submit_v3", { payload: scoped }],
    ]);
    expect(stubs.promote).toHaveBeenCalledOnce();
    expect(stubs.promote.mock.invocationCallOrder[0]).toBeLessThan(stubs.rpc.mock.invocationCallOrder[2]);
  },
);

it.each(["v2-commercial-vehicles", "v2-electric-cycles-low-speed-evs"])(
  "rejects spoofed %s payloads before freeze, media or submit RPC",
  async selected => {
    stubs.rpc.mockResolvedValueOnce({ error: null, data: { slug: selected, category_id: category, revision: 1,
      risk: "general", fields: [{ key: "brand", label: "Make", kind: "text", required: true }] } });
    const response = await request({ ...payload, slug: selected, category_id: owner,
      answers: { brand: "Example", safety_confirmed: true, power_safe: true, defects: "" } }, selected);
    expect(response.status).toBe(422);
    expect(stubs.rpc.mock.calls.map(([name]) => name)).toEqual(["ordinary_goods_v3"]);
    expect(stubs.promote).not.toHaveBeenCalled();
  },
);
