import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { planLegacyMediaStorageCleanup } from "../src/lib/media/legacy-storage-cleanup";

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

  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("[DRY RUN MODE ENABLED]");
  }

  // Configurable threshold in seconds (default: 3600 seconds)
  let thresholdSeconds = 3600;
  const thresholdArg = process.argv.find((a) => a.startsWith("--threshold-seconds="));
  if (thresholdArg) {
    const parsed = parseInt(thresholdArg.split("=")[1], 10);
    if (!isNaN(parsed) && parsed >= 0) {
      thresholdSeconds = parsed;
    }
  }

  // 1. Stale non-ready media: uploading, processing, or failed older than threshold
  const thresholdIso = new Date(Date.now() - thresholdSeconds * 1000).toISOString();
  console.log(`Querying stale media created before: ${thresholdIso} (threshold: ${thresholdSeconds}s)`);

  const { data: staleMedia, error: staleError } = await supabase
    .from("listing_media")
    .select("id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status, created_at")
    .in("processing_status", ["uploading", "processing", "failed"])
    .lte("created_at", thresholdIso);

  if (staleError) {
    console.error("Failed to query stale media:", staleError);
    process.exit(1);
  }

  if (!staleMedia || staleMedia.length === 0) {
    console.log("No stale non-ready media found.");
    console.log("Media cleanup complete.");
    return;
  }

  console.log(`Found ${staleMedia.length} stale/failed media record(s) older than threshold. Cleaning...`);

  let cleanedCount = 0;
  let failedCount = 0;

  for (const media of staleMedia) {
    const cleanupPlan = planLegacyMediaStorageCleanup(media.listing_id, media.id, {
      original_storage_path: media.original_storage_path,
      thumbnail_storage_path: media.thumbnail_storage_path,
      medium_storage_path: media.medium_storage_path,
      large_storage_path: media.large_storage_path,
    });

    if (cleanupPlan.kind === "deferred") {
      // Unexpected or V2 sealed paths are never removed by a legacy cleanup job.
      // Preserve DB metadata for the trusted retirement/reconciliation workflow.
      console.warn(`[DEFERRED] Skipping media ${media.id}: storage paths need trusted review`);
      failedCount++;
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] Would clean media ${media.id} (status: ${media.processing_status}, listing: ${media.listing_id})`);
      cleanedCount++;
      continue;
    }

    // Step A: Storage deletion first with explicit error checking
    let storageFailed = false;

    if (cleanupPlan.originals.length > 0) {
      const { error: origErr } = await supabase.storage
        .from("listing-originals")
        .remove(cleanupPlan.originals);
      if (origErr) {
        console.error(`[STORAGE ERROR] Failed to remove original for media ${media.id}:`, origErr.message);
        storageFailed = true;
      }
    }

    if (cleanupPlan.derivatives.length > 0 && !storageFailed) {
      const { error: derivErr } = await supabase.storage
        .from("listing-derivatives")
        .remove(cleanupPlan.derivatives);
      if (derivErr) {
        console.error(`[STORAGE ERROR] Failed to remove derivatives for media ${media.id}:`, derivErr.message);
        storageFailed = true;
      }
    }

    if (storageFailed) {
      console.warn(`[RETRYABLE] Skipping DB deletion for media ${media.id} to allow safe retry after storage recovery.`);
      failedCount++;
      continue;
    }

    // Step B: DB deletion only after storage cleanup succeeded
    const { error: rpcError } = await supabase.rpc("delete_listing_media_internal", {
      listing_id: media.listing_id,
      media_id: media.id,
    });

    if (rpcError) {
      console.error(`[DB ERROR] Failed to delete media row ${media.id}:`, rpcError.message);
      failedCount++;
    } else {
      console.log(`Cleaned stale media ${media.id} (status: ${media.processing_status})`);
      cleanedCount++;
    }
  }

  console.log(`Media cleanup complete. Cleaned ${cleanedCount}, failed ${failedCount} of ${staleMedia.length} record(s).`);
}

main().catch((err) => {
  console.error("Unexpected error in cleanup-orphan-media:", err);
  process.exit(1);
});
