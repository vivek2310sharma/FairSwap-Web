import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Creates an elevated Supabase client using the service role key.
 * 
 * TODO: Legacy JWT service_role compatibility is temporary and must migrate
 * to the modern Supabase secret-key path (SUPABASE_SECRET_KEY) before legacy
 * key retirement, once the selected SDK/Storage path supports modern-key behavior correctly.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service-role operations");
  }

  // Require a JWT-compatible 3-segment structure (header.payload.signature)
  // Never print or inspect the key or segment values.
  const segments = serviceRoleKey.split(".");
  if (segments.length !== 3 || !segments[0] || !segments[1] || !segments[2]) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured with a compatible server credential.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

