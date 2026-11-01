// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ guard: vi.fn(), catalogue: vi.fn(), session: vi.fn(), rpc: vi.fn(), storage: vi.fn() }));
vi.mock("@/lib/listings/mobiles/server", () => ({ postingGuard: m.guard, loadMobileCatalogue: m.catalogue, sessionCall: m.session, stagedPrefix: () => "staged", readPostingBody: async (r: Request) => new Uint8Array(await r.arrayBuffer()), postingError: () => Response.json({ error: "Request rejected" }, { status: 400 }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({ storage: { from: m.storage } }) }));
import { POST } from "@/app/api/post-ad/submit/route";
const id = "11111111-1111-4111-8111-111111111111";
const valid = { selection: { category: "mobiles", subcategory: "mobile-phones", version: 2 }, session_id: id, trade: "sell", brand_id: id, model_id: id, other_model: "", storage: "128 GB", ram: "", condition: "good", included: [], warranty_until: "", title: "Apple iPhone 15", description: "Used carefully with no repairs.", price_paise: 2500000, negotiable: false, pin_code: "560034", city_id: id, locality_id: id, media_ids: [id], plan_id: "free-v1" };
const request = (body: unknown) => new Request("http://localhost/api/post-ad/submit", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); m.guard.mockResolvedValue({ client: { rpc: m.rpc }, user: { id } }); m.catalogue.mockResolvedValue({ models: [{ id, brand_id: id, other: false }] }); m.session.mockResolvedValue({ session: { state: "submitted", listing_id: id }, media: [] }); m.rpc.mockResolvedValue({ data: { success: true, listing_id: id }, error: null }); });
describe("Unchanged authoritative mobile submission boundary", () => {
    it.each([{ media_ids: [] }, { media_ids: [id, id] }, { price_paise: 0 }, { plan_id: "paid" }, { selection: { category: "mobiles", subcategory: "tablets", version: 2 } }])("rejects invalid payload before preparing photos: %j", async (changes) => { expect((await POST(request({ ...valid, ...changes }))).status).toBe(422); expect(m.session).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled(); });
    it("retains moderation/contact checks after valid shape", async () => { expect((await POST(request({ ...valid, description: "Call +91 98765 43210" }))).status).toBe(422); expect(m.session).not.toHaveBeenCalled(); });
    it("rejects a model outside the current server catalogue", async () => { m.catalogue.mockResolvedValue({ models: [] }); expect((await POST(request(valid))).status).toBe(422); expect(m.session).not.toHaveBeenCalled(); });
    it("never reaches catalogue or storage when the auth/policy/maintenance guard rejects", async () => { m.guard.mockRejectedValue(new Error("Sign in to continue.")); expect((await POST(request(valid))).status).toBe(400); expect(m.catalogue).not.toHaveBeenCalled(); expect(m.storage).not.toHaveBeenCalled(); });
    it("reuses the submitted session and calls the existing RPC with the exact validated payload", async () => { expect((await POST(request(valid))).status).toBe(200); expect(m.session).toHaveBeenCalledWith(expect.anything(), id, "prepare"); expect(m.rpc).toHaveBeenCalledWith("submit_mobile_v2", { payload: valid }); expect(m.storage).not.toHaveBeenCalled(); });
});
