import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS, getEdgeFunctionsBaseUrl, getSupabasePublicApiKey } from "@/lib/idv/server-helpers";
import { DIGILOCKER_AUTHORIZE_ORIGIN, STATE_PATTERN } from "@/lib/idv/digilocker";

// STAGE-ONLY DigiLocker OIDC v2 diagnostic. It never issues or displays a FairSwap verification badge.
// Authorization (allowlisted testers), one-time state, token validation and the Test-project lock are enforced in
// the Backend Edge function; this module only gates exposure, binds the flow to this browser and relays.

export const DIAG_PAGE_PATH = "/account/verification/digilocker-diagnostic";
export const DIAG_STATE_COOKIE = "__Host-fs_dl_diag";
export const DIAG_RESULT_COOKIE = "__Host-fs_dl_diag_result";
const DIAG_STATE_TTL_S = 300;
const DIAG_RESULT_TTL_S = 60;
const TEST_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
const MIN_RESULT_KEY_LENGTH = 32;

function resultKey(env: Record<string, string | undefined> = process.env): string | null {
  const k = (env.DIGILOCKER_DIAG_RESULT_KEY ?? "").trim();
  return k.length >= MIN_RESULT_KEY_LENGTH ? k : null;
}

/** Default OFF. Never on a Vercel Production deployment, only when this deployment targets FairSwapTest, and only
 *  with a server-only result-signing key configured (no key: closed, so results can never be shown unsigned). */
export function isDigiLockerDiagEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.FAIRSWAP_DIGILOCKER_DIAG_ENABLED !== "true") return false;
  if (env.VERCEL_ENV === "production") return false;
  if (!resultKey(env)) return false;
  return env.NEXT_PUBLIC_SUPABASE_URL === TEST_SUPABASE_URL;
}

export function isDiagAuthorizeUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.origin === DIGILOCKER_AUTHORIZE_ORIGIN && !u.username && !u.password &&
      /^\/public\/oauth2\/[12]\/authorize$/.test(u.pathname) &&
      STATE_PATTERN.test(u.searchParams.get("state") ?? "") &&
      u.searchParams.get("scope") === "openid" && u.searchParams.get("acr") === "aadhaar" &&
      u.searchParams.get("code_challenge_method") === "S256";
  } catch {
    return false;
  }
}

const tri = z.enum(["verified", "unconfirmed", "failed"]);
const resultSchema = z.object({
  outcome: z.enum(["VERIFIED", "UNCONFIRMED", "NOT_VERIFIED", "CANCELLED", "FAILED"]),
  code: z.string().regex(/^[A-Z_]{1,40}$/).nullable(),
  endpoints: z.object({ authorize: z.enum(["1", "2"]), token: z.literal("2") }).nullable().optional(),
  checks: z.object({
    signature: tri, issuer: tri, audience: z.boolean(), expiry: z.boolean(), subject: z.boolean(), issuedAt: z.boolean(),
    nonce: z.enum(["match", "absent", "mismatch"]), acr: z.enum(["aadhaar", "missing", "other"]),
  }).strip().nullable().optional(),
  // Claim NAMES only (never values); lets the owner see which assurance evidence the provider sends.
  claimNames: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,31}$/)).max(40).nullable().optional(),
}).strip();
export type DiagView = z.infer<typeof resultSchema>;

/** Allowlist parse: anything unexpected becomes a generic failure, never echoed. */
export function sanitizeDiagResult(raw: unknown): DiagView {
  const p = resultSchema.safeParse(raw);
  return p.success ? p.data : { outcome: "FAILED", code: "INVALID_RESULT", endpoints: null, checks: null };
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

/** Authenticated caller: verified user id (getUser) plus the Supabase session id of the same access token. */
export interface DiagBinding { token: string; userId: string; sessionId: string }

async function currentBinding(): Promise<DiagBinding | null> {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return null;
  let claims: { sub?: unknown; session_id?: unknown };
  try { claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")); } catch { return null; }
  if (claims.sub !== userData.user.id || typeof claims.session_id !== "string" || !claims.session_id) return null;
  return { token, userId: userData.user.id, sessionId: claims.session_id };
}

// ---- Result cookie: HMAC-SHA256 sealed, bound to user + session, 60 s, single read (deleted when consumed). ----
const resultPayloadSchema = z.object({
  v: z.literal(1), u: z.string().min(1), s: z.string().min(1), exp: z.number().int(), jti: z.string().regex(/^[0-9a-f]{32}$/), r: z.unknown(),
}).strict();
const mac = (key: string, payload: string) => createHmac("sha256", key).update(`fs:dl:diag:result:v1.${payload}`).digest("base64url");

export function sealDiagResult(view: DiagView, bind: Pick<DiagBinding, "userId" | "sessionId">, nowMs = Date.now()): string | null {
  const key = resultKey();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({
    v: 1, u: bind.userId, s: bind.sessionId, exp: Math.floor(nowMs / 1000) + DIAG_RESULT_TTL_S,
    jti: randomBytes(16).toString("hex"), r: view,
  })).toString("base64url");
  return `${payload}.${mac(key, payload)}`;
}

/** Returns the result only if untampered, unexpired and issued to this exact user and session; otherwise null. */
export function openDiagResult(value: string | undefined, bind: Pick<DiagBinding, "userId" | "sessionId">, nowMs = Date.now()): DiagView | null {
  const key = resultKey();
  if (!key || !value || value.length > 4096) return null;
  const [payload, sig, extra] = value.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(mac(key, payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let parsed: z.infer<typeof resultPayloadSchema>;
  try {
    const p = resultPayloadSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!p.success) return null;
    parsed = p.data;
  } catch {
    return null;
  }
  const now = Math.floor(nowMs / 1000);
  if (parsed.u !== bind.userId || parsed.s !== bind.sessionId) return null;
  if (parsed.exp <= now || parsed.exp > now + DIAG_RESULT_TTL_S) return null;
  return sanitizeDiagResult(parsed.r);
}

/** Server Action helper: reads, verifies and always deletes the result cookie, so a result renders at most once. */
export async function consumeDiagResult(): Promise<DiagView | null> {
  if (!isDigiLockerDiagEnabled()) return null;
  const jar = await cookies();
  const value = jar.get(DIAG_RESULT_COOKIE)?.value;
  if (!value) return null;
  jar.set(DIAG_RESULT_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  const bind = await currentBinding();
  return bind ? openDiagResult(value, bind) : null;
}

async function callEdge(token: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> } | null> {
  let base: string;
  try { base = getEdgeFunctionsBaseUrl(); } catch { return null; }
  const apikey = getSupabasePublicApiKey();
  if (!apikey) return null;
  try {
    const res = await fetch(`${base}/idv-digilocker-diagnostic`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, data: data && typeof data === "object" ? data : {} };
  } catch {
    return null;
  }
}

const START_ERRORS = new Set(["UNAUTHORIZED", "FORBIDDEN", "RATE_LIMIT_EXCEEDED", "NOT_FOUND"]);

/** POST /api/idv/digilocker/diagnostic/start. Caller has already passed the same-origin check. */
export async function startDiagnostic(): Promise<NextResponse> {
  if (!isDigiLockerDiagEnabled()) return json({ error: "NOT_FOUND" }, 404);
  const bind = await currentBinding();
  if (!bind) return json({ error: "UNAUTHORIZED" }, 401);
  const r = await callEdge(bind.token, { action: "start" });
  if (!r) return json({ error: "EDGE_FUNCTION_UNAVAILABLE" }, 502);
  if (r.status !== 200) {
    const e = typeof r.data.error === "string" && START_ERRORS.has(r.data.error) ? r.data.error : "START_FAILED";
    return json({ error: e }, r.status >= 400 && r.status < 600 ? r.status : 502);
  }
  if (!isDiagAuthorizeUrl(r.data.redirectUrl)) return json({ error: "INVALID_PROVIDER_REDIRECT" }, 502);
  const state = new URL(r.data.redirectUrl).searchParams.get("state")!;
  const res = json({ success: true, redirectUrl: r.data.redirectUrl }, 200);
  // Binds the provider round trip to this browser. SameSite=Lax is required: the callback is a top-level
  // cross-site GET navigation from DigiLocker. Only sha256(state) is stored; the state itself is not.
  res.cookies.set(DIAG_STATE_COOKIE, sha256(state), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: DIAG_STATE_TTL_S,
  });
  res.cookies.set(DIAG_RESULT_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

function matchesDiagCookie(req: NextRequest, state: string): boolean {
  const c = req.cookies.get(DIAG_STATE_COOKIE)?.value ?? "";
  if (!/^[0-9a-f]{64}$/.test(c) || !STATE_PATTERN.test(state)) return false;
  return timingSafeEqual(Buffer.from(c), Buffer.from(sha256(state)));
}

const COMPLETE_ERRORS: Record<string, string> = {
  ATTEMPT_EXPIRED: "STATE_EXPIRED", STATE_ALREADY_USED: "STATE_ALREADY_USED", ATTEMPT_NOT_FOUND: "STATE_INVALID",
  FORBIDDEN: "FORBIDDEN", UNAUTHORIZED: "UNAUTHORIZED", INVALID_REQUEST: "STATE_INVALID",
};

/**
 * Called first by the shared registered callback. Returns null (ordinary v1 handling continues unchanged) unless the
 * diagnostic is enabled AND this browser holds the diagnostic cookie for exactly this state. Even if mis-routed, the
 * Backend keeps diagnostic and v1 states in separate stores, so neither flow can complete the other's state.
 */
export async function handleDiagnosticCallback(req: NextRequest): Promise<NextResponse | null> {
  if (!isDigiLockerDiagEnabled()) return null;
  const q = req.nextUrl.searchParams;
  const state = q.get("state") ?? "";
  if (!matchesDiagCookie(req, state)) return null;

  const bind = await currentBinding();
  const finish = (view: DiagView | "signin") => {
    const signin = view === "signin" || !bind;
    const target = signin ? new URL("/auth/sign-in", req.url) : new URL(DIAG_PAGE_PATH, req.url);
    if (signin) target.searchParams.set("next", DIAG_PAGE_PATH);
    const res = NextResponse.redirect(target, 303); // drops code/state from the address bar and history
    for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
    res.headers.set("Referrer-Policy", "no-referrer");
    res.cookies.set(DIAG_STATE_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    const sealed = bind && view !== "signin" ? sealDiagResult(view, bind) : null;
    res.cookies.set(DIAG_RESULT_COOKIE, sealed ?? "", {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: sealed ? DIAG_RESULT_TTL_S : 0,
    });
    return res;
  };
  const failed = (code: string): DiagView => ({ outcome: "FAILED", code, endpoints: null, checks: null });
  if (!bind) return finish("signin");

  const code = q.get("code");
  const providerError = q.get("error");
  if ((!code && !providerError) || (code && code.length > 2048)) return finish(failed("INVALID_CALLBACK"));

  // Only a standard OAuth error code (lowercase letters/underscore) is relayed, never free text such as error_description.
  const relayedError = providerError && /^[a-z_]{1,24}$/.test(providerError) ? providerError : "denied";
  const r = await callEdge(bind.token, providerError ? { action: "complete", state, error: relayedError } : { action: "complete", state, code });
  if (!r) return finish(failed("EDGE_FUNCTION_UNAVAILABLE"));
  if (r.status === 200 && r.data.success === true) return finish(sanitizeDiagResult(r.data.result));
  const e = typeof r.data.error === "string" ? COMPLETE_ERRORS[r.data.error] : undefined;
  return finish(failed(e ?? "DIAGNOSTIC_FAILED"));
}
