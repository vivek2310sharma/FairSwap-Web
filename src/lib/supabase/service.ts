import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Creates an elevated Supabase client using a privileged server secret.
 * 
 * In accordance with Point 16 security closure:
 * - Strictly server-only.
 * - Prefers modern SUPABASE_SECRET_KEY (sb_secret_...).
 * - Retains SUPABASE_SERVICE_ROLE_KEY only as temporary backward/local compatibility.
 * - Accepts modern secret keys without enforcing legacy JWT structure.
 * - Enforces persistSession: false, autoRefreshToken: false, detectSessionInUrl: false.
 */
export function createServiceRoleClient() {
  if (typeof window !== "undefined" && !process.env.VITEST) {
    throw new Error("createServiceRoleClient must only be called on the server.");
  }

  const supabaseUrl =
    process.env.STAGING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for privileged server operations");
  }

  // Accept modern sb_secret_... API keys or legacy/local JWT-compatible 3-segment structure
  // Never print or expose the secret value.
  const isModernSecret = secretKey.startsWith("sb_secret_");
  const segments = secretKey.split(".");
  const isJwt = segments.length === 3 && Boolean(segments[0]) && Boolean(segments[1]) && Boolean(segments[2]);

  if (!isModernSecret && !isJwt) {
    throw new Error("Privileged server secret key is not configured with a compatible credential format.");
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
