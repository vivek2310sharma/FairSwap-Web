import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { resolveCorrelationId, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";
import { logger } from "@/lib/logger";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

export async function GET(request: NextRequest) {
  const incomingId = request.headers.get("x-request-id");
  const upstreamRequestId = sanitizeUpstreamRequestId(incomingId);
  const requestId = resolveCorrelationId();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthProviderError = searchParams.get("error");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = sanitizeRedirectPath(nextParam, "/account");

  logger.info("auth.callback_received", {
    request_id: requestId,
    upstream_request_id: upstreamRequestId,
    route: "/auth/callback",
    operation: "GET /auth/callback",
    extra: {
      otp_type: type || undefined,
      oauth_code_present: Boolean(code),
    },
  });

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      logger.info("auth.oauth_callback_verified", {
        request_id: requestId,
        route: "/auth/callback",
        operation: "GET /auth/callback",
      });

      const redirectRes = NextResponse.redirect(new URL(next, request.url));
      redirectRes.headers.set("x-request-id", requestId);
      return redirectRes;
    }

    logger.warn("auth.oauth_callback_failed", {
      request_id: requestId,
      route: "/auth/callback",
      operation: "GET /auth/callback",
      error_code: error.code || "OAUTH_CODE_EXCHANGE_FAILED",
    });

    const errorUrl = new URL("/auth/sign-in", request.url);
    errorUrl.searchParams.set("error", "oauth_failed");
    if (next !== "/account") {
      errorUrl.searchParams.set("next", next);
    }
    const redirectRes = NextResponse.redirect(errorUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  if (oauthProviderError) {
    logger.warn("auth.oauth_provider_failed", {
      request_id: requestId,
      route: "/auth/callback",
      operation: "GET /auth/callback",
      error_code: "OAUTH_PROVIDER_FAILED",
    });

    const errorUrl = new URL("/auth/sign-in", request.url);
    errorUrl.searchParams.set("error", "oauth_failed");
    if (next !== "/account") {
      errorUrl.searchParams.set("next", next);
    }
    const redirectRes = NextResponse.redirect(errorUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

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

    const errorUrl = new URL("/auth/sign-in", request.url);
    errorUrl.searchParams.set("error", "invalid_token");
    const redirectRes = NextResponse.redirect(errorUrl);
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const redirectRes = NextResponse.redirect(new URL(next, request.url));
    redirectRes.headers.set("x-request-id", requestId);
    return redirectRes;
  }

  const continuationUrl = new URL("/auth/sign-in", request.url);
  continuationUrl.searchParams.set("message", "confirm_continue");
  if (next && next !== "/account") {
    continuationUrl.searchParams.set("next", next);
  }
  const redirectRes = NextResponse.redirect(continuationUrl);
  redirectRes.headers.set("x-request-id", requestId);
  return redirectRes;
}
