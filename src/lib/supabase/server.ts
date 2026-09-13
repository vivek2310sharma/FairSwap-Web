import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sbp_local_anon_key_for_testing";

  let correlationId: string | undefined;
  try {
    const requestHeaders = await headers();
    correlationId = requestHeaders.get("x-request-id") || undefined;
  } catch {
    // Calling outside request context (e.g. build time or unit tests)
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    global: {
      headers: correlationId ? { "x-request-id": correlationId } : {},
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy/middleware refreshing user sessions.
        }
      },
    },
  });
}
