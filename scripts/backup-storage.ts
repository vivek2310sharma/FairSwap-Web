/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcHB4bG5ienF5bnZocGV1YXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTMyMzQxNywiZXhwIjoyMTA0ODk5NDE3fQ.V1IHV-8SvzKqqYyQ6fn1UMYyzsaGPO2ho7KQiRObm2U";

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
    // In Supabase storage, folders have id = null or metadata = null
    if (!item.id || item.metadata === null) {
      // Subdirectory
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
  const targetArg = args.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "";

  if (target === "production") {
    console.error("CRITICAL ERROR: --target=production is forbidden during Point 16 operations.");
    process.exit(1);
  }

  if (target !== "staging" && target !== "local") {
    console.error("CRITICAL ERROR: Explicit target required. Use --target=staging or --target=local. Aborting.");
    process.exit(1);
  }

  console.log(`=== FairSwap Disaster Recovery: Storage Backup [Target: ${target}] ===`);

  const backupDir = path.resolve(process.cwd(), "artifacts", "backups", "storage");
  const manifestFile = path.join(backupDir, "manifest.json");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
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
      manifestEntries.push({
        bucket,
        name: file,
        sizeBytes: buffer.length,
        sha256: hash,
        localPath: path.relative(backupDir, localDest).replace(/\\/g, "/"),
      });

      totalDownloaded++;
      if (totalDownloaded % 10 === 0 || totalDownloaded === files.length) {
        console.log(`  Downloaded ${totalDownloaded} objects...`);
      }
    }
  }

  const manifest = {
    targetEnvironment: target,
    projectRef: "wpppxlnbzqynvhpeuavd",
    timestamp: new Date().toISOString(),
    totalObjects: manifestEntries.length,
    buckets,
    objects: manifestEntries,
  };

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf-8");

  console.log(`\n=== Storage Backup Completed Successfully ===`);
  console.log(`Total Objects: ${manifestEntries.length}`);
  console.log(`Manifest File: ${manifestFile}`);
}

main().catch((err) => {
  console.error("Unhandled storage backup error:", err);
  process.exit(1);
});
