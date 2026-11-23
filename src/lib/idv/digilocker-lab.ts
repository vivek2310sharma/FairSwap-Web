import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS, getEdgeFunctionsBaseUrl, getSupabasePublicApiKey } from "@/lib/idv/server-helpers";
import { DIGILOCKER_AUTHORIZE_ORIGIN, STATE_PATTERN } from "@/lib/idv/digilocker";

// STAGE-ONLY DigiLocker Identity Lab. A SECOND Authpartner with its own callback, cookies and sealing key.
// It never issues or displays a FairSwap badge, links an identity or touches the primary verification flow.
// Test-only allowlisted responses can carry raw signed-identity data. They are
// AES-GCM sealed to the tester/session, never logged or persisted and only
// injected into the DOM following an explicit reveal. All shapes remain strict.

export const LAB_PAGE_PATH = "/account/verification/digilocker-lab";
export const LAB_CALLBACK_PATH = "/api/idv/digilocker/lab/callback";
export const LAB_REDIRECT_URI = `https://fairswap-web-git-staging-fairswap.vercel.app${LAB_CALLBACK_PATH}`;
export const LAB_STATE_COOKIE = "__Host-fs_dl_lab";
export const LAB_RESULT_COOKIE = "__Host-fs_dl_lab_result";
export const LAB_RESULT_COOKIE_NAMES = [LAB_RESULT_COOKIE, `${LAB_RESULT_COOKIE}_1`, `${LAB_RESULT_COOKIE}_2`] as const;
const COOKIE_CHUNK_CHARS = 3600;
const LAB_STATE_TTL_S = 300;
const LAB_RESULT_TTL_S = 60;
const MAX_SEALED_CHARS = COOKIE_CHUNK_CHARS * LAB_RESULT_COOKIE_NAMES.length;
const MAX_INFLATED_BYTES = 256 * 1024;
const TEST_SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
const MIN_KEY_LENGTH = 32;

function labKey(env: Record<string, string | undefined> = process.env): string | null {
  const k = (env.DIGILOCKER_LAB_RESULT_KEY ?? "").trim();
  return k.length >= MIN_KEY_LENGTH ? k : null;
}

/** Default OFF. Never on Vercel Production, only for the FairSwapTest project, only with a server-only sealing key.
 *  The owner turns it on only after the Backend Lab flow is deployed and the partner is registered. */
export function isDigiLockerLabEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.FAIRSWAP_DIGILOCKER_LAB_ENABLED !== "true") return false;
  if (env.VERCEL_ENV === "production") return false;
  if (!labKey(env)) return false;
  return env.NEXT_PUBLIC_SUPABASE_URL === TEST_SUPABASE_URL;
}

// ---------------- Strict contract (shared shape with the Backend `flow:"lab"` response) ----------------
export const LAB_ERROR_CODES = [
  "INVALID_RESULT", "INVALID_CONTRACT", "INVALID_CALLBACK", "INVALID_PROVIDER_REDIRECT", "STATE_INVALID", "STATE_EXPIRED",
  "STATE_ALREADY_USED", "FORBIDDEN", "UNAUTHORIZED", "RATE_LIMIT_EXCEEDED", "NOT_FOUND", "LAB_NOT_CONFIGURED",
  "PROVIDER_DENIED", "PROVIDER_ERROR", "TOKEN_EXCHANGE_FAILED", "RESPONSE_TOO_LARGE", "EDGE_FUNCTION_UNAVAILABLE", "START_FAILED",
] as const;
const errorCode = z.enum(LAB_ERROR_CODES);
export type LabErrorCode = z.infer<typeof errorCode>;

const claimName = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const valueType = z.enum(["string", "number", "boolean", "object", "array", "null"]);
const fieldList = z.array(z.object({ name: claimName, type: valueType }).strict()).max(40);
const tri = z.enum(["verified", "unconfirmed", "failed"]);
const presence = z.enum(["present", "absent", "empty", "null", "invalid"]);

export const labResultSchema = z.object({
  outcome: z.enum(["VERIFIED", "UNCONFIRMED", "NOT_VERIFIED", "CANCELLED", "FAILED"]),
  errorCode: errorCode.nullable(),
  httpStatusBucket: z.enum(["2xx", "3xx", "4xx", "5xx", "none"]),
  tokenResponseFields: fieldList,
  idTokenClaims: fieldList,
  checks: z.object({
    signature: tri, issuer: tri, audience: tri, expiry: tri, issuedAt: tri,
    nonce: z.enum(["match", "absent", "mismatch"]),
    acr: z.enum(["aadhaar", "missing", "other", "invalid"]),
  }).strict(),
  presence: z.object({
    digilockerid: presence, eaadhaar: presence, masked_aadhaar: presence, name: presence, dob: presence, gender: presence,
  }).strict(),
  raw: z.object({
    tokenResponse: z.object({
      httpStatus: z.number().int().min(200).max(299),
      contentType: z.string().max(200).nullable(), json: z.unknown(), text: z.string().max(4000).nullable(),
    }).strict(),
  }).strict().optional(),
  rawOmitted: z.boolean().optional(),
}).strict();
export type LabView = z.infer<typeof labResultSchema>;

const startRequest = z.object({ action: z.literal("start"), flow: z.literal("lab") }).strict();
const PROVIDER_ERRORS = ["access_denied", "temporarily_unavailable", "server_error", "invalid_request", "denied"] as const;
const completeRequest = z.object({
  action: z.literal("complete"), flow: z.literal("lab"), state: z.string().regex(STATE_PATTERN),
  code: z.string().min(1).max(2048).optional(), error: z.enum(PROVIDER_ERRORS).optional(),
}).strict().refine((v) => (v.code === undefined) !== (v.error === undefined));
const startResponse = z.object({ success: z.literal(true), flow: z.literal("lab"), redirectUrl: z.string().max(2048) }).strict();
const completeResponse = z.object({ success: z.literal(true), flow: z.literal("lab"), result: labResultSchema }).strict();
const errorResponse = z.object({ success: z.literal(false), flow: z.literal("lab"), error: errorCode }).strict();

const failedView = (code: LabErrorCode): LabView => ({
  outcome: "FAILED", errorCode: code, httpStatusBucket: "none", tokenResponseFields: [], idTokenClaims: [],
  checks: { signature: "unconfirmed", issuer: "unconfirmed", audience: "unconfirmed", expiry: "unconfirmed", issuedAt: "unconfirmed", nonce: "absent", acr: "missing" },
  presence: { digilockerid: "absent", eaadhaar: "absent", masked_aadhaar: "absent", name: "absent", dob: "absent", gender: "absent" },
});

/** Strict parse: anything outside the contract becomes a generic failure and is never echoed. */
export function sanitizeLabResult(raw: unknown): LabView {
  const p = labResultSchema.safeParse(raw);
  return p.success ? p.data : failedView("INVALID_RESULT");
}

/** Exact authorize-URL check, including the Lab redirect_uri. A response from the old diagnostic flow fails here. */
export function isLabAuthorizeUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    const q = u.searchParams;
    return u.protocol === "https:" && u.origin === DIGILOCKER_AUTHORIZE_ORIGIN && !u.username && !u.password &&
      u.pathname === "/public/oauth2/1/authorize" &&
      STATE_PATTERN.test(q.get("state") ?? "") && q.get("response_type") === "code" &&
      q.getAll("scope").length === 1 && q.get("scope") === "openid" && !q.has("acr") &&
      /^[A-Za-z0-9_-]{43}$/.test(q.get("nonce") ?? "") &&
      q.get("code_challenge_method") === "S256" &&
      (q.get("code_challenge") ?? "").length > 0 && q.get("redirect_uri") === LAB_REDIRECT_URI;
  } catch {
    return false;
  }
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge });

export interface LabBinding { token: string; userId: string; sessionId: string }

async function currentBinding(): Promise<LabBinding | null> {
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

// ---- Sealed result cookies: AES-256-GCM+deflate, user+session bound, 60 s, single read. ----
const payloadSchema = z.object({
  v: z.literal(2), u: z.string().min(1), s: z.string().min(1), exp: z.number().int(), jti: z.string().regex(/^[0-9a-f]{32}$/), r: z.unknown(),
}).strict();
const encKey = (key: string) => createHmac("sha256", key).update("fs:dl:lab:result:enc:v2").digest();

function sealPayload(view: LabView, bind: Pick<LabBinding, "userId" | "sessionId">, nowMs: number): string | null {
  const key = labKey();
  if (!key) return null;
  const plain = deflateRawSync(Buffer.from(JSON.stringify({
    v: 2, u: bind.userId, s: bind.sessionId, exp: Math.floor(nowMs / 1000) + LAB_RESULT_TTL_S, jti: randomBytes(16).toString("hex"), r: view,
  })));
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(key), iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return `v2.${iv.toString("base64url")}.${Buffer.concat([ct, c.getAuthTag()]).toString("base64url")}`;
}

/** Full signed result if it fits; otherwise drop the entire raw payload, never truncate it. */
export function sealLabResult(view: LabView, bind: Pick<LabBinding, "userId" | "sessionId">, nowMs = Date.now()): string | null {
  const full = sealPayload(view, bind, nowMs);
  if (full && full.length <= MAX_SEALED_CHARS) return full;
  const reduced = sealPayload({ ...view, raw: undefined, rawOmitted: true }, bind, nowMs);
  return reduced && reduced.length <= MAX_SEALED_CHARS ? reduced : null;
}

export function splitSealedLab(sealed: string): string[] {
  const parts: string[] = [];
  for (let i = 0; i < sealed.length; i += COOKIE_CHUNK_CHARS) parts.push(sealed.slice(i, i + COOKIE_CHUNK_CHARS));
  return parts;
}

export function openLabResult(value: string | undefined, bind: Pick<LabBinding, "userId" | "sessionId">, nowMs = Date.now()): LabView | null {
  const key = labKey();
  if (!key || !value || value.length > MAX_SEALED_CHARS) return null;
  const [ver, ivB64, dataB64, extra] = value.split(".");
  if (ver !== "v2" || !ivB64 || !dataB64 || extra !== undefined) return null;
  let parsed: z.infer<typeof payloadSchema>;
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    if (iv.length !== 12 || data.length < 17) return null;
    const d = createDecipheriv("aes-256-gcm", encKey(key), iv);
    d.setAuthTag(data.subarray(data.length - 16));
    const plain = Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()]);
    const p = payloadSchema.safeParse(JSON.parse(inflateRawSync(plain, { maxOutputLength: MAX_INFLATED_BYTES }).toString("utf8")));
    if (!p.success) return null;
    parsed = p.data;
  } catch {
    return null;
  }
  const now = Math.floor(nowMs / 1000);
  if (parsed.u !== bind.userId || parsed.s !== bind.sessionId) return null;
  if (parsed.exp <= now || parsed.exp > now + LAB_RESULT_TTL_S) return null;
  return sanitizeLabResult(parsed.r);
}

/** Server Action helper: reads, verifies and always deletes the result cookie, so a result renders at most once. */
export async function consumeLabResult(): Promise<LabView | null> {
  if (!isDigiLockerLabEnabled()) return null;
  const jar = await cookies();
  const parts = LAB_RESULT_COOKIE_NAMES.map((n) => jar.get(n)?.value);
  for (const n of LAB_RESULT_COOKIE_NAMES) jar.set(n, "", cookieOpts(0));
  if (!parts[0]) return null;
  const bind = await currentBinding();
  return bind ? openLabResult(parts.filter((p): p is string => typeof p === "string").join(""), bind) : null;
}

async function callEdge(token: string, body: unknown): Promise<{ status: number; data: unknown } | null> {
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
    return { status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return null;
  }
}

/** POST /api/idv/digilocker/lab/start. Caller has already passed the same-origin check. */
export async function startLab(): Promise<NextResponse> {
  if (!isDigiLockerLabEnabled()) return json({ error: "NOT_FOUND" }, 404);
  const bind = await currentBinding();
  if (!bind) return json({ error: "UNAUTHORIZED" }, 401);
  const r = await callEdge(bind.token, startRequest.parse({ action: "start", flow: "lab" }));
  if (!r) return json({ error: "EDGE_FUNCTION_UNAVAILABLE" }, 502);
  if (r.status !== 200) {
    const e = errorResponse.safeParse(r.data);
    return json({ error: e.success ? e.data.error : "START_FAILED" }, r.status >= 400 && r.status < 600 ? r.status : 502);
  }
  const ok = startResponse.safeParse(r.data);
  if (!ok.success) return json({ error: "INVALID_CONTRACT" }, 502);
  if (!isLabAuthorizeUrl(ok.data.redirectUrl)) return json({ error: "INVALID_PROVIDER_REDIRECT" }, 502);
  const state = new URL(ok.data.redirectUrl).searchParams.get("state")!;
  const res = json({ success: true, redirectUrl: ok.data.redirectUrl }, 200);
  // SameSite=Lax: the callback is a top-level cross-site GET. Only sha256(state) is stored.
  res.cookies.set(LAB_STATE_COOKIE, sha256(state), cookieOpts(LAB_STATE_TTL_S));
  for (const n of LAB_RESULT_COOKIE_NAMES) res.cookies.set(n, "", cookieOpts(0));
  return res;
}

function matchesLabCookie(req: NextRequest, state: string): boolean {
  const c = req.cookies.get(LAB_STATE_COOKIE)?.value ?? "";
  if (!/^[0-9a-f]{64}$/.test(c) || !STATE_PATTERN.test(state)) return false;
  return timingSafeEqual(Buffer.from(c), Buffer.from(sha256(state)));
}

/** GET /api/idv/digilocker/lab/callback. Never falls through to, or is taken by, the primary verification callback. */
export async function handleLabCallback(req: NextRequest): Promise<NextResponse> {
  if (!isDigiLockerLabEnabled()) return json({ error: "NOT_FOUND" }, 404);
  const q = req.nextUrl.searchParams;
  const state = q.get("state") ?? "";
  const bind = await currentBinding();

  const finish = (view: LabView | "signin") => {
    const signin = view === "signin" || !bind;
    const target = new URL(signin ? "/auth/sign-in" : LAB_PAGE_PATH, req.url);
    if (signin) target.searchParams.set("next", LAB_PAGE_PATH);
    const res = NextResponse.redirect(target, 303); // drops code/state from the address bar and history
    for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
    res.headers.set("Referrer-Policy", "no-referrer");
    res.cookies.set(LAB_STATE_COOKIE, "", cookieOpts(0));
    const sealed = bind && view !== "signin" ? sealLabResult(view, bind) ?? sealLabResult(failedView("RESPONSE_TOO_LARGE"), bind) : null;
    const chunks = sealed ? splitSealedLab(sealed) : [];
    LAB_RESULT_COOKIE_NAMES.forEach((n, i) =>
      res.cookies.set(n, chunks[i] ?? "", cookieOpts(chunks[i] ? LAB_RESULT_TTL_S : 0))
    );
    return res;
  };

  if (!bind) return finish("signin");
  // Exact state binding to THIS browser before anything is forwarded: a query string alone is never proof.
  if (!matchesLabCookie(req, state)) return finish(failedView("STATE_INVALID"));

  const code = q.get("code");
  const providerError = q.get("error");
  if ((!code && !providerError) || (code && providerError) || (code && code.length > 2048)) return finish(failedView("INVALID_CALLBACK"));

  // Unknown provider errors (including invalid_scope_avs) are failures, never user consent denial.
  // Do not forward the original error or its description: only a fixed allowlisted value.
  const mapped = (PROVIDER_ERRORS as readonly string[]).includes(providerError ?? "") ? (providerError as (typeof PROVIDER_ERRORS)[number]) : "server_error";
  const body = completeRequest.safeParse(providerError
    ? { action: "complete", flow: "lab", state, error: mapped }
    : { action: "complete", flow: "lab", state, code });
  if (!body.success) return finish(failedView("INVALID_CALLBACK"));

  const r = await callEdge(bind.token, body.data);
  if (!r) return finish(failedView("EDGE_FUNCTION_UNAVAILABLE"));
  if (r.status === 200) {
    const ok = completeResponse.safeParse(r.data);
    return finish(ok.success ? ok.data.result : failedView("INVALID_CONTRACT"));
  }
  const e = errorResponse.safeParse(r.data);
  return finish(failedView(e.success ? e.data.error : "START_FAILED"));
}
