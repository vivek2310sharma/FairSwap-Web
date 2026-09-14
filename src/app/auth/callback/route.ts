import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { resolveCorrelationId, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";
import { logger } from "@/lib/logger";

function isValidRedirect(url: string | null): boolean {
  if (!url) return false;
  // Must be relative path, not protocol-relative (//) and no schemes
  if (!url.startsWith("/") || url.startsWith("//") || url.includes(":")) {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const incomingId = request.headers.get("x-request-id");
  const upstreamRequestId = sanitizeUpstreamRequestId(incomingId);
  const requestId = resolveCorrelationId();
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = isValidRedirect(nextParam) ? nextParam! : "/account";

  logger.info("auth.callback_received", {
    request_id: requestId,
    upstream_request_id: upstreamRequestId,
    route: "/auth/callback",
    operation: "GET /auth/callback",
    extra: {
      otp_type: type || undefined,
    },
  });

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      logger.info("auth.callback_verified", {
        request_id: requestId,
        route: "/auth/callback",
        operation: "GET /auth/callback",
        extra: {
          otp_type: type,
        },
      });
      const redirectRes = NextResponse.redirect(new URL(next, request.url));
      redirectRes.headers.set("x-request-id", requestId);
      return redirectRes;
    }

    logger.warn("auth.callback_verification_failed", {
      request_id: requestId,
      route: "/auth/callback",
      operation: "GET /auth/callback",
      error_code: error.code || "VERIFY_OTP_FAILED",
    });

    // An actual token_hash was provided, but verification failed -> return invalid_token
    const errorUrl = new URL("/auth/sign-in", request.url);
    errorUrl.searchParams.set("error", "invalid_token");
    const redirectRes = NextResponse.redirect(errorUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  // If NO token_hash was provided (e.g. arrival from external/Supabase verification or direct GET),
  // do NOT falsely report "invalid or expired token" and do NOT falsely assert "confirmed".
  // Check if an authenticated session already exists:
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const redirectRes = NextResponse.redirect(new URL(next, request.url));
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  // If not already authenticated, redirect to sign-in with neutral continuation state:
  const continuationUrl = new URL("/auth/sign-in", request.url);
  continuationUrl.searchParams.set("message", "confirm_continue");
  if (next && next !== "/account") {
    continuationUrl.searchParams.set("next", next);
  }
  const redirectRes = NextResponse.redirect(continuationUrl);
  redirectRes.headers.set("x-request-id", requestId);
  return redirectRes;
}
