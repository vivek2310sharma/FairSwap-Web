import { NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface AuthenticatedRequestContext {
  user: User;
  client: SupabaseClient<Database>;
  authType: "bearer" | "cookie";
}

export interface RequestAuthFailure {
  error: "UNAUTHENTICATED";
  status: 401;
  message: string;
}

export type RequestAuthResult =
  | { success: true; context: AuthenticatedRequestContext }
  | { success: false; failure: RequestAuthFailure };

/**
 * Unified request-authentication abstraction for Route Handlers.
 *
 * Rules:
 * 1. If Authorization header is present:
 *    - It is AUTHORITATIVE.
 *    - Opaque token handling: validates format `Authorization: Bearer <token>` case-insensitively.
 *    - Never parses Supabase access tokens as JWTs manually.
 *    - Never falls back to cookies if Bearer is malformed, missing token, expired, or invalid.
 *    - Creates a user-scoped Supabase client executing with `Authorization: Bearer <token>`.
 * 2. If Authorization header is NOT present:
 *    - Authenticates via cookie-backed Supabase SSR server client (`createServerClient`).
 * 3. Never echoes, logs, or returns bearer tokens in responses or sanitized error messages.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<RequestAuthResult> {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== null) {
    // Authorization header present -> MUST NOT fall back to cookies under any circumstance
    const trimmed = authHeader.trim();
    const bearerMatch = trimmed.match(/^bearer\s+(\S+)$/i);

    if (!bearerMatch || !bearerMatch[1]) {
      return {
        success: false,
        failure: {
          error: "UNAUTHENTICATED",
          status: 401,
          message: "Authentication required.",
        },
      };
    }

    const token = bearerMatch[1];
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.STAGING_SUPABASE_URL ||
      "http://127.0.0.1:54321";
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sbp_local_anon_key_for_testing";

    const correlationId = request.headers.get("x-request-id") || undefined;

    // Create user-scoped client carrying the caller's Bearer token
    const userClient = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(correlationId ? { "x-request-id": correlationId } : {}),
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Validate token identity via Supabase Auth API
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return {
        success: false,
        failure: {
          error: "UNAUTHENTICATED",
          status: 401,
          message: "Authentication required.",
        },
      };
    }

    return {
      success: true,
      context: {
        user,
        client: userClient,
        authType: "bearer",
      },
    };
  }

  // No Authorization header -> Browser cookie authentication via Next.js SSR client
  const cookieClient = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await cookieClient.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      failure: {
        error: "UNAUTHENTICATED",
        status: 401,
        message: "Authentication required.",
      },
    };
  }

  return {
    success: true,
    context: {
      user,
      client: cookieClient,
      authType: "cookie",
    },
  };
}
