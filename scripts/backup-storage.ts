/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Load local environment variables safely
if (process.loadEnvFile && fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
}

interface StorageManifestEntry {
  bucket: string;
  name: string;
  sizeBytes: number;
  sha256: string;
  localPath: string;
}

async function listAllFiles(supabase: any, bucket: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  const { data: items, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
  if (error || !items) throw new Error(`Failed to list ${bucket}/${prefix}: ${error?.message}`);

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id || item.metadata === null) {
      const subFiles = await listAllFiles(supabase, bucket, fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith("--source=")) || args.find((a) => a.startsWith("--target="));
  const source = sourceArg ? sourceArg.split("=")[1] : "";

  if (source === "production") {
    console.error("CRITICAL ERROR: --source=production is strictly forbidden.");
    process.exit(1);
  }

  if (source !== "staging" && source !== "local") {
    console.error("CRITICAL ERROR: Explicit source required. Use --source=staging or --source=local. Aborting.");
    process.exit(1);
  }

  let supabaseUrl = "";
  let serviceKey = "";

  if (source === "staging") {
    supabaseUrl =
      process.env.STAGING_SUPABASE_URL ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("wpppxlnbzqynvhpeuavd")
        ? process.env.NEXT_PUBLIC_SUPABASE_URL
        : "https://wpppxlnbzqynvhpeuavd.supabase.co");
    serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

    if (!supabaseUrl || !serviceKey) {
      console.error("CRITICAL ERROR: Staging Supabase URL and SUPABASE_SERVICE_ROLE_KEY required.");
      process.exit(1);
    }

    if (!supabaseUrl.includes("wpppxlnbzqynvhpeuavd")) {
      console.error(`CRITICAL SAFETY ERROR: Staging URL mismatch. Expected 'wpppxlnbzqynvhpeuavd', got '${supabaseUrl}'`);
      process.exit(1);
    }
  } else if (source === "local") {
    supabaseUrl = process.env.LOCAL_SUPABASE_URL || "http://127.0.0.1:54321";
    serviceKey = process.env.LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (supabaseUrl.includes("supabase.co")) {
      console.error("CRITICAL SAFETY ERROR: Remote Supabase URL provided for local storage source.");
      process.exit(1);
    }
  }

  console.log(`=== FairSwap Disaster Recovery: Storage Backup [Source: ${source}] ===`);

  const backupDir = path.resolve(process.cwd(), "artifacts", "backups", "storage");
  const manifestFile = path.join(backupDir, "manifest.json");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const buckets = ["listing-originals", "listing-derivatives"];
  const manifestEntries: StorageManifestEntry[] = [];
  let totalDownloaded = 0;

  for (const bucket of buckets) {
    console.log(`Enumerating bucket '${bucket}'...`);
    const files = await listAllFiles(supabase, bucket);
    console.log(`Found ${files.length} objects in '${bucket}'. Downloading...`);

    for (const file of files) {
      const localDest = path.join(backupDir, bucket, ...file.split("/"));
      const localFolder = path.dirname(localDest);
      if (!fs.existsSync(localFolder)) {
        fs.mkdirSync(localFolder, { recursive: true });
      }

      const { data: blob, error } = await supabase.storage.from(bucket).download(file);
      if (error || !blob) {
        throw new Error(`Failed to download ${bucket}/${file}: ${error?.message}`);
      }

      const arrayBuf = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      fs.writeFileSync(localDest, buffer);

      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      const relativeLocalPath = path.join(bucket, ...file.split("/"));

      manifestEntries.push({
        bucket,
        name: file,
        sizeBytes: buffer.length,
        sha256: hash,
        localPath: relativeLocalPath,
      });

      totalDownloaded++;
      if (totalDownloaded % 15 === 0) {
        console.log(`  Downloaded and hashed ${totalDownloaded} objects...`);
      }
    }
  }

  const manifest = {
    sourceEnvironment: source === "staging" ? "FairSwapTest" : "local",
    projectRef: source === "staging" ? "wpppxlnbzqynvhpeuavd" : "local",
    timestamp: new Date().toISOString(),
    totalObjects: manifestEntries.length,
    totalBytes: manifestEntries.reduce((acc, curr) => acc + curr.sizeBytes, 0),
    objects: manifestEntries,
  };

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n=== Storage Backup Completed Successfully ===");
  console.log(`Total Objects: ${manifest.totalObjects}`);
  console.log(`Total Bytes: ${(manifest.totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Manifest: ${manifestFile}`);
}

main().catch((err) => {
  console.error("Unhandled storage backup error:", err);
  process.exit(1);
});
