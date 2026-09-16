/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wpppxlnbzqynvhpeuavd.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcHB4bG5ienF5bnZocGV1YXZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTMyMzQxNywiZXhwIjoyMTA0ODk5NDE3fQ.V1IHV-8SvzKqqYyQ6fn1UMYyzsaGPO2ho7KQiRObm2U";

const RESTORE_TARGET_SCHEMA = "fairswap_restore_test";

const DB_BACKUP_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "fairswap_backup.json");
const DB_MANIFEST_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "backup_manifest.json");

const STORAGE_BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "storage");
const STORAGE_MANIFEST_FILE = path.resolve(STORAGE_BACKUP_DIR, "manifest.json");

const DISPOSABLE_RECOVERY_BUCKETS = {
  originals: "recovery-test-originals",
  derivatives: "recovery-test-derivatives",
};

function runSql(sql: string) {
  const tmpFile = path.join(process.cwd(), `tmp-restore-${Date.now()}-${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf8");
  try {
    const res = execSync(`npx supabase db query --linked --file "${tmpFile}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const startIdx = res.indexOf('{\n  "boundary"');
    if (startIdx !== -1) {
      return JSON.parse(res.slice(startIdx));
    }
    return { rows: [] };
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

async function verifyDatabaseRestore(target: string) {
  console.log("\n--- Phase 1: Database Disaster Recovery Verification ---");
  const startTime = Date.now();

  // Safeguard 1: Abort if target is production
  if (target === "production") {
    throw new Error(`CRITICAL ABORT: Attempted restore into illegal target environment 'production'.`);
  }

  if (!fs.existsSync(DB_BACKUP_FILE) || !fs.existsSync(DB_MANIFEST_FILE)) {
    throw new Error(`Backup file or manifest missing. Run backup-database.ts first.`);
  }

  // Verify SHA-256 of backup file before restoring
  const dbManifest = JSON.parse(fs.readFileSync(DB_MANIFEST_FILE, "utf-8"));
  const currentBuffer = fs.readFileSync(DB_BACKUP_FILE);
  const currentHash = crypto.createHash("sha256").update(currentBuffer).digest("hex");
  if (currentHash !== dbManifest.sha256) {
    throw new Error(`Integrity error: Database backup SHA-256 ${currentHash} does not match manifest ${dbManifest.sha256}`);
  }
  console.log(`Verified backup file integrity (SHA-256: ${currentHash.slice(0, 16)}...)`);

  const backupData = JSON.parse(fs.readFileSync(DB_BACKUP_FILE, "utf-8"));

  // Step 1: Clean up any old restore schema
  console.log(`Dropping any existing disposable restore schema '${RESTORE_TARGET_SCHEMA}'...`);
  runSql(`DROP SCHEMA IF EXISTS ${RESTORE_TARGET_SCHEMA} CASCADE;`);

  // Step 2: Create fresh empty restore schema
  console.log(`Creating fresh empty schema '${RESTORE_TARGET_SCHEMA}'...`);
  runSql(`CREATE SCHEMA ${RESTORE_TARGET_SCHEMA};`);

  try {
    // Step 3: Restore tables into fairswap_restore_test schema
    console.log("Restoring tables and rows into isolated schema...");

    const tableNames = Object.keys(backupData.tables);
    for (const table of tableNames) {
      const rows = backupData.tables[table];
      // Clone table structure from public into fairswap_restore_test
      runSql(`CREATE TABLE ${RESTORE_TARGET_SCHEMA}.${table} (LIKE public.${table} INCLUDING ALL);`);

      // Populate rows if any exist
      if (rows.length > 0) {
        // Filter out generated columns (e.g. search_vector)
        const cols = Object.keys(rows[0]).filter((c) => c !== "search_vector");

        const rowValues = rows.map((row: any) => {
          const values = cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
            if (typeof v === "number" || typeof v === "boolean") return `${v}`;
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          return `(${values.join(", ")})`;
        });

        // Batch insert in chunks of 50
        for (let i = 0; i < rowValues.length; i += 50) {
          const chunk = rowValues.slice(i, i + 50);
          runSql(`INSERT INTO ${RESTORE_TARGET_SCHEMA}.${table} (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${chunk.join(",\n")};`);
        }
      }
      console.log(`  Restored table ${RESTORE_TARGET_SCHEMA}.${table} with ${rows.length} rows.`);
    }

    // Step 4: Post-Restore Verification
    console.log("\nValidating restored tables, record counts, and data integrity...");

    // Check counts against manifest snapshot
    const tablesToVerify = [
      "user_accounts",
      "profiles",
      "staff_roles",
      "categories",
      "cities",
      "listings",
      "listing_media",
      "favourites",
      "conversations",
      "messages",
      "conversation_read_states",
      "user_blocks",
      "notifications",
      "reports",
      "support_tickets",
      "support_messages",
      "privacy_requests",
      "audit_logs",
    ];

    for (const table of tablesToVerify) {
      const restRes = runSql(`SELECT COUNT(*) as cnt FROM ${RESTORE_TARGET_SCHEMA}.${table};`);
      const restCount = parseInt(restRes.rows[0]?.cnt || "0", 10);
      const expectedCount = dbManifest.tableCounts[table] ?? 0;

      if (restCount !== expectedCount) {
        throw new Error(`Table ${table} record count mismatch: expected=${expectedCount}, restored=${restCount}`);
      }
      console.log(`  [PASS] Table ${RESTORE_TARGET_SCHEMA}.${table}: count matches manifest (${restCount} rows)`);
    }

    // Referential Integrity & Foreign Key / Orphan Checks in restored data
    console.log("\nValidating referential integrity and zero-orphan invariants in restored data...");

    // 1. user_accounts without auth.users (auth is managed)
    const orphanAccounts = runSql(`
      SELECT COUNT(*) as cnt 
      FROM ${RESTORE_TARGET_SCHEMA}.user_accounts ua 
      LEFT JOIN auth.users u ON u.id = ua.user_id 
      WHERE u.id IS NULL;
    `);
    const orphanAccountsCount = parseInt(orphanAccounts.rows[0]?.cnt || "0", 10);
    if (orphanAccountsCount > 0) throw new Error(`Found ${orphanAccountsCount} orphan user accounts`);
    console.log("  [PASS] Zero orphan user_accounts (100% referential integrity with auth.users)");

    // 2. listings without valid seller
    const orphanListings = runSql(`
      SELECT COUNT(*) as cnt 
      FROM ${RESTORE_TARGET_SCHEMA}.listings l 
      LEFT JOIN ${RESTORE_TARGET_SCHEMA}.user_accounts ua ON ua.user_id = l.seller_id 
      WHERE l.seller_id IS NOT NULL AND ua.user_id IS NULL;
    `);
    const orphanListingsCount = parseInt(orphanListings.rows[0]?.cnt || "0", 10);
    if (orphanListingsCount > 0) throw new Error(`Found ${orphanListingsCount} orphan listings`);
    console.log("  [PASS] Zero orphan listings (100% referential integrity with sellers)");

    // 3. listing_media without valid listing
    const orphanMedia = runSql(`
      SELECT COUNT(*) as cnt 
      FROM ${RESTORE_TARGET_SCHEMA}.listing_media lm 
      LEFT JOIN ${RESTORE_TARGET_SCHEMA}.listings l ON l.id = lm.listing_id 
      WHERE l.id IS NULL;
    `);
    const orphanMediaCount = parseInt(orphanMedia.rows[0]?.cnt || "0", 10);
    if (orphanMediaCount > 0) throw new Error(`Found ${orphanMediaCount} orphan listing_media`);
    console.log("  [PASS] Zero orphan listing_media (100% referential integrity with listings)");

    // 4. messages without valid conversation
    const orphanMessages = runSql(`
      SELECT COUNT(*) as cnt 
      FROM ${RESTORE_TARGET_SCHEMA}.messages m 
      LEFT JOIN ${RESTORE_TARGET_SCHEMA}.conversations c ON c.id = m.conversation_id 
      WHERE c.id IS NULL;
    `);
    const orphanMessagesCount = parseInt(orphanMessages.rows[0]?.cnt || "0", 10);
    if (orphanMessagesCount > 0) throw new Error(`Found ${orphanMessagesCount} orphan messages`);
    console.log("  [PASS] Zero orphan messages (100% referential integrity with conversations)");

    // 5. Point 9B listing content check
    const p9bListingRes = runSql(`SELECT id, title, status, seller_id FROM ${RESTORE_TARGET_SCHEMA}.listings WHERE id = 'ac521430-db02-4441-931f-d39a8f0ffb02';`);
    const p9bListing = p9bListingRes.rows[0];
    if (!p9bListing || p9bListing.title !== "Bike" || p9bListing.status !== "active") {
      throw new Error(`Point 9B listing verification failed in restored data: ${JSON.stringify(p9bListing)}`);
    }
    console.log(`  [PASS] Point 9B Mountain Bike listing verified intact: status=${p9bListing.status}, title='${p9bListing.title}'`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nDatabase restore verification PASSED completely in ${elapsed}s.`);
    return { elapsedSeconds: parseFloat(elapsed), verified: true };
  } finally {
    // Step 5: Always drop fairswap_restore_test after verification
    console.log(`Dropping disposable schema '${RESTORE_TARGET_SCHEMA}'...`);
    runSql(`DROP SCHEMA IF EXISTS ${RESTORE_TARGET_SCHEMA} CASCADE;`);
    console.log(`Disposable schema '${RESTORE_TARGET_SCHEMA}' dropped cleanly.`);
  }
}

async function verifyStorageRestore(target: string) {
  console.log("\n--- Phase 2: Storage Disaster Recovery Verification ---");
  const startTime = Date.now();

  if (target === "production") {
    throw new Error("CRITICAL ABORT: Cannot verify storage restore against production.");
  }

  if (!fs.existsSync(STORAGE_MANIFEST_FILE)) {
    throw new Error(`Storage manifest missing at ${STORAGE_MANIFEST_FILE}. Run backup-storage.ts first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(STORAGE_MANIFEST_FILE, "utf-8"));
  const entries: Array<{ bucket: string; name: string; sizeBytes: number; sha256: string; localPath: string }> =
    manifest.objects;

  console.log(`Loaded storage backup manifest with ${entries.length} objects.`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Step 1: Create disposable recovery buckets
  async function purgeBucket(bucketName: string) {
    try {
      const { data: files } = await supabase.storage.from(bucketName).list("", { limit: 100 });
      if (files && files.length > 0) {
        await supabase.storage.from(bucketName).remove(files.map((f: any) => f.name));
      }
      await supabase.storage.emptyBucket(bucketName);
      await new Promise((r) => setTimeout(r, 500));
      await supabase.storage.deleteBucket(bucketName);
    } catch {
      // ignore not found or already deleted
    }
  }

  // Clean up any existing recovery buckets first
  await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
  await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);

  console.log(`Creating disposable recovery buckets: '${DISPOSABLE_RECOVERY_BUCKETS.originals}' and '${DISPOSABLE_RECOVERY_BUCKETS.derivatives}'...`);
  const { error: b1Err } = await supabase.storage.createBucket(DISPOSABLE_RECOVERY_BUCKETS.originals, { public: false });
  if (b1Err && !b1Err.message.includes("already exists")) throw b1Err;

  const { error: b2Err } = await supabase.storage.createBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives, { public: false });
  if (b2Err && !b2Err.message.includes("already exists")) throw b2Err;

  try {
    // Step 2: Upload backup files to recovery buckets
    console.log("Uploading backed up objects into disposable recovery buckets...");
    let uploadedCount = 0;

    for (const item of entries) {
      const targetBucket =
        item.bucket === "listing-originals"
          ? DISPOSABLE_RECOVERY_BUCKETS.originals
          : DISPOSABLE_RECOVERY_BUCKETS.derivatives;

      const localFile = path.join(STORAGE_BACKUP_DIR, item.localPath);
      const fileBuffer = fs.readFileSync(localFile);

      const { error: upErr } = await supabase.storage.from(targetBucket).upload(item.name, fileBuffer, {
        upsert: true,
        contentType: item.name.endsWith(".jpg") ? "image/jpeg" : "image/webp",
      });

      if (upErr) {
        throw new Error(`Failed to upload to recovery bucket ${targetBucket}/${item.name}: ${upErr.message}`);
      }

      uploadedCount++;
      if (uploadedCount % 15 === 0 || uploadedCount === entries.length) {
        console.log(`  Uploaded ${uploadedCount} / ${entries.length} objects to recovery buckets...`);
      }
    }

    // Step 3: Re-download all objects from recovery buckets and recompute SHA-256
    console.log("\nRe-downloading objects from recovery buckets and verifying 100% SHA-256 manifest match...");
    let verifiedCount = 0;

    for (const item of entries) {
      const targetBucket =
        item.bucket === "listing-originals"
          ? DISPOSABLE_RECOVERY_BUCKETS.originals
          : DISPOSABLE_RECOVERY_BUCKETS.derivatives;

      const { data: blob, error: downErr } = await supabase.storage.from(targetBucket).download(item.name);
      if (downErr || !blob) {
        throw new Error(`Failed to download restored object ${targetBucket}/${item.name}: ${downErr?.message}`);
      }

      const arrayBuf = await blob.arrayBuffer();
      const downloadedBuffer = Buffer.from(arrayBuf);
      const recomputedHash = crypto.createHash("sha256").update(downloadedBuffer).digest("hex");

      if (recomputedHash !== item.sha256) {
        throw new Error(`SHA-256 MISMATCH for ${targetBucket}/${item.name}! Expected: ${item.sha256}, Got: ${recomputedHash}`);
      }

      verifiedCount++;
    }

    console.log(`  [PASS] 100% (${verifiedCount}/${entries.length}) of restored objects matched their exact expected SHA-256 values.`);

    // Point 9B Specific hash report
    const p9bEntries = entries.filter((e) => e.name.includes("3fc849f5-9211-49cd-b1b4-74053300f0ec"));
    console.log(`\n  --- Point 9B Media Byte Verification (${p9bEntries.length} assets) ---`);
    for (const p of p9bEntries) {
      console.log(`  [MATCH] ${p.bucket}/${p.name}: size=${p.sizeBytes} bytes, SHA-256=${p.sha256}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nStorage restore verification PASSED completely in ${elapsed}s.`);
    return { elapsedSeconds: parseFloat(elapsed), verified: true };
  } finally {
    // Step 4: Purge and delete recovery buckets
    console.log("Purging recovery objects and deleting disposable recovery buckets...");
    await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
    await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);
    console.log("Disposable recovery buckets purged and deleted cleanly.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "";

  if (target !== "staging" && target !== "local") {
    console.error("CRITICAL ERROR: Explicit target required. Use --target=staging or --target=local. Aborting.");
    process.exit(1);
  }

  console.log("===============================================================================");
  console.log(`   FAIRSWAP DISASTER RECOVERY & RESTORE VERIFICATION [TARGET: ${target}]       `);
  console.log("===============================================================================");

  try {
    const dbResult = await verifyDatabaseRestore(target);
    const storageResult = await verifyStorageRestore(target);

    console.log("\n===============================================================================");
    console.log("   DISASTER RECOVERY VERIFICATION RESULT: COMPLETE PASS (100% VERIFIED)        ");
    console.log(`   Total Recovery Duration: ${(dbResult.elapsedSeconds + storageResult.elapsedSeconds).toFixed(2)}s`);
    console.log("===============================================================================\n");
  } catch (err) {
    console.error("\n===============================================================================");
    console.error("   DISASTER RECOVERY VERIFICATION FAILED:                                      ");
    console.error(err);
    console.error("===============================================================================\n");
    process.exit(1);
  }
}

main();
