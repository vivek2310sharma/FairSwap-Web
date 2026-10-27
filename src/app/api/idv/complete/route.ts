import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  NO_STORE_HEADERS,
  validateSameOrigin,
  getEdgeFunctionsBaseUrl,
} from "@/lib/idv/server-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!validateSameOrigin(req)) {
    return NextResponse.json(
      { error: "CROSS_ORIGIN_REQUEST_REJECTED" },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const isFeatureEnabled = process.env.FAIRSWAP_IDV_ENABLED === "true";
  if (!isFeatureEnabled) {
    return NextResponse.json(
      { error: "FEATURE_DISABLED", message: "Identity verification is coming soon." },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // Forward payload directly to trusted Edge Function.
  // If attemptId is omitted (e.g. across full-page redirect), the Edge Function securely
  // resolves the attempt using the authenticated user ID and single-use state nonce via service role.

  let edgeBaseUrl: string;
  try {
    edgeBaseUrl = getEdgeFunctionsBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "CONFIGURATION_ERROR", message: "Service is temporarily misconfigured." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  try {
    const res = await fetch(`${edgeBaseUrl}/idv-complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const safeError = data.error || "COMPLETION_FAILED";
      const safeMessage = data.message || "Failed to complete identity verification.";
      return NextResponse.json(
        { error: safeError, message: safeMessage },
        { status: res.status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(data, { status: res.status, headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "EDGE_FUNCTION_UNAVAILABLE", message: "Identity service is temporarily unreachable." },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
