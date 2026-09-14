import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const CONTAINER_NAME = "supabase_db_fairswap-local";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const STORAGE_BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "storage");
const MANIFEST_FILE = path.join(STORAGE_BACKUP_DIR, "manifest.json");

interface StorageManifestEntry {
  bucket: string;
  name: string;
  sizeBytes: number;
  sha256: string;
  localPath: string;
}

async function main() {
  console.log("=== FairSwap Disaster Recovery: Storage Backup ===");
  console.log(`Endpoint: ${SUPABASE_URL}`);
  console.log(`Local Backup Directory: ${STORAGE_BACKUP_DIR}`);

  if (!fs.existsSync(STORAGE_BACKUP_DIR)) {
    fs.mkdirSync(STORAGE_BACKUP_DIR, { recursive: true });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Get authoritative list of all storage objects across all buckets
  console.log("Querying storage.objects for full inventory...");
  let rawOutput = "";
  try {
    rawOutput = execSync(
      `docker exec ${CONTAINER_NAME} psql -U postgres -d postgres -t -A -c "SELECT bucket_id, name FROM storage.objects ORDER BY bucket_id, name;"`,
      { encoding: "utf-8" }
    ).trim();
  } catch (err) {
    console.error("Failed to query storage.objects from container:", err);
    process.exit(1);
  }

  const lines = rawOutput.split("\n").map((l) => l.trim()).filter(Boolean);
  console.log(`Discovered ${lines.length} objects across buckets.`);

  const manifestEntries: StorageManifestEntry[] = [];
  let downloadedCount = 0;

  for (const line of lines) {
    const [bucket, ...nameParts] = line.split("|");
    const name = nameParts.join("|");

    if (!bucket || !name) continue;

    const localDest = path.join(STORAGE_BACKUP_DIR, bucket, ...name.split("/"));
    const localDir = path.dirname(localDest);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    // Download object from Supabase Storage
    const { data: blob, error } = await supabase.storage.from(bucket).download(name);
    if (error || !blob) {
      console.error(`Failed to download ${bucket}/${name}:`, error?.message);
      process.exit(1);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(localDest, buffer);

    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    manifestEntries.push({
      bucket,
      name,
      sizeBytes: buffer.length,
      sha256: hash,
      localPath: path.relative(STORAGE_BACKUP_DIR, localDest).replace(/\\/g, "/"),
    });

    downloadedCount++;
    if (downloadedCount % 25 === 0 || downloadedCount === lines.length) {
      console.log(`Downloaded ${downloadedCount} / ${lines.length} objects...`);
    }
  }

  const manifest = {
    timestamp: new Date().toISOString(),
    totalObjects: manifestEntries.length,
    buckets: ["listing-originals", "listing-derivatives"],
    objects: manifestEntries,
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("=== Storage Backup Completed Successfully ===");
  console.log(`Total Objects: ${manifestEntries.length}`);
  console.log(`Manifest written to: ${MANIFEST_FILE}`);
}

main().catch((err) => {
  console.error("Unhandled storage backup error:", err);
  process.exit(1);
});
