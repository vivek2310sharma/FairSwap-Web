import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS, validateSameOrigin, getEdgeFunctionsBaseUrl } from "@/lib/idv/server-helpers";
import { isDigiLockerEnabled, isDigiLockerAuthorizeUrl } from "@/lib/idv/digilocker";

export const runtime = "nodejs";

const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

export async function POST(req: Request) {
  if (!validateSameOrigin(req)) return json({ error: "CROSS_ORIGIN_REQUEST_REJECTED" }, 403);
  if (!isDigiLockerEnabled()) return json({ error: "FEATURE_DISABLED" }, 503);

  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty */ }
  if ((body as { consentAcknowledged?: unknown } | null)?.consentAcknowledged !== true) {
    return json({ error: "CONSENT_REQUIRED" }, 400);
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "UNAUTHORIZED" }, 401);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return json({ error: "UNAUTHORIZED" }, 401);

  let base: string;
  try { base = getEdgeFunctionsBaseUrl(); } catch { return json({ error: "CONFIGURATION_ERROR" }, 500); }

  try {
    const res = await fetch(`${base}/idv-digilocker-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
      body: JSON.stringify({ consentAcknowledged: true }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return json({ error: typeof data.error === "string" ? data.error : "START_FAILED", recoveryHint: data.recoveryHint === true }, res.status);
    if (data.alreadyVerified === true) return json({ success: true, alreadyVerified: true }, 200);
    if (!isDigiLockerAuthorizeUrl(data.redirectUrl)) return json({ error: "INVALID_PROVIDER_REDIRECT" }, 502);
    return json({ success: true, alreadyVerified: false, redirectUrl: data.redirectUrl }, 200);
  } catch {
    return json({ error: "EDGE_FUNCTION_UNAVAILABLE" }, 502);
  }
}
