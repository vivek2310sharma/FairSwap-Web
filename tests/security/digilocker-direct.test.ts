// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getSession } }) }));

import { GET } from "@/app/api/idv/digilocker/callback/route";
import { POST } from "@/app/api/idv/digilocker/start/route";
import { isDigiLockerAuthorizeUrl, resultForBackend } from "@/lib/idv/digilocker";
import { friendlyIdentityError } from "@/lib/idv/gate";
import { NextRequest } from "next/server";

const STATE = "a".repeat(64);
const cb = (qs: string) => new NextRequest(`https://fairswap.in/api/idv/digilocker/callback?${qs}`);
const signedIn = () => { getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null }); getSession.mockResolvedValue({ data: { session: { access_token: "jwt" } } }); };

beforeEach(() => {
  vi.restoreAllMocks(); getUser.mockReset(); getSession.mockReset();
  process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
  delete process.env.SUPABASE_FUNCTIONS_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

describe("DigiLocker callback route", () => {
  it("is closed when the flag is off (no backend call)", async () => {
    process.env.FAIRSWAP_DIGILOCKER_ENABLED = "false";
    const f = vi.spyOn(globalThis, "fetch");
    const r = await GET(cb(`state=${STATE}&code=x`));
    expect(r.headers.get("location")).toContain("dl=unavailable");
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects malformed state/code without contacting the backend", async () => {
    signedIn(); const f = vi.spyOn(globalThis, "fetch");
    for (const qs of ["state=short&code=x", `state=${STATE}`, "", `state=${STATE}&code=${"x".repeat(3000)}`]) {
      expect((await GET(cb(qs))).headers.get("location")).toContain("dl=failed");
    }
    expect(f).not.toHaveBeenCalled();
  });
  it("sends unauthenticated users to sign-in and never calls the backend", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: {} }); const f = vi.spyOn(globalThis, "fetch");
    const r = await GET(cb(`state=${STATE}&code=x`));
    expect(r.headers.get("location")).toContain("/auth/sign-in");
    expect(f).not.toHaveBeenCalled();
  });
  it("relays code+state with the user's bearer, redirects 303 with no code in the URL, no-store", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const r = await GET(cb(`state=${STATE}&code=auth-code`));
    expect(r.status).toBe(303);
    const loc = r.headers.get("location")!;
    expect(loc).toContain("/account/verification?dl=verified");
    expect(loc).not.toContain("auth-code"); expect(loc).not.toContain(STATE);
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://wpppxlnbzqynvhpeuavd.supabase.co/functions/v1/idv-digilocker-complete");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });
  it("sends the publishable key as apikey, falls back to legacy anon key, and keeps the user JWT", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 200 }));
    await GET(cb(`state=${STATE}&code=c`));
    let h = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(h.apikey).toBe("sb_publishable_test"); expect(h.Authorization).toBe("Bearer jwt");
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";
    await GET(cb(`state=${STATE}&code=c`));
    h = (f.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(h.apikey).toBe("legacy_anon");
  });
  it("fails closed without any public key (no backend call)", async () => {
    signedIn(); delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "  ";
    const f = vi.spyOn(globalThis, "fetch");
    expect((await GET(cb(`state=${STATE}&code=c`))).headers.get("location")).toContain("dl=failed");
    expect(f).not.toHaveBeenCalled();
  });
  it("maps backend/provider failures to fixed result keys and never echoes provider text", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch");
    f.mockResolvedValueOnce(new Response(JSON.stringify({ error: "IDENTITY_ALREADY_LINKED", message: "SECRET-DETAIL" }), { status: 409 }));
    expect((await GET(cb(`state=${STATE}&code=c`))).headers.get("location")).toContain("dl=already_linked");
    f.mockResolvedValueOnce(new Response("{}", { status: 504 }));
    expect((await GET(cb(`state=${STATE}&code=c`))).headers.get("location")).toContain("dl=failed");
    f.mockRejectedValueOnce(new Error("boom SECRET"));
    const r = await GET(cb(`state=${STATE}&code=c`));
    expect(r.headers.get("location")).toContain("dl=provider_error"); expect(r.headers.get("location")).not.toContain("SECRET");
    f.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    expect((await GET(cb(`state=${STATE}&error=access_denied&error_description=x`))).headers.get("location")).toBeTruthy();
    expect(JSON.parse((f.mock.calls[3][1] as RequestInit).body as string)).toEqual({ state: STATE, error: "denied" });
  });
});

describe("DigiLocker start route", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("https://fairswap.in/api/idv/digilocker/start", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  it("rejects cross-origin, missing consent and unauthenticated calls", async () => {
    expect((await POST(post({ consentAcknowledged: true }, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(post({}))).status).toBe(400);
    getUser.mockResolvedValue({ data: { user: null }, error: {} });
    expect((await POST(post({ consentAcknowledged: true }))).status).toBe(401);
  });
  it("only returns an authorize URL on the documented MeriPehchaan host/path", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch");
    f.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, redirectUrl: "https://evil.example/public/oauth2/1/authorize" }), { status: 200 }));
    expect((await POST(post({ consentAcknowledged: true }))).status).toBe(502);
    f.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, redirectUrl: "https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?state=s" }), { status: 200 }));
    const ok = await POST(post({ consentAcknowledged: true }));
    expect(ok.status).toBe(200); expect((await ok.json()).redirectUrl).toContain("digilocker.meripehchaan.gov.in");
  });
  it("sends the publishable key as apikey, falls back to legacy anon key, and keeps the user JWT", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ success: true, alreadyVerified: true }), { status: 200 }));
    await POST(post({ consentAcknowledged: true }));
    let h = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(h.apikey).toBe("sb_publishable_test"); expect(h.Authorization).toBe("Bearer jwt");
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";
    await POST(post({ consentAcknowledged: true }));
    h = (f.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(h.apikey).toBe("legacy_anon");
  });
  it("fails closed without any public key (no backend call)", async () => {
    signedIn(); delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const f = vi.spyOn(globalThis, "fetch");
    const r = await POST(post({ consentAcknowledged: true }));
    expect(r.status).toBe(500); expect((await r.json()).error).toBe("CONFIGURATION_ERROR");
    expect(f).not.toHaveBeenCalled();
  });
  it("already-verified users get status with no redirect; disabled flag is 503", async () => {
    signedIn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true, alreadyVerified: true }), { status: 200 }));
    expect(await (await POST(post({ consentAcknowledged: true }))).json()).toEqual({ success: true, alreadyVerified: true });
    process.env.FAIRSWAP_DIGILOCKER_ENABLED = "false";
    expect((await POST(post({ consentAcknowledged: true }))).status).toBe(503);
  });
});

describe("helpers", () => {
  it("authorize URL allow-list", () => {
    expect(isDigiLockerAuthorizeUrl("https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?x=1")).toBe(true);
    for (const bad of ["http://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize", "https://digilocker.meripehchaan.gov.in.evil.com/public/oauth2/1/authorize",
      "https://digilocker.meripehchaan.gov.in/other", "https://u:p@digilocker.meripehchaan.gov.in/public/oauth2/1/authorize", "javascript:alert(1)", "", null]) expect(isDigiLockerAuthorizeUrl(bad)).toBe(false);
  });
  it("result mapping and identity-required message", () => {
    expect(resultForBackend(true, undefined)).toBe("verified");
    expect(resultForBackend(false, "CONSENT_DENIED")).toBe("denied");
    expect(resultForBackend(false, "anything-else")).toBe("failed");
    expect(friendlyIdentityError("IDENTITY_VERIFICATION_REQUIRED")).toMatch(/verify your account/i);
    expect(friendlyIdentityError("other")).toBeNull();
  });
});

describe("actionable 'Verify your account' errors (DB stays the enforcement)", async () => {
  const { needsIdentityVerification, identityErrorResponse, IdentityVerificationRequiredError } = await import("@/lib/idv/gate-server");
  const { isIdentityRequired, IDENTITY_REQUIRED_MESSAGE } = await import("@/lib/idv/gate");
  const pgError = { code: "42501", message: "IDENTITY_VERIFICATION_REQUIRED", details: null, hint: null };

  it("pre-flight is off by default (no RPC round trip)", async () => {
    delete process.env.FAIRSWAP_IDENTITY_GATE_ENABLED;
    const rpc = vi.fn(async () => ({ data: { verification_required: true, identity_verified: false }, error: null }));
    expect(await needsIdentityVerification({ rpc })).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("pre-flight is true only when the gate is on and the user is unverified; fails open otherwise", async () => {
    process.env.FAIRSWAP_IDENTITY_GATE_ENABLED = "true";
    const c = (data: unknown, error: unknown = null) => ({ rpc: async () => ({ data, error }) });
    expect(await needsIdentityVerification(c({ verification_required: true, identity_verified: false }))).toBe(true);
    expect(await needsIdentityVerification(c({ verification_required: true, identity_verified: true }))).toBe(false);
    expect(await needsIdentityVerification(c({ verification_required: false, identity_verified: false }))).toBe(false);
    expect(await needsIdentityVerification(c(null, { message: "down" }))).toBe(false);
    expect(await needsIdentityVerification({ rpc: async () => { throw new Error("x"); } })).toBe(false);
    expect(await needsIdentityVerification({})).toBe(false);
    delete process.env.FAIRSWAP_IDENTITY_GATE_ENABLED;
  });

  it("maps the Backend error (any shape) and the pre-flight error to a 403 with the actionable message", async () => {
    for (const e of [pgError, new Error("IDENTITY_VERIFICATION_REQUIRED"), new IdentityVerificationRequiredError()]) {
      const r = identityErrorResponse(e)!;
      expect(r.status).toBe(403);
      const body = await r.json();
      expect(body).toMatchObject({ code: "IDENTITY_VERIFICATION_REQUIRED", verifyUrl: "/account/verification?required=1" });
      expect(body.error).toBe(IDENTITY_REQUIRED_MESSAGE);
      expect(body.error).toMatch(/verify your account/i);
    }
    expect(identityErrorResponse(new Error("Submission unavailable"))).toBeNull();
    expect(isIdentityRequired({ code: "42501", message: "Upload session unavailable" })).toBe(false);
  });

  it("posting error boundaries return the actionable message instead of the generic one", async () => {
    const { postingError } = await import("@/lib/listings/mobiles/server");
    const { wearablePostingError } = await import("@/lib/listings/wearables/server");
    for (const boundary of [postingError, wearablePostingError]) {
      const r = boundary(new IdentityVerificationRequiredError());
      expect(r.status).toBe(403);
      expect((await r.json()).error).toMatch(/verify your account/i);
      const generic = await boundary(new Error("boom")).json();
      expect(generic.error).not.toMatch(/verify/i);
    }
  });

  it("media contract exposes a 403 IDENTITY_VERIFICATION_REQUIRED code", async () => {
    const { mediaApiError, ERROR_CODE_TO_HTTP_STATUS } = await import("@/lib/media/api-contract");
    expect(ERROR_CODE_TO_HTTP_STATUS.IDENTITY_VERIFICATION_REQUIRED).toBe(403);
    const r = mediaApiError("IDENTITY_VERIFICATION_REQUIRED");
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).toMatch(/verify your account/i);
  });

  it("server actions turn the raw DB message into the actionable one", async () => {
    const { friendlyIdentityError } = await import("@/lib/idv/gate");
    expect(friendlyIdentityError(pgError.message)).toBe(IDENTITY_REQUIRED_MESSAGE);
    expect(friendlyIdentityError("duplicate key")).toBeNull();
  });
});
