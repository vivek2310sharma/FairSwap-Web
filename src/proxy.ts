import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveCorrelationId, sanitizeUpstreamRequestId } from "@/lib/logger/correlation";
import { logger } from "@/lib/logger";

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const incomingId = request.headers.get("x-request-id") || request.headers.get("x-correlation-id");
  const upstreamRequestId = sanitizeUpstreamRequestId(incomingId);
  // Authoritative correlation ID is ALWAYS server-generated for external requests
  const correlationId = resolveCorrelationId();

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

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesMutated = true;
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        response.headers.set("x-request-id", correlationId);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
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

  // 2. Enforce Cache-Control: private, no-store on response when mutating auth cookies
  if (cookiesMutated) {
    response.headers.set("Cache-Control", "private, no-store, must-revalidate");
  }

  const { pathname } = request.nextUrl;

  // 3. Route Guard: Protected Account Paths (/account/*)
  if (pathname.startsWith("/account")) {
    if (!isAuthenticated) {
      logger.info("auth.redirect_unauthenticated", {
        request_id: correlationId,
        route: pathname,
      });
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(signInUrl);
      redirectRes.headers.set("x-request-id", correlationId);
      return redirectRes;
    }
  }

  // 4. Route Guard: Protected Staff Paths (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      logger.info("auth.redirect_unauthenticated", {
        request_id: correlationId,
        route: pathname,
      });
      const signInUrl = new URL("/auth/sign-in", request.url);
      signInUrl.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(signInUrl);
      redirectRes.headers.set("x-request-id", correlationId);
      return redirectRes;
    }
  }

  // 5. Auth Pages (/auth/sign-in, /auth/sign-up): Redirect already-authenticated users
  if (pathname === "/auth/sign-in" || pathname === "/auth/sign-up") {
    if (isAuthenticated) {
      const redirectRes = NextResponse.redirect(new URL("/account", request.url));
      redirectRes.headers.set("x-request-id", correlationId);
      return redirectRes;
    }
  }

  logger.debug("http.request_handled", {
    request_id: correlationId,
    upstream_request_id: upstreamRequestId,
    route: pathname,
    duration_ms: Date.now() - startTime,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
