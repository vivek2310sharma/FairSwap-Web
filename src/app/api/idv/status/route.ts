import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  NO_STORE_HEADERS,
  getEdgeFunctionsBaseUrl,
} from "@/lib/idv/server-helpers";

export const runtime = "nodejs";

export async function GET() {
  const isFeatureEnabled = process.env.FAIRSWAP_IDV_ENABLED === "true";
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
    const res = await fetch(`${edgeBaseUrl}/idv-status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "STATUS_CHECK_FAILED" },
        { status: res.status, headers: NO_STORE_HEADERS }
      );
    }

    // Authoritative badge status check: verify expiration against user_identity_verifications
    let effectiveStatus = data.status;
    let badgeIssued = false;
    let validUntil: string | null = null;

    try {
      const { data: idvRecord } = await supabase.rpc("get_my_identity_verification");
      if (idvRecord && typeof idvRecord === "object") {
        const rec = idvRecord as Record<string, unknown>;
        validUntil = (rec.valid_until as string) || null;
        badgeIssued = rec.badge_issued === true;

        if (rec.status === "revoked") {
          effectiveStatus = "revoked";
        } else if (rec.status === "expired") {
          effectiveStatus = "expired";
        } else if (validUntil) {
          const expiresTime = new Date(validUntil).getTime();
          if (Number.isFinite(expiresTime) && expiresTime <= Date.now()) {
            effectiveStatus = "expired";
            badgeIssued = false;
          }
        }
      }
    } catch {
      // Fallback to attempt status if RPC lookup fails
    }

    // Also check attempt expiration if attempt itself had expiresAt and status was not yet finalized
    if (data.expiresAt) {
      const attemptExpiry = new Date(data.expiresAt).getTime();
      if (Number.isFinite(attemptExpiry) && attemptExpiry <= Date.now() && effectiveStatus === "in_progress") {
        effectiveStatus = "expired";
      }
    }

    return NextResponse.json(
      {
        ...data,
        status: effectiveStatus,
        badgeIssued,
        validUntil,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { error: "EDGE_FUNCTION_UNAVAILABLE", message: "Identity service is temporarily unreachable." },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}

