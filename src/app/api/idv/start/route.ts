import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  NO_STORE_HEADERS,
  validateSameOrigin,
  getEdgeFunctionsBaseUrl,
  validateProviderRedirectUrl,
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
    let body: Record<string, unknown> = {};
    try {
      const raw = await req.json();
      if (raw && typeof raw === "object") body = raw;
    } catch {
      // Body parsing failed or empty
    }

    // Server-side consent validation: Require explicit affirmative acknowledgement
    if (body.consentAcknowledged !== true) {
      return NextResponse.json(
        {
          error: "CONSENT_REQUIRED",
          message: "Explicit consent acknowledgement is required before starting verification.",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const docCategory = typeof body.docCategory === "string" ? body.docCategory : "";
    const allowedCategories = ["aadhaar_kyc", "pan_card", "driving_licence"];
    if (!allowedCategories.includes(docCategory)) {
      return NextResponse.json(
        {
          error: "CATEGORY_CONSENT_REQUIRED",
          message: "Explicit evidence category selection is required before starting verification.",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const res = await fetch(`${edgeBaseUrl}/idv-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        consentAcknowledged: true,
        docCategory,
        policyVersion: typeof body.policyVersion === "string" ? body.policyVersion : "v1.0",
        redirectPath: typeof body.redirectPath === "string" ? body.redirectPath : "/account/verification",
      }),
    });

    const data = await res.json().catch(() => ({}));

    // If edge function returned a redirectUrl, validate against approved provider origins
    if (data.redirectUrl && !validateProviderRedirectUrl(data.redirectUrl)) {
      return NextResponse.json(
        { error: "INVALID_PROVIDER_REDIRECT", message: "Provider returned an unverified destination." },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    if (!res.ok) {
      // Sanitize raw error details to protect browser clients
      const safeError = data.error || "START_FAILED";
      const safeMessage = data.message || "Failed to initialize identity verification.";
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
