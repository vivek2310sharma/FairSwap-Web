// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), remove: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove }) },
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { GET, POST } from "@/app/api/internal/avatar-cleanup/route";

const SECRET = "test-secret-value-1234567890";
const ID_A = "123e4567-e89b-42d3-a456-426614174000";
const ID_B = "223e4567-e89b-42d3-a456-426614174001";

function req(auth?: string, method = "POST"): Request {
  return new Request("http://localhost/api/internal/avatar-cleanup", {
    method,
    headers: auth ? { authorization: auth } : {},
  });
}

function claim(items: Array<{ id: string; path: string; bucket?: string }>) {
  return {
    data: { success: true, items: items.map((i) => ({ bucket: "avatars", ...i })) },
    error: null,
  };
}

describe("avatar cleanup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AVATAR_CLEANUP_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.AVATAR_CLEANUP_SECRET;
    delete process.env.CRON_SECRET;
  });

  it("accepts Vercel Cron's CRON_SECRET bearer on GET, and rejects it when unset or short", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true, items: [] }, error: null });
    delete process.env.AVATAR_CLEANUP_SECRET;
    process.env.CRON_SECRET = "cron-secret-value-1234567890";
    expect((await GET(req("Bearer cron-secret-value-1234567890", "GET"))).status).toBe(200);
    expect((await GET(req(`Bearer ${SECRET}`, "GET"))).status).toBe(401);
    process.env.CRON_SECRET = "short";
    expect((await GET(req("Bearer short", "GET"))).status).toBe(401);
  });

  it("rejects missing, wrong and malformed credentials without touching storage", async () => {
    for (const header of [undefined, "Bearer wrong-secret-value-1234567890", "Basic abc", `Bearer ${SECRET}x`]) {
      const res = await POST(req(header));
      expect(res.status).toBe(401);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("fails closed when the secret is not configured or too short", async () => {
    delete process.env.AVATAR_CLEANUP_SECRET;
    expect((await POST(req("Bearer undefined"))).status).toBe(401);
    process.env.AVATAR_CLEANUP_SECRET = "short";
    expect((await POST(req("Bearer short"))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("claims, deletes and completes queued objects", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "service_claim_avatar_cleanup") {
        return claim([{ id: ID_A, path: `${ID_A}/aaaaaaaa.webp` }, { id: ID_B, path: `${ID_B}/bbbbbbbb.webp` }]);
      }
      return { data: { success: true }, error: null };
    });
    mocks.remove.mockResolvedValue({ data: [], error: null });

    const res = await POST(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, claimed: 2, deleted: 2, failed: 0 });
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith("service_complete_avatar_cleanup", { p_ids: [ID_A, ID_B] });
  });

  it("is idempotent: an already-missing object and an empty queue are both fine", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "service_claim_avatar_cleanup"
        ? claim([{ id: ID_A, path: `${ID_A}/aaaaaaaa.webp` }])
        : { data: { success: true }, error: null }
    );
    mocks.remove.mockResolvedValue({ data: [], error: null }); // storage returns no error for missing keys
    expect((await (await GET(req(`Bearer ${SECRET}`, "GET"))).json()).deleted).toBe(1);

    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue(claim([]));
    const empty = await POST(req(`Bearer ${SECRET}`));
    expect(await empty.json()).toMatchObject({ ok: true, claimed: 0, deleted: 0 });
  });

  it("reports a per-item storage failure without completing it or leaking details", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "service_claim_avatar_cleanup"
        ? claim([{ id: ID_A, path: `${ID_A}/aaaaaaaa.webp` }, { id: ID_B, path: `${ID_B}/bbbbbbbb.webp` }])
        : { data: { success: true }, error: null }
    );
    mocks.remove
      .mockResolvedValueOnce({ data: null, error: { message: `boom https://x/${ID_A}/aaaaaaaa.webp` } })
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await POST(req(`Bearer ${SECRET}`));
    expect(await res.json()).toMatchObject({ ok: true, claimed: 2, deleted: 1, failed: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith("service_fail_avatar_cleanup", {
      p_id: ID_A,
      p_error: "STORAGE_REMOVE_FAILED",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("service_complete_avatar_cleanup", { p_ids: [ID_B] });
  });

  it("refuses to delete from any bucket other than avatars", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "service_claim_avatar_cleanup"
        ? claim([{ id: ID_A, path: "x/y.webp", bucket: "listing-originals" }])
        : { data: { success: true }, error: null }
    );
    const res = await POST(req(`Bearer ${SECRET}`));
    expect(await res.json()).toMatchObject({ failed: 1, deleted: 0 });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("returns 500 when claiming is rejected", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: "FORBIDDEN" }, error: null });
    expect((await POST(req(`Bearer ${SECRET}`))).status).toBe(500);
  });
});
