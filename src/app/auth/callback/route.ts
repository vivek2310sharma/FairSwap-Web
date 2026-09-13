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
  }

  // Return user to sign-in with clear error if token invalid, missing or expired
  const errorUrl = new URL("/auth/sign-in", request.url);
  errorUrl.searchParams.set("error", "invalid_token");
  const redirectRes = NextResponse.redirect(errorUrl);
  redirectRes.headers.set("x-request-id", requestId);
  return redirectRes;
}
