import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { deriveFirstName, deriveInitial } from "@/lib/account/overview";
import type { HeaderViewer } from "@/components/header";

/**
 * Minimal signed-in identity for the header (first name + initial) on /account/* routes.
 *
 * Uses `getClaims()`, which the request proxy already relies on, instead of an extra
 * `getUser()` round trip, plus one narrow `profiles` read. The result is display-only:
 * every account page still authenticates with `getUser()` before touching private data.
 * Any failure returns `null`, so the header falls back to the generic Account link.
 */
export async function loadHeaderViewer(): Promise<HeaderViewer | null> {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile?.display_name) return null;

    return {
      firstName: deriveFirstName(profile.display_name),
      initial: deriveInitial(profile.display_name),
    };
  } catch (error) {
    logger.warn("account.header_viewer_failed", {
      operation: "loadHeaderViewer",
      details: { reason: error instanceof Error ? error.name : "unknown" },
    });
    return null;
  }
}
