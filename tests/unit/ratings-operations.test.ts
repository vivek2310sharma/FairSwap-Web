// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({ rpc }) }));
import { GET } from "@/app/api/internal/ratings-monitor/route";
import { ratingsMonitorEnvironment } from "@/lib/monitoring/ratings-operations";
const token = "00000000-0000-4000-8000-000000000001";
const secret = "x".repeat(32);
const request = (auth = `Bearer ${secret}`) => new Request("https://example.invalid/api/internal/ratings-monitor", { headers: { authorization: auth } });
describe("Ratings operations monitoring", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", secret); vi.stubEnv("RATINGS_OPERATIONS_ENVIRONMENT", "FairSwapTest");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wpppxlnbzqynvhpeuavd.supabase.co");
    vi.stubEnv("OPERATIONS_ALERT_WEBHOOK_URL", "https://alerts.example.invalid");
    rpc.mockReset(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("rejects unauthorized callers before privileged access and never caches", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401); expect(response.headers.get("cache-control")).toContain("no-store"); expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("CRON_SECRET", ""); expect((await GET(request())).status).toBe(401);
  });
  it("rejects environment confusion and accepts each exact project mapping", () => {
    expect(ratingsMonitorEnvironment()).toBe("FairSwapTest");
    vi.stubEnv("RATINGS_OPERATIONS_ENVIRONMENT", "FairSwapProd"); expect(() => ratingsMonitorEnvironment()).toThrow();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://kriuhwppxgxsyyrbjsau.supabase.co"); expect(ratingsMonitorEnvironment()).toBe("FairSwapProd");
  });
  it("stays quiet without new claims", async () => {
    rpc.mockResolvedValue({ data: [], error: null }); expect((await GET(request())).status).toBe(200); expect(fetch).not.toHaveBeenCalled();
  });
  it("sends aggregate codes without lease tokens and acknowledges only after delivery", async () => {
    rpc.mockResolvedValueOnce({ data: [{ code: "cron_failed", token }], error: null }).mockResolvedValueOnce({ data: true, error: null });
    expect((await GET(request())).status).toBe(200);
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(options.body).toContain("cron_failed"); expect(options.body).toContain("Vivek-Kumar"); expect(options.body).not.toContain(token);
    expect(options.redirect).toBe("error"); expect(rpc).toHaveBeenLastCalledWith("ratings_operations_ack", { code: "cron_failed", token });
  });
  it.each(["delivery", "configuration", "credential-url", "invalid-payload", "database", "ack", "timeout"])("fails closed on %s without consuming undelivered claims", async (failure) => {
    rpc.mockResolvedValueOnce({ data: failure === "invalid-payload" ? [{ code: "user-content", token }] : [{ code: "cron_failed", token }], error: failure === "database" ? {} : null });
    if (failure === "configuration") vi.stubEnv("OPERATIONS_ALERT_WEBHOOK_URL", "");
    if (failure === "credential-url") vi.stubEnv("OPERATIONS_ALERT_WEBHOOK_URL", "https://user:secret@alerts.example.invalid");
    if (failure === "delivery") vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);
    if (failure === "timeout") vi.mocked(fetch).mockRejectedValue(Object.assign(new Error(), { name: "AbortError" }));
    if (failure === "ack") rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await GET(request())).status).toBe(503);
    expect(rpc.mock.calls.filter(c => c[0] === "ratings_operations_ack")).toHaveLength(failure === "ack" ? 1 : 0);
  });
});
