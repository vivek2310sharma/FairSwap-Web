// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const getUser = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getSession } }) }));

import { GET as callback } from "@/app/api/idv/digilocker/callback/route";
import { POST as diagStart } from "@/app/api/idv/digilocker/diagnostic/start/route";
import {
  DIAG_RESULT_COOKIE, DIAG_STATE_COOKIE, isDigiLockerDiagEnabled, isDiagAuthorizeUrl, readDiagResultCookie, sanitizeDiagResult,
} from "@/lib/idv/digilocker-diagnostic";
import { NextRequest } from "next/server";

const STATE = "c".repeat(64);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const AUTH_URL = `https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?response_type=code&state=${STATE}&scope=openid&acr=aadhaar&code_challenge_method=S256&code_challenge=x`;
const ORIGIN = "https://fairswap-web-git-staging-fairswap.vercel.app";
const signedIn = () => {
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: "jwt" } } });
};
const startReq = (origin = ORIGIN) =>
  new Request(`${ORIGIN}/api/idv/digilocker/diagnostic/start`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "{}" });
const cb = (qs: string, cookie?: string) =>
  new NextRequest(`${ORIGIN}/api/idv/digilocker/callback?${qs}`, cookie ? { headers: { cookie } } : undefined);
const diagCookie = (state = STATE) => `${DIAG_STATE_COOKIE}=${hash(state)}`;
const edge = (body: unknown, status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
const VERIFIED = {
  outcome: "VERIFIED", code: null, endpoints: { authorize: "1", token: "2" },
  checks: { signature: "verified", issuer: "verified", audience: true, expiry: true, nonce: "match", acr: "aadhaar" },
};
const resultCookie = (r: Response) => {
  const raw = r.headers.getSetCookie().find((c) => c.startsWith(`${DIAG_RESULT_COOKIE}=`));
  return raw ? readDiagResultCookie(decodeURIComponent(raw.split(";")[0].slice(DIAG_RESULT_COOKIE.length + 1))) : null;
};

beforeEach(() => {
  vi.restoreAllMocks(); getUser.mockReset(); getSession.mockReset();
  process.env.FAIRSWAP_DIGILOCKER_DIAG_ENABLED = "true";
  process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.SUPABASE_FUNCTIONS_URL;
  delete process.env.VERCEL_ENV;
});

describe("DigiLocker diagnostic gate", () => {
  it("is default OFF, never on Vercel Production, never against a non-Test project", () => {
    expect(isDigiLockerDiagEnabled({ NEXT_PUBLIC_SUPABASE_URL: "https://wpppxlnbzqynvhpeuavd.supabase.co" })).toBe(false);
    expect(isDigiLockerDiagEnabled({ FAIRSWAP_DIGILOCKER_DIAG_ENABLED: "true", VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://wpppxlnbzqynvhpeuavd.supabase.co" })).toBe(false);
    expect(isDigiLockerDiagEnabled({ FAIRSWAP_DIGILOCKER_DIAG_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://kriuhwppxgxsyyrbjsau.supabase.co" })).toBe(false);
    expect(isDigiLockerDiagEnabled({ FAIRSWAP_DIGILOCKER_DIAG_ENABLED: "true", VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://wpppxlnbzqynvhpeuavd.supabase.co" })).toBe(true);
  });

  it("start: disabled is 404 without any backend call; cross-origin is 403", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch");
    process.env.FAIRSWAP_DIGILOCKER_DIAG_ENABLED = "false";
    expect((await diagStart(startReq())).status).toBe(404);
    process.env.FAIRSWAP_DIGILOCKER_DIAG_ENABLED = "true";
    expect((await diagStart(startReq("https://evil.example"))).status).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });

  it("start: unauthenticated is 401 and a non-tester gets the Backend 403", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: {} });
    const f = vi.spyOn(globalThis, "fetch");
    expect((await diagStart(startReq())).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
    signedIn();
    edge({ error: "FORBIDDEN" }, 403);
    const r = await diagStart(startReq());
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("start: binds sha256(state) in an HttpOnly Secure SameSite=Lax __Host- cookie; state itself is not stored", async () => {
    signedIn();
    const f = edge({ success: true, redirectUrl: AUTH_URL });
    const r = await diagStart(startReq());
    expect(r.status).toBe(200);
    expect(String(f.mock.calls[0][0])).toMatch(/\/functions\/v1\/idv-digilocker-diagnostic$/);
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "start" });
    const c = r.headers.getSetCookie().find((x) => x.startsWith(DIAG_STATE_COOKIE))!;
    expect(c).toContain(`${DIAG_STATE_COOKIE}=${hash(STATE)}`);
    expect(c).not.toContain(STATE + ";");
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/Secure/i);
    expect(c).toMatch(/SameSite=lax/i);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/Max-Age=300/);
  });

  it("start: rejects any redirect that is not a DigiLocker openid + acr=aadhaar + S256 authorize URL", async () => {
    for (const bad of [
      "https://evil.example/public/oauth2/1/authorize",
      AUTH_URL.replace("acr=aadhaar", "acr=mobile"),
      AUTH_URL.replace("scope=openid", "scope=x"),
      AUTH_URL.replace("/1/authorize", "/3/authorize"),
      AUTH_URL.replace("S256", "plain"),
    ]) expect(isDiagAuthorizeUrl(bad)).toBe(false);
    expect(isDiagAuthorizeUrl(AUTH_URL)).toBe(true);
    expect(isDiagAuthorizeUrl(AUTH_URL.replace("/1/authorize", "/2/authorize"))).toBe(true);
    signedIn();
    edge({ success: true, redirectUrl: "https://evil.example/" });
    expect((await diagStart(startReq())).status).toBe(502);
  });
});

describe("Shared callback routing", () => {
  it("diagnostic cookie + matching state: relays to the diagnostic function only, sets a sanitized result, clears the state cookie", async () => {
    signedIn();
    const f = edge({ success: true, result: { ...VERIFIED, aadhaar: "999999990019", id_token: "eyJ.secret", raw: { pan: "ABCDE1234F" } } });
    const r = await callback(cb(`state=${STATE}&code=secret-code`, diagCookie()));
    expect(r.status).toBe(303);
    const loc = r.headers.get("location")!;
    expect(new URL(loc).pathname).toBe("/account/verification/digilocker-diagnostic");
    expect(loc).not.toContain("secret-code");
    expect(loc).not.toContain(STATE);
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toMatch(/idv-digilocker-diagnostic$/);
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "complete", state: STATE, code: "secret-code" });
    expect(resultCookie(r)).toEqual(VERIFIED);
    const all = r.headers.getSetCookie().join("\n");
    for (const leak of ["999999990019", "ABCDE1234F", "eyJ.secret", "secret-code"]) expect(all).not.toContain(leak);
    expect(r.headers.getSetCookie().find((c) => c.startsWith(`${DIAG_STATE_COOKIE}=`))).toMatch(/Max-Age=0/);
  });

  it("proof of no badge: the diagnostic path never calls the v1 completion that issues a FairSwap badge", async () => {
    signedIn();
    const f = edge({ success: true, result: VERIFIED });
    const r = await callback(cb(`state=${STATE}&code=c`, diagCookie()));
    expect(f.mock.calls.map((c) => String(c[0]))).not.toContainEqual(expect.stringMatching(/idv-digilocker-complete/));
    expect(r.headers.get("location")).not.toContain("dl=verified");
  });

  it("without the diagnostic cookie, or with a cookie for a different state, v1 handling is unchanged", async () => {
    signedIn();
    for (const cookie of [undefined, diagCookie("d".repeat(64)), `${DIAG_STATE_COOKIE}=not-hex`]) {
      vi.mocked(globalThis.fetch).mockRestore?.();
      const f = edge({ success: true });
      const r = await callback(cb(`state=${STATE}&code=c`, cookie));
      expect(String(f.mock.calls[0][0])).toMatch(/idv-digilocker-complete$/);
      expect(r.headers.get("location")).toContain("/account/verification?dl=verified");
    }
  });

  it("diagnostic disabled: a forged diagnostic cookie cannot divert the callback", async () => {
    signedIn();
    process.env.FAIRSWAP_DIGILOCKER_DIAG_ENABLED = "false";
    const f = edge({ success: true });
    await callback(cb(`state=${STATE}&code=c`, diagCookie()));
    expect(String(f.mock.calls[0][0])).toMatch(/idv-digilocker-complete$/);
  });

  it("cancelled login relays only error=denied", async () => {
    signedIn();
    const f = edge({ success: true, result: { outcome: "CANCELLED", code: "CONSENT_DENIED", endpoints: { authorize: "1", token: "2" }, checks: null } });
    const r = await callback(cb(`state=${STATE}&error=access_denied&error_description=raw+provider+text`, diagCookie()));
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "complete", state: STATE, error: "denied" });
    expect(resultCookie(r)).toMatchObject({ outcome: "CANCELLED", code: "CONSENT_DENIED" });
    expect(r.headers.getSetCookie().join("")).not.toContain("raw");
  });

  it("wrong state, replay, expired state and provider rejection map to fixed FAILED codes", async () => {
    signedIn();
    for (const [backend, status, code] of [
      ["ATTEMPT_NOT_FOUND", 404, "STATE_INVALID"],
      ["STATE_ALREADY_USED", 409, "STATE_ALREADY_USED"],
      ["ATTEMPT_EXPIRED", 410, "STATE_EXPIRED"],
      ["FORBIDDEN", 403, "FORBIDDEN"],
      ["<script>", 500, "DIAGNOSTIC_FAILED"],
    ] as const) {
      vi.mocked(globalThis.fetch).mockRestore?.();
      edge({ error: backend }, status);
      const r = await callback(cb(`state=${STATE}&code=c`, diagCookie()));
      expect(resultCookie(r)).toEqual({ outcome: "FAILED", code, endpoints: null, checks: null });
    }
    vi.mocked(globalThis.fetch).mockRestore?.();
    edge({ success: true, result: { outcome: "FAILED", code: "PROVIDER_REJECTED", endpoints: { authorize: "1", token: "2" }, checks: null } });
    expect(resultCookie(await callback(cb(`state=${STATE}&code=c`, diagCookie())))).toMatchObject({ outcome: "FAILED", code: "PROVIDER_REJECTED" });
  });

  it("unauthenticated callback goes to sign-in and never reaches the backend", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: {} });
    const f = vi.spyOn(globalThis, "fetch");
    const r = await callback(cb(`state=${STATE}&code=c`, diagCookie()));
    expect(r.headers.get("location")).toContain("/auth/sign-in?next=%2Faccount%2Fverification%2Fdigilocker-diagnostic");
    expect(f).not.toHaveBeenCalled();
  });

  it("result sanitizer: unknown outcomes, lowercase codes or injected text never render as VERIFIED", () => {
    expect(sanitizeDiagResult({ outcome: "VERIFIED ✓", code: null })).toMatchObject({ outcome: "FAILED", code: "INVALID_RESULT" });
    expect(sanitizeDiagResult({ outcome: "UNCONFIRMED", code: "<b>x</b>" })).toMatchObject({ outcome: "FAILED" });
    expect(readDiagResultCookie("{not json")).toBeNull();
  });
});
