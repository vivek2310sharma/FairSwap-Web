import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS, getEdgeFunctionsBaseUrl, getSupabasePublicApiKey } from "@/lib/idv/server-helpers";
import { isDigiLockerEnabled, resultForBackend, STATE_PATTERN, type DigiLockerResult } from "@/lib/idv/digilocker";

export const runtime = "nodejs";

// Browser redirect target registered with DigiLocker. The query string is NOT identity proof: it is only relayed,
// with the signed-in user's session, to the Backend, which validates state and performs the server-side exchange.
function back(req: NextRequest, result: DigiLockerResult | "signin"): NextResponse {
  const target = result === "signin"
    ? new URL("/auth/sign-in", req.url)
    : new URL("/account/verification", req.url);
  if (result === "signin") target.searchParams.set("next", "/account/verification");
  else target.searchParams.set("dl", result);
  const res = NextResponse.redirect(target, 303); // 303 drops the code/state from the address bar and history
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function GET(req: NextRequest) {
  if (!isDigiLockerEnabled()) return back(req, "unavailable");

  const q = req.nextUrl.searchParams;
  const state = q.get("state") ?? "";
  const code = q.get("code");
  const providerError = q.get("error");
  if (!STATE_PATTERN.test(state) || (!code && !providerError) || (code && code.length > 2048)) return back(req, "failed");

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return back(req, "signin");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return back(req, "signin");

  let base: string;
  try { base = getEdgeFunctionsBaseUrl(); } catch { return back(req, "failed"); }
  const apikey = getSupabasePublicApiKey();
  if (!apikey) return back(req, "failed");

  try {
    const res = await fetch(`${base}/idv-digilocker-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey },
      body: JSON.stringify(providerError ? { state, error: "denied" } : { state, code }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: unknown };
    return back(req, resultForBackend(res.ok, data.error));
  } catch {
    return back(req, "provider_error");
  }
}
