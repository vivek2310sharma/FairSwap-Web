// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ createClient: vi.fn(), policy: vi.fn(), maintenance: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.createClient }));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: m.policy }));
vi.mock("@/lib/maintenance/seller-writes", () => ({ isSellerWriteMaintenanceEnabled: m.maintenance }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: m.service }));
import { postingGuard } from "@/lib/listings/mobiles/server";
import { catalogueRevision, loadWearableCatalogue, wearableModelsFor, wearablePostingError, wearablePostingGuard, wearableRecoveryChoices, wearableSession, wearablesEnabled } from "@/lib/listings/wearables/server";
import { PostingSessionError } from "@/lib/listings/mobiles/session-errors";
import { SESSION } from "./wearable-fixture";

const env = { ...process.env };
const client = (o: { user?: unknown; userError?: unknown; account?: string; rpc?: unknown } = {}) => ({
  auth: { getUser: async () => ({ data: { user: "user" in o ? o.user : { id: SESSION } }, error: o.userError ?? null }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { account_status: o.account ?? "active" }, error: null }) }) }) }),
  rpc: vi.fn(async () => o.rpc ?? { data: null, error: null }),
});
const req = (origin = "http://localhost") => new Request("http://localhost/x", { method: "POST", headers: { origin } });
const msg = async (p: Promise<unknown>) => p.then(() => "ok", (e: Error) => e.message);
beforeEach(() => { vi.clearAllMocks(); process.env = { ...env }; m.policy.mockResolvedValue({ allowed: true }); m.maintenance.mockReturnValue(false); m.createClient.mockResolvedValue(client()); });
afterEach(() => { process.env = { ...env }; });

describe("wearable feature gating is independent of the phone/tablet flags", () => {
  it("reads only POST_AD_WEARABLES_V1_ENABLED", () => {
    process.env.POST_AD_MOBILES_V2_ENABLED = "true"; process.env.POST_AD_TABLETS_V1_ENABLED = "true"; delete process.env.POST_AD_WEARABLES_V1_ENABLED;
    expect(wearablesEnabled()).toBe(false);
    delete process.env.POST_AD_MOBILES_V2_ENABLED; delete process.env.POST_AD_TABLETS_V1_ENABLED; process.env.POST_AD_WEARABLES_V1_ENABLED = "true";
    expect(wearablesEnabled()).toBe(true);
    process.env.POST_AD_WEARABLES_V1_ENABLED = "yes"; expect(wearablesEnabled()).toBe(false);
  });
  it("flag off fails before any auth or database work", async () => {
    delete process.env.POST_AD_WEARABLES_V1_ENABLED;
    expect(await msg(wearablePostingGuard(req()))).toBe("Wearable posting is coming soon.");
    expect(m.createClient).not.toHaveBeenCalled();
    const c = client(); expect(await loadWearableCatalogue(c as never)).toBeNull(); expect(c.rpc).not.toHaveBeenCalled();
  });
  it("works with the Mobile Phones flag OFF and shares the guard order with the phone guard when ON", async () => {
    process.env.POST_AD_WEARABLES_V1_ENABLED = "true"; delete process.env.POST_AD_MOBILES_V2_ENABLED;
    expect((await wearablePostingGuard(req())).user).toBeDefined();
    expect(await msg(postingGuard(req()))).toBe("Mobile posting is coming soon.");
    process.env.POST_AD_MOBILES_V2_ENABLED = "true";
    const scenarios: [string, () => void, ReturnType<typeof client> | undefined, string][] = [
      ["origin first", () => { m.maintenance.mockReturnValue(true); m.createClient.mockResolvedValue(client({ user: null })); }, undefined, "Request origin rejected."],
      ["maintenance next", () => { m.maintenance.mockReturnValue(true); }, undefined, "Posting is temporarily unavailable."],
      ["then sign-in", () => { m.createClient.mockResolvedValue(client({ user: null })); }, undefined, "Sign in to continue."],
      ["then policy", () => { m.policy.mockResolvedValue({ allowed: false }); m.createClient.mockResolvedValue(client({ account: "suspended" })); }, undefined, "Current policy acceptance is required."],
      ["then active account", () => { m.createClient.mockResolvedValue(client({ account: "suspended" })); }, undefined, "An active account is required."],
    ];
    for (const [name, setup, , expected] of scenarios) {
      vi.clearAllMocks(); m.policy.mockResolvedValue({ allowed: true }); m.maintenance.mockReturnValue(false); m.createClient.mockResolvedValue(client()); setup();
      const origin = name === "origin first" ? "http://evil.example" : "http://localhost";
      expect(await msg(wearablePostingGuard(req(origin))), name).toBe(expected);
      vi.clearAllMocks(); m.policy.mockResolvedValue({ allowed: true }); m.maintenance.mockReturnValue(false); m.createClient.mockResolvedValue(client()); setup();
      expect(await msg(postingGuard(req(origin))), `phone parity: ${name}`).toBe(expected);
    }
  });
  it("read-only (non-mutating) calls skip origin and maintenance like the phone guard", async () => {
    process.env.POST_AD_WEARABLES_V1_ENABLED = "true"; m.maintenance.mockReturnValue(true);
    expect((await wearablePostingGuard(req("http://evil.example"), false)).user).toBeDefined();
  });
});

describe("catalogue loader fails closed", () => {
  beforeEach(() => { process.env.POST_AD_WEARABLES_V1_ENABLED = "true"; });
  const rpc = (data: unknown, error: unknown = null) => client({ rpc: { data, error } });
  const ok = { version: 1, revision: "", listing_category_id: SESSION, enabled: true };
  it("returns brands only (no models) when flag, DB and revision agree", async () => {
    const c = rpc({ ...ok, revision: catalogueRevision() }); const r = await loadWearableCatalogue(c as never);
    expect(r?.brands.length).toBe(34); expect(r?.brands.map(b => b.name)).not.toContain("Whoop"); expect(JSON.stringify(r)).not.toContain("wm_"); expect(c.rpc).toHaveBeenCalledWith("wearables_v1_catalogue");
  });
  it.each([["DB disabled", (r: string) => ({ ...ok, revision: r, enabled: false })], ["revision drift", () => ({ ...ok, revision: "0000000000000000" })], ["bad shape", () => ({ nope: 1 })]])("%s", async (_n, make) => {
    expect(await loadWearableCatalogue(rpc(make(catalogueRevision())) as never)).toBeNull();
  });
  it("RPC error", async () => { expect(await loadWearableCatalogue(rpc(null, { message: "boom" }) as never)).toBeNull(); });
  it("serves one brand+type at a time", () => {
    const list = wearableModelsFor("wb_apple", "smartwatch");
    expect(list.length).toBeGreaterThan(5); expect(list.length).toBeLessThan(120); expect(wearableModelsFor("wb_apple", "smart_ring")).toEqual([]);
    expect(list.every(x => Object.keys(x).sort().join() === "id,name,series")).toBe(true);
  });
});

describe("session boundary", () => {
  it("calls only wearable_v1_session and maps database refusals to safe codes", async () => {
    const good = { session: { id: SESSION, owner_id: SESSION, listing_id: SESSION, state: "open" }, media: [] };
    const c = client({ rpc: { data: good, error: null } });
    await wearableSession(c as never, SESSION, "reserve", SESSION);
    expect(c.rpc).toHaveBeenCalledWith("wearable_v1_session", { session_id: SESSION, operation: "reserve", media_id: SESSION });
    for (const [message, code] of [["UPLOAD_SESSION_LIMIT", "UPLOAD_SESSION_LIMIT"], ["UPLOAD_SESSION_EXPIRED", "UPLOAD_SESSION_EXPIRED"], ["UPLOAD_SESSION_PROTECTED", "UPLOAD_SESSION_PROTECTED"], ["Upload in progress; retry shortly", "UPLOAD_SESSION_BUSY"], ["UPLOAD_SESSION_UNAVAILABLE", "UPLOAD_SESSION_UNAVAILABLE"], ["Cross-category session", "UPLOAD_SESSION_UNAVAILABLE"], ["relation \"secret_table\" does not exist", "UPLOAD_SESSION_UNAVAILABLE"]] as const) {
      const e = await wearableSession(client({ rpc: { data: null, error: { message } } }) as never, SESSION, "read").catch(x => x);
      expect(e).toBeInstanceOf(PostingSessionError); expect(e.code).toBe(code); expect(e.message).not.toContain("secret_table");
    }
    await expect(wearableSession(client({ rpc: { data: { junk: true }, error: null } }) as never, SESSION, "read")).rejects.toBeInstanceOf(PostingSessionError);
    await expect(wearableRecoveryChoices(client({ rpc: { data: { limit: 5, sessions: [] }, error: null } }) as never)).resolves.toEqual({ limit: 5, sessions: [] });
  });
  it("error boundary exposes only known messages", async () => {
    const body = async (e: unknown) => (await wearablePostingError(e).json()) as { error: string };
    expect((await body(new Error("WEARABLE_LOCKED"))).error).toMatch(/lock/);
    expect((await body(new Error("insert into listings violates something"))).error).toMatch(/Could not complete/);
    expect((await body(new Error("Sign in to continue."))).error).toBe("Sign in to continue.");
    expect(wearablePostingError(new Error("WEARABLE_LOCKED")).status).toBe(422);
    expect(wearablePostingError(new PostingSessionError("UPLOAD_SESSION_EXPIRED")).status).toBe(410);
    expect(wearablePostingError(new Error("x")).headers.get("cache-control")).toBe("private, no-store");
  });
});
