import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

try {
  const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    proc.loadEnvFile(".env.local");
  }
} catch {
  // Ignore if file not found
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Checking for expired listings...");

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("[DRY RUN MODE ENABLED]");
  }

  const nowIso = new Date().toISOString();
  const { data: expiredListings, error } = await supabase
    .from("listings")
    .select("id, title, status, expires_at")
    .in("status", ["active", "reserved", "paused"])
    .lte("expires_at", nowIso);

  if (error) {
    console.error("Failed to query expired listings:", error);
    process.exit(1);
  }

  if (!expiredListings || expiredListings.length === 0) {
    console.log("No expired listings found.");
    return;
  }

  console.log(`Found ${expiredListings.length} expired listing(s). Processing...`);

  let expiredCount = 0;
  for (const listing of expiredListings) {
    if (isDryRun) {
      console.log(`[DRY RUN] Would expire listing: ${listing.id} ("${listing.title}")`);
      expiredCount++;
      continue;
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("expire_listing", {
      listing_id: listing.id,
    });

    if (rpcError) {
      console.error(`Failed to expire listing ${listing.id} (${listing.title}):`, rpcError);
    } else {
      const res = rpcData as { success?: boolean; reason?: string } | null;
      if (res && res.success === false) {
        console.log(`Skipped listing ${listing.id} ("${listing.title}"): ${res.reason}`);
      } else {
        console.log(`Successfully expired listing: ${listing.id} ("${listing.title}")`);
        expiredCount++;
      }
    }
  }

  console.log(`Expiry check complete. Expired ${expiredCount} of ${expiredListings.length} listing(s).`);
}

main().catch((err) => {
  console.error("Unexpected error in check-expired-listings:", err);
  process.exit(1);
});
