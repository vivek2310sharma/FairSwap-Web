import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { resolveCorrelationId, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";
import { logger } from "@/lib/logger";
import { isRetiredAdminPath, sanitizeRedirectPath } from "@/lib/security/redirect";

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const incomingId = request.headers.get("x-request-id") || request.headers.get("x-correlation-id");
  const upstreamRequestId = sanitizeUpstreamRequestId(incomingId);
  // Authoritative correlation ID is ALWAYS server-generated for external requests
  const correlationId = resolveCorrelationId();
  const { pathname } = request.nextUrl;

  // Retired Admin paths are unmatched routes. Let Next.js render the shared
  // not-found page without session refresh or authentication redirects.
  if (isRetiredAdminPath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, must-revalidate");
    response.headers.set("x-request-id", correlationId);
    return response;
  }

  // Set server-owned correlation ID on downstream request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", correlationId);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", correlationId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sbp_local_anon_key_for_testing";

  let cookiesMutated = false;
  const pendingCookies: Parameters<SetAllCookies>[0] = [];
  const authCacheHeaders = new Headers();

  // Finalize the chosen response, without copying request or routing-control headers.
  function finalizeResponse(target: NextResponse): NextResponse {
    target.headers.set("x-request-id", correlationId);
    if (cookiesMutated) {
      pendingCookies.forEach(({ name, value, options }) =>
        target.cookies.set(name, value, options)
      );

      // ResponseCookies indexes by name. Keep distinct host/domain deletion scopes
      // (and successive writes) using the supported cookie serializer, not raw splitting.
      if (new Set(pendingCookies.map(({ name }) => name)).size < pendingCookies.length) {
        const serialized = pendingCookies.flatMap(({ name, value, options }) => {
          const cookieResponse = new NextResponse();
          cookieResponse.cookies.set(name, value, options);
          return cookieResponse.headers.getSetCookie();
        });
        target.headers.delete("set-cookie");
        serialized.forEach((cookie) => target.headers.append("set-cookie", cookie));
      }

      target.headers.set("Cache-Control", "private, no-store, must-revalidate");
      authCacheHeaders.forEach((value, name) => target.headers.set(name, value));
      if (target.headers.has("location")) {
        // Next's cookie API generates this internal propagation header; redirects
        // need browser Set-Cookie only, not pass-through middleware controls.
        target.headers.delete("x-middleware-set-cookie");
      }
    }
    return target;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers = {}) {
        cookiesMutated ||= cookiesToSet.length > 0;
        pendingCookies.push(...cookiesToSet);
        // SSR 0.12.7 supplies cache headers on its first write only. Retain them
        // across callbacks, and allowlist cache protection rather than all headers.
        for (const [name, value] of Object.entries(headers)) {
          if (["cache-control", "expires", "pragma"].includes(name.toLowerCase())) {
            authCacheHeaders.set(name, value);
          }
        }
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader === null) requestHeaders.delete("cookie");
        else requestHeaders.set("cookie", cookieHeader);
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      },
    },
  });

  // 1. Use getClaims() for request session/token validation and refresh
  let claims: Record<string, unknown> | null = null;
  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    claims = claimsData?.claims as Record<string, unknown> | null;
  } catch (err) {
    logger.warn("auth.claims_retrieval_failed", {
      request_id: correlationId,
      error_code: (err as Error)?.name || "CLAIMS_ERROR",
    });
    claims = null;
  }
  const isAuthenticated = !!claims?.sub;


  // 3. Route Guard: Protected Account Paths (/account/*)
  if (pathname.startsWith("/account")) {
    if (!isAuthenticated) {
      logger.info("auth.redirect_unauthenticated", {
        request_id: correlationId,
        route: pathname,
      });
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set(
        "next",
        sanitizeRedirectPath(
          `${pathname}${request.nextUrl.search}`,
          sanitizeRedirectPath(pathname, "/account")
        )
      );
      const redirectRes = NextResponse.redirect(signInUrl);
      return finalizeResponse(redirectRes);
    }

    // Explicitly allow policy review and safety/privacy exceptions through to Server Components
    const isPolicyGateExempt =
      pathname === "/account/policy-review" ||
      pathname === "/account/privacy" ||
      pathname === "/account/support" ||
      pathname.startsWith("/account/support/");

    if (!isPolicyGateExempt) {
      const { data: hasCurrentPolicy, error: policyError } = await supabase.rpc(
        "has_current_policy_acceptance"
      );

      if (policyError) {
        logger.error("compliance.proxy_policy_check_error", {
          request_id: correlationId,
          route: pathname,
          error_code: policyError.code || "RPC_ERROR",
        });
      } else if (hasCurrentPolicy === false) {
        logger.info("compliance.proxy_redirect_policy_review", {
          request_id: correlationId,
          route: pathname,
        });
        const reviewUrl = new URL("/account/policy-review", request.url);
        const targetPath = request.nextUrl.search
          ? `${pathname}${request.nextUrl.search}`
          : pathname;
        reviewUrl.searchParams.set("next", targetPath);
        const redirectRes = NextResponse.redirect(reviewUrl);
        return finalizeResponse(redirectRes);
      }
    }
  }

  // 4. Auth Pages (/auth/sign-in, /auth/sign-up): Redirect already-authenticated users
  if (pathname === "/auth/sign-in" || pathname === "/auth/sign-up") {
    if (isAuthenticated) {
      // Valid token claims do not prove the Auth session still resolves to a
      // user. Account pages require getUser too; otherwise these pages bounce.
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          const redirectRes = NextResponse.redirect(new URL("/account", request.url));
          return finalizeResponse(redirectRes);
        }
      } catch (err) {
        logger.warn("auth.auth_page_user_verification_failed", {
          request_id: correlationId,
          route: pathname,
          error_code: (err as Error)?.name || "AUTH_USER_ERROR",
        });
      }
      // Missing/invalid sessions and transient failures reach normal auth.
      // Keep any SDK cookie mutations through the existing finalizer; never
      // clear unrelated sessions or replace page checks with claims-only auth.
    }
  }

  logger.debug("http.request_handled", {
    request_id: correlationId,
    upstream_request_id: upstreamRequestId,
    route: pathname,
    duration_ms: Date.now() - startTime,
  });

  return finalizeResponse(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
