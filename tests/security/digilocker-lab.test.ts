// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const getUser = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getSession } }) }));
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string, o?: { maxAge?: number }) => { if (o?.maxAge === 0) jar.delete(n); else jar.set(n, v); },
  }),
}));

import { GET as labCallback } from "@/app/api/idv/digilocker/lab/callback/route";
import { POST as labStart } from "@/app/api/idv/digilocker/lab/start/route";
import { GET as primaryCallback } from "@/app/api/idv/digilocker/callback/route";
import {
  LAB_CALLBACK_PATH, LAB_REDIRECT_URI, LAB_RESULT_COOKIE, LAB_STATE_COOKIE, consumeLabResult, isDigiLockerLabEnabled,
  isLabAuthorizeUrl, openLabResult, sanitizeLabResult, sealLabResult, type LabView,
} from "@/lib/idv/digilocker-lab";
import { NextRequest } from "next/server";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LabResultView } from "@/components/account/DigiLockerLabPanel";

const STATE = "d".repeat(64);
const KEY = "k".repeat(48);
const TEST_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
const ORIGIN = "https://fairswap-web-git-staging-fairswap.vercel.app";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const B64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (sub: string, sid: string) => `${B64({ alg: "HS256" })}.${B64({ sub, session_id: sid })}.sig`;
const BIND = { userId: "u1", sessionId: "s1" };
const signedIn = (user = "u1", sid = "s1") => {
  getUser.mockResolvedValue({ data: { user: { id: user } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: token(user, sid) } } });
};
const AUTH_URL = (over: Record<string, string> = {}) => {
  const u = new URL("https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize");
  const p: Record<string, string> = {
    response_type: "code", state: STATE, scope: "avs", code_challenge_method: "S256", code_challenge: "x", redirect_uri: LAB_REDIRECT_URI, ...over,
  };
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  return u.toString();
};
const startReq = (origin = ORIGIN) =>
  new Request(`${ORIGIN}/api/idv/digilocker/lab/start`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "{}" });
const cb = (qs: string, cookie?: string) => new NextRequest(`${ORIGIN}${LAB_CALLBACK_PATH}?${qs}`, cookie ? { headers: { cookie } } : undefined);
const labCookie = (state = STATE) => `${LAB_STATE_COOKIE}=${hash(state)}`;
const edge = (body: unknown, status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
const SENTINEL = "SENTINEL-sub-9f3a-Ravi-Kumar-01011990-XXXX1234";

const RESULT: LabView = {
  outcome: "VERIFIED", errorCode: null, httpStatusBucket: "2xx",
  tokenResponseFields: [{ name: "access_token", type: "string" }, { name: "id_token", type: "string" }],
  idTokenClaims: [{ name: "acr", type: "string" }, { name: "sub", type: "string" }],
  checks: { signature: "verified", issuer: "verified", audience: "verified", expiry: "verified", issuedAt: "verified", nonce: "match", acr: "aadhaar" },
  presence: { digilockerid: "present", eaadhaar: "absent", masked_aadhaar: "present", name: "invalid", dob: "null", gender: "empty" },
};
const OK = { success: true, flow: "lab", result: RESULT };
const rawResultCookie = (r: Response) => {
  const raw = r.headers.getSetCookie().find((c) => c.startsWith(`${LAB_RESULT_COOKIE}=`));
  return raw ? decodeURIComponent(raw.split(";")[0].slice(LAB_RESULT_COOKIE.length + 1)) : undefined;
};

beforeEach(() => {
  vi.restoreAllMocks(); getUser.mockReset(); getSession.mockReset(); jar.clear();
  process.env.DIGILOCKER_LAB_RESULT_KEY = KEY;
  process.env.FAIRSWAP_DIGILOCKER_LAB_ENABLED = "true";
  process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.SUPABASE_FUNCTIONS_URL;
  delete process.env.VERCEL_ENV;
});

describe("Lab enablement (Test environment lock)", () => {
  const base = { FAIRSWAP_DIGILOCKER_LAB_ENABLED: "true", DIGILOCKER_LAB_RESULT_KEY: KEY, NEXT_PUBLIC_SUPABASE_URL: TEST_URL };
  it("is default OFF, never Production, never a non-Test project, never without a key", () => {
    expect(isDigiLockerLabEnabled({ NEXT_PUBLIC_SUPABASE_URL: TEST_URL })).toBe(false);
    expect(isDigiLockerLabEnabled({ ...base, VERCEL_ENV: "production" })).toBe(false);
    expect(isDigiLockerLabEnabled({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://kriuhwppxgxsyyrbjsau.supabase.co" })).toBe(false);
    expect(isDigiLockerLabEnabled({ ...base, DIGILOCKER_LAB_RESULT_KEY: "short" })).toBe(false);
    expect(isDigiLockerLabEnabled({ ...base, VERCEL_ENV: "preview" })).toBe(true);
  });
  it("the existing diagnostic flag does not enable the Lab", () => {
    expect(isDigiLockerLabEnabled({ FAIRSWAP_DIGILOCKER_DIAG_ENABLED: "true", DIGILOCKER_DIAG_RESULT_KEY: KEY, NEXT_PUBLIC_SUPABASE_URL: TEST_URL })).toBe(false);
  });
});

describe("Lab start", () => {
  it("disabled is 404 and cross-origin is 403, with no Backend call", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch");
    process.env.FAIRSWAP_DIGILOCKER_LAB_ENABLED = "false";
    expect((await labStart(startReq())).status).toBe(404);
    process.env.FAIRSWAP_DIGILOCKER_LAB_ENABLED = "true";
    expect((await labStart(startReq("https://evil.example"))).status).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });
  it("unauthenticated is 401 without a Backend call", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const f = vi.spyOn(globalThis, "fetch");
    expect((await labStart(startReq())).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it("sends exactly {action:start, flow:lab} and binds the browser with only sha256(state)", async () => {
    signedIn();
    const f = edge({ success: true, flow: "lab", redirectUrl: AUTH_URL() });
    const res = await labStart(startReq());
    expect(res.status).toBe(200);
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "start", flow: "lab" });
    const set = res.headers.getSetCookie().find((c) => c.startsWith(`${LAB_STATE_COOKIE}=`))!;
    expect(set).toContain(hash(STATE));
    expect(set).not.toContain(STATE + ";");
    expect(set).toMatch(/HttpOnly/i);
  });
  it("rejects an old-diagnostic-shaped response (no flow) and a wrong redirect_uri, and extra fields", async () => {
    signedIn();
    edge({ success: true, redirectUrl: AUTH_URL() });
    expect((await labStart(startReq())).status).toBe(502);
    edge({ success: true, flow: "lab", redirectUrl: AUTH_URL({ redirect_uri: `${ORIGIN}/api/idv/digilocker/callback` }) });
    const wrong = await labStart(startReq());
    expect(wrong.status).toBe(502);
    expect(wrong.headers.getSetCookie().some((c) => c.startsWith(`${LAB_STATE_COOKIE}=${hash(STATE)}`))).toBe(false);
    edge({ success: true, flow: "lab", redirectUrl: AUTH_URL(), extra: 1 });
    expect((await labStart(startReq())).status).toBe(502);
  });
  it("authorize URL validation is exact", () => {
    expect(isLabAuthorizeUrl(AUTH_URL())).toBe(true);
    const bads: Record<string, string>[] = [{ scope: "openid" }, { scope: "openid avs" }, { scope: "avs_parent" }, { acr: "aadhaar" }, { nonce: "unexpected-oidc-nonce" }, { code_challenge_method: "plain" }, { response_type: "token" }, { state: "short" }];
    for (const bad of bads) expect(isLabAuthorizeUrl(AUTH_URL(bad))).toBe(false);
    expect(isLabAuthorizeUrl(AUTH_URL().replace("digilocker.meripehchaan.gov.in", "evil.example"))).toBe(false);
  });
});

describe("Lab callback", () => {
  it("is disabled-404 when off", async () => {
    signedIn();
    process.env.FAIRSWAP_DIGILOCKER_LAB_ENABLED = "false";
    expect((await labCallback(cb(`code=abc&state=${STATE}`, labCookie()))).status).toBe(404);
  });
  it("query alone is never proof: no cookie, wrong state, or no session means no Backend call", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    signedIn();
    const noCookie = await labCallback(cb(`code=abc&state=${STATE}`));
    expect(noCookie.status).toBe(303);
    expect(noCookie.headers.get("location")).toContain("/account/verification/digilocker-lab");
    expect(openLabResult(rawResultCookie(noCookie), BIND)?.errorCode).toBe("STATE_INVALID");
    const wrongState = await labCallback(cb(`code=abc&state=${"e".repeat(64)}`, labCookie()));
    expect(openLabResult(rawResultCookie(wrongState), BIND)?.errorCode).toBe("STATE_INVALID");
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const anon = await labCallback(cb(`code=abc&state=${STATE}`, labCookie()));
    expect(anon.headers.get("location")).toContain("/auth/sign-in");
    expect(f).not.toHaveBeenCalled();
  });
  it("forwards only the strict complete request and relays only the sanitized result, once", async () => {
    signedIn();
    const f = edge(OK);
    const res = await labCallback(cb(`code=abc&state=${STATE}&junk=${SENTINEL}`, labCookie()));
    expect(res.status).toBe(303);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ action: "complete", flow: "lab", state: STATE, code: "abc" });
    const sealed = rawResultCookie(res)!;
    expect(sealed).not.toContain("access_token");
    expect(openLabResult(sealed, BIND)).toEqual(RESULT);
    jar.set(LAB_RESULT_COOKIE, sealed);
    expect(await consumeLabResult()).toEqual(RESULT);
    expect(jar.has(LAB_RESULT_COOKIE)).toBe(false);
    expect(await consumeLabResult()).toBeNull();
  });
  it("unknown provider errors fail closed instead of masquerading as consent denial; text stays redacted", async () => {
    signedIn();
    const f = edge(OK);
    await labCallback(cb(`error=${encodeURIComponent(SENTINEL)}&error_description=${SENTINEL}&state=${STATE}`, labCookie()));
    const body = String((f.mock.calls[0][1] as RequestInit).body);
    expect(JSON.parse(body)).toEqual({ action: "complete", flow: "lab", state: STATE, error: "server_error" });
    expect(body).not.toContain("SENTINEL");
  });
  it("rejects both code and error, an oversized code, and a replayed state at the Backend", async () => {
    signedIn();
    const f = vi.spyOn(globalThis, "fetch");
    const both = await labCallback(cb(`code=a&error=access_denied&state=${STATE}`, labCookie()));
    expect(openLabResult(rawResultCookie(both), BIND)?.errorCode).toBe("INVALID_CALLBACK");
    const big = await labCallback(cb(`code=${"a".repeat(2049)}&state=${STATE}`, labCookie()));
    expect(openLabResult(rawResultCookie(big), BIND)?.errorCode).toBe("INVALID_CALLBACK");
    expect(f).not.toHaveBeenCalled();
    edge({ success: false, flow: "lab", error: "STATE_ALREADY_USED" }, 409);
    const replay = await labCallback(cb(`code=abc&state=${STATE}`, labCookie()));
    expect(openLabResult(rawResultCookie(replay), BIND)?.errorCode).toBe("STATE_ALREADY_USED");
  });
  it("fails closed on contract violations: extra fields, raw tokens, PII, missing flow, unknown error", async () => {
    signedIn();
    for (const bad of [
      { ...OK, result: { ...RESULT, id_token: SENTINEL } },
      { ...OK, result: { ...RESULT, presence: { ...RESULT.presence, name: SENTINEL } } },
      { ...OK, result: { ...RESULT, tokenResponseFields: [{ name: "access_token", type: "string", value: SENTINEL }] } },
      { ...OK, raw: { access_token: SENTINEL } },
      { success: true, result: RESULT },
      { success: false, flow: "lab", error: SENTINEL },
    ]) {
      edge(bad);
      const res = await labCallback(cb(`code=abc&state=${STATE}`, labCookie()));
      const sealed = rawResultCookie(res)!;
      expect(sealed).not.toContain("SENTINEL");
      expect(["INVALID_CONTRACT", "START_FAILED"]).toContain(openLabResult(sealed, BIND)?.errorCode);
    }
  });
  it("Backend unavailable is a sanitized failure", async () => {
    signedIn();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(SENTINEL));
    const res = await labCallback(cb(`code=abc&state=${STATE}`, labCookie()));
    expect(openLabResult(rawResultCookie(res), BIND)?.errorCode).toBe("EDGE_FUNCTION_UNAVAILABLE");
  });
});

describe("Lab isolation from the primary callback", () => {
  it("the primary callback ignores the Lab cookie and never calls the diagnostic/Lab path", async () => {
    signedIn();
    const f = edge({});
    const res = await primaryCallback(cb(`code=abc&state=${STATE}`, labCookie()) as NextRequest);
    expect(res.headers.get(`set-cookie`)?.includes(LAB_RESULT_COOKIE) ?? false).toBe(false);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => !u.endsWith("/idv-digilocker-diagnostic"))).toBe(true);
  });
  it("Lab source never touches badge, binding, gate or primary credential code", () => {
    const src = ["src/lib/idv/digilocker-lab.ts", "src/components/account/DigiLockerLabPanel.tsx", "src/app/account/verification/digilocker-lab/page.tsx"]
      .map((p) => readFileSync(p, "utf8")).join("\n");
    expect(src).not.toMatch(/digilocker-badge|gate-server|user_identity_verifications|idv_digilocker_bindings|DIGILOCKER_CLIENT_SECRET|NEXT_PUBLIC_DIGILOCKER/);
  });
});

describe("Sealing and display", () => {
  it("is bound to user, session and expiry and tamper-evident", () => {
    const sealed = sealLabResult(RESULT, BIND, 1_000_000)!;
    expect(openLabResult(sealed, BIND, 1_000_000)).toEqual(RESULT);
    expect(openLabResult(sealed, { userId: "u2", sessionId: "s1" }, 1_000_000)).toBeNull();
    expect(openLabResult(sealed, { userId: "u1", sessionId: "s2" }, 1_000_000)).toBeNull();
    expect(openLabResult(sealed, BIND, 1_000_000 + 61_000)).toBeNull();
    expect(openLabResult(sealed.slice(0, -2) + "AA", BIND, 1_000_000)).toBeNull();
    expect(sanitizeLabResult({ ...RESULT, sub: SENTINEL }).errorCode).toBe("INVALID_RESULT");
  });
  it("renders names, types and verdicts only: no values, tokens, JSON or copy/download controls", () => {
    const html = renderToStaticMarkup(createElement(LabResultView, { result: RESULT, onClear: () => {} }));
    expect(html).toContain("access_token");
    expect(html).toContain("present but invalid");
    expect(html).toContain("present but null");
    expect(html).toContain("present but empty");
    expect(html).not.toMatch(/<pre|<code|download|clipboard|Bearer|eyJ/i);
    const failed = renderToStaticMarkup(createElement(LabResultView, { result: sanitizeLabResult({ bad: SENTINEL }), onClear: () => {} }));
    expect(failed).not.toContain("SENTINEL");
    expect(failed).toContain("did not match the expected format");
  });
});
