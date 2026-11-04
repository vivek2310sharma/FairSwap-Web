import { createHmac } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { request, type APIRequestContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PROD_PROJECT_REF, STEPS, TEST_PROJECT_REF } from "./contract.mjs";

export type Step = (typeof STEPS)[number];

/** Fails closed with an actionable message; nothing here ever falls back to a default account or project. */
export class PrerequisiteError extends Error {}
const need = (name: string) => {
  const v = process.env[name]?.trim();
  if (!v) throw new PrerequisiteError(`PREREQUISITE_MISSING: ${name}`);
  return v;
};

export type E2eEnv = ReturnType<typeof loadEnv>;
export function loadEnv() {
  const evidenceDir = need("E2E_EVIDENCE_DIR");
  const pre = JSON.parse(readFileSync(join(evidenceDir, "preflight.json"), "utf8")) as { baseUrl: string };
  const supabaseUrl = need("E2E_SUPABASE_URL");
  const host = new URL(supabaseUrl).hostname;
  if (host !== `${TEST_PROJECT_REF}.supabase.co`) throw new PrerequisiteError("TARGET_NOT_FAIRSWAPTEST: E2E_SUPABASE_URL must be the FairSwapTest project");
  const base = new URL(pre.baseUrl);
  if (base.protocol !== "https:" || !base.hostname.endsWith(".vercel.app")) throw new PrerequisiteError("TARGET_NOT_A_PREVIEW_DEPLOYMENT");
  const domain = need("E2E_ALLOWED_EMAIL_DOMAIN").toLowerCase();
  const account = (prefix: string) => {
    const email = need(`E2E_${prefix}_EMAIL`).toLowerCase();
    if (!email.endsWith(`@${domain}`)) throw new PrerequisiteError(`ACCOUNT_NOT_A_TEST_ACCOUNT: ${prefix}`);
    return { email, password: need(`E2E_${prefix}_PASSWORD`) };
  };
  const all = [supabaseUrl, base.href];
  if (all.some(v => v.includes(PROD_PROJECT_REF))) throw new PrerequisiteError("PRODUCTION_TARGET_REFUSED");
  return {
    evidenceDir, baseUrl: base.origin, supabaseUrl, anonKey: need("E2E_SUPABASE_ANON_KEY"),
    bypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || null,
    seller: account("SELLER"), buyer: account("BUYER"),
    moderator: { ...account("MODERATOR"), totpSecret: need("E2E_MODERATOR_TOTP_SECRET") },
  };
}

// ---- RFC 6238 TOTP (SHA-1, 30 s, 6 digits) ----------------------------------------------------------
export function base32Decode(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of input.replace(/[\s=-]/g, "").toUpperCase()) {
    const i = alphabet.indexOf(ch);
    if (i < 0) throw new PrerequisiteError("MODERATOR_TOTP_SECRET_INVALID");
    bits += i.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export function totp(secret: string, atMs = Date.now()) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 30_000)));
  const h = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h[o] & 0x7f) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1_000_000).padStart(6, "0");
}

// ---- Real Supabase Auth sessions shared by the SDK client and the deployed Web app -----------------------
export type Actor = { label: string; userId: string; client: SupabaseClient; api: () => APIRequestContext; refreshApi: () => Promise<void>; aal: () => Promise<string> };
type PwCookie = { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Lax" };

export const jwtClaims = (token: string) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { aal?: string; sub?: string; role?: string };

/** Real email/password sign-in against FairSwapTest. The SSR cookie jar is what the deployed app reads. */
export async function signIn(env: E2eEnv, label: string, creds: { email: string; password: string }): Promise<Actor> {
  const jar = new Map<string, string>();
  const client = createServerClient(env.supabaseUrl, env.anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: items => { for (const { name, value } of items) { if (value) jar.set(name, value); else jar.delete(name); } },
    },
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword(creds);
  if (error || !data.user) throw new PrerequisiteError(`TEST_ACCOUNT_SIGN_IN_FAILED: ${label}`);
  const host = new URL(env.baseUrl).hostname;
  const cookies = () => [...jar].map(([name, value]): PwCookie => ({ name, value, domain: host, path: "/", expires: -1, httpOnly: false, secure: true, sameSite: "Lax" }));
  const headers: Record<string, string> = { Origin: env.baseUrl };
  if (env.bypass) headers["x-vercel-protection-bypass"] = env.bypass;
  // The API context is rebuilt from the live jar so a later AAL2 upgrade is honoured by the deployed app.
  const build = () => request.newContext({ baseURL: env.baseUrl, extraHTTPHeaders: headers, storageState: { cookies: cookies(), origins: [] } });
  let api = await build();
  return {
    label, userId: data.user.id, client, api: () => api,
    refreshApi: async () => { await api.dispose(); api = await build(); },
    aal: async () => jwtClaims((await client.auth.getSession()).data.session?.access_token ?? "").aal ?? "none",
  };
}

/** Upgrades a staff session to AAL2 with a genuine TOTP challenge/verify. Retries once across a code-window boundary. */
export async function upgradeToAal2(actor: Actor, secret: string) {
  const factors = await actor.client.auth.mfa.listFactors();
  const factor = factors.data?.totp.find(f => f.status === "verified");
  if (factors.error || !factor) throw new PrerequisiteError("MODERATOR_TOTP_FACTOR_MISSING");
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = 30_000 - (Date.now() % 30_000);
    if (remaining < 3_000) await new Promise(r => setTimeout(r, remaining + 500));
    const challenge = await actor.client.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) throw new PrerequisiteError("MODERATOR_MFA_CHALLENGE_FAILED");
    const verify = await actor.client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code: totp(secret) });
    if (!verify.error) return;
    await new Promise(r => setTimeout(r, 31_000)); // a code is single-use per window
  }
  throw new PrerequisiteError("MODERATOR_MFA_VERIFY_FAILED");
}

export const anonClient = (env: E2eEnv) => createClient(env.supabaseUrl, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
export async function anonApi(env: E2eEnv) {
  const headers: Record<string, string> = { Origin: env.baseUrl };
  if (env.bypass) headers["x-vercel-protection-bypass"] = env.bypass;
  return request.newContext({ baseURL: env.baseUrl, extraHTTPHeaders: headers });
}

// ---- Evidence state (read by write-evidence.mjs; a step is only ever set after its assertions passed) -------
const stateFile = () => join(need("E2E_EVIDENCE_DIR"), "steps.json");
type State = { steps: Partial<Record<Step, true>>; webFlagEnabledInTest?: true; notes: Record<string, unknown> };
const load = (): State => (existsSync(stateFile()) ? JSON.parse(readFileSync(stateFile(), "utf8")) as State : { steps: {}, notes: {} });
export function recordStep(step: Step, note: Record<string, unknown> = {}) { const s = load(); s.steps[step] = true; s.notes[step] = note; writeFileSync(stateFile(), JSON.stringify(s, null, 2)); }
export function recordTestFlag() { const s = load(); s.webFlagEnabledInTest = true; writeFileSync(stateFile(), JSON.stringify(s, null, 2)); }
