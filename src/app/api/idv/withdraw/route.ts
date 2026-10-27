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
    const res = await fetch(`${edgeBaseUrl}/idv-withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const safeError = data.error || "WITHDRAW_FAILED";
      const safeMessage = data.message || "Failed to withdraw consent.";
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
