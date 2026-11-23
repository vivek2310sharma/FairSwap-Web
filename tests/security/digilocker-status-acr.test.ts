// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const getSession = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getSession }, rpc }) }));

import { GET } from "@/app/api/idv/status/route";

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const rec = (o: Record<string, unknown> = {}) => ({ status: "verified", badge_issued: true, valid_until: FUTURE, ...o });

function setup(opts: { record?: unknown; access?: unknown; accessThrows?: boolean; edge?: Record<string, unknown> }) {
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: "jwt" } } });
  rpc.mockImplementation(async (fn: string) => {
    if (fn === "get_my_identity_verification") return { data: opts.record ?? null, error: null };
    if (opts.accessThrows) throw new Error("boom");
    return opts.access as { data: unknown; error: unknown };
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(opts.edge ?? { status: "verified" }), { status: 200 }),
  );
}
const call = async () => (await GET()).json();

beforeEach(() => {
  vi.restoreAllMocks();
  [getUser, getSession, rpc].forEach((m) => m.mockReset());
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
  delete process.env.SUPABASE_FUNCTIONS_URL;
});

describe("idv/status authoritative DigiLocker badge", () => {
  it("reports verified + badge for an Aadhaar-assured valid record", async () => {
    setup({ record: rec(), access: { data: { digilocker_verified: true }, error: null } });
    const b = await call();
    expect(b).toMatchObject({ status: "verified", badgeIssued: true });
  });

  it("does not badge a legacy verified record that is not Aadhaar-assured", async () => {
    setup({ record: rec(), access: { data: { digilocker_verified: false }, error: null } });
    const b = await call();
    expect(b.badgeIssued).toBe(false);
    expect(b.status).not.toBe("verified");
  });

  it("keeps revoked status and no badge", async () => {
    setup({ record: rec({ status: "revoked" }), access: { data: { digilocker_verified: true }, error: null } });
    const b = await call();
    expect(b.status).toBe("revoked");
    expect(b.badgeIssued).toBe(false);
  });

  it.each([
    ["rpc error", { data: null, error: { message: "x" } }],
    ["null data", { data: null, error: null }],
    ["malformed string", { data: "true", error: null }],
    ["truthy non-boolean", { data: { digilocker_verified: "true" }, error: null }],
    ["missing field", { data: {}, error: null }],
  ])("fails closed on %s", async (_n, access) => {
    setup({ record: rec(), access });
    const b = await call();
    expect(b.badgeIssued).toBe(false);
    expect(b.status).not.toBe("verified");
  });

  it("fails closed when the access RPC throws", async () => {
    setup({ record: rec(), accessThrows: true });
    const b = await call();
    expect(b.badgeIssued).toBe(false);
    expect(b.status).not.toBe("verified");
  });

  it("ignores forged client-side status fields from the edge payload", async () => {
    setup({
      record: null,
      access: { data: { digilocker_verified: false }, error: null },
      edge: { status: "verified", badgeIssued: true, digilocker_verified: true },
    });
    const b = await call();
    expect(b.badgeIssued).toBe(false);
    expect(b.status).not.toBe("verified");
  });
});
