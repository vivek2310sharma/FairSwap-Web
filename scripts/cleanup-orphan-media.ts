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

  console.log("Starting technical orphan/stale media cleanup...");

  // 1. Stale non-ready media: uploading, processing, or failed older than 1 hour (threshold for local dev/testing)
  const thresholdIso = new Date(Date.now() - 3600 * 1000).toISOString();

  const { data: staleMedia, error: staleError } = await supabase
    .from("listing_media")
    .select("id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status, created_at")
    .in("processing_status", ["uploading", "processing", "failed"])
    .lte("created_at", thresholdIso);

  if (staleError) {
    console.error("Failed to query stale media:", staleError);
  } else if (staleMedia && staleMedia.length > 0) {
    console.log(`Found ${staleMedia.length} stale/failed media record(s) older than threshold. Cleaning...`);

    for (const media of staleMedia) {
      // Step A: Storage deletion first
      const derivativesToDelete: string[] = [];
      if (media.thumbnail_storage_path) derivativesToDelete.push(media.thumbnail_storage_path);
      if (media.medium_storage_path) derivativesToDelete.push(media.medium_storage_path);
      if (media.large_storage_path) derivativesToDelete.push(media.large_storage_path);

      if (media.original_storage_path) {
        await supabase.storage.from("listing-originals").remove([media.original_storage_path]);
      }
      if (derivativesToDelete.length > 0) {
        await supabase.storage.from("listing-derivatives").remove(derivativesToDelete);
      }

      // Step B: DB deletion after storage cleanup
      await supabase.rpc("delete_listing_media_internal", {
        listing_id: media.listing_id,
        media_id: media.id,
      });

      console.log(`Cleaned stale media ${media.id} (status: ${media.processing_status})`);
    }
  } else {
    console.log("No stale non-ready media found.");
  }

  console.log("Media cleanup complete.");
}

main().catch((err) => {
  console.error("Unexpected error in cleanup-orphan-media:", err);
  process.exit(1);
});
