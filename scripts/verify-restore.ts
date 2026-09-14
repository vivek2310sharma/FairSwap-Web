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

const RESTORE_TARGET_DB = "fairswap_restore_test";
const PROD_DB_NAME = "postgres";

const DB_BACKUP_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "fairswap_backup.sql");
const DB_MANIFEST_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "backup_manifest.json");

const STORAGE_BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "storage");
const STORAGE_MANIFEST_FILE = path.resolve(STORAGE_BACKUP_DIR, "manifest.json");

const DISPOSABLE_RECOVERY_BUCKETS = {
  originals: "recovery-test-originals",
  derivatives: "recovery-test-derivatives",
};

function runPsql(db: string, sql: string): string {
  // Escape double quotes for powershell/bash passing to docker exec
  const escaped = sql.replace(/"/g, '\\"');
  return execSync(
    `docker exec ${CONTAINER_NAME} psql -U postgres -d ${db} -t -A -c "${escaped}"`,
    { encoding: "utf-8" }
  ).trim();
}

async function verifyDatabaseRestore() {
  console.log("\n--- Phase 1: Database Disaster Recovery Verification ---");

  // Safeguard 1: Abort if target is postgres or not fairswap_restore_test
  const targetDbName: string = RESTORE_TARGET_DB;
  if (targetDbName === PROD_DB_NAME || targetDbName !== "fairswap_restore_test") {
    throw new Error(`CRITICAL ABORT: Attempted restore into illegal target database '${RESTORE_TARGET_DB}'. Target must be exactly 'fairswap_restore_test'.`);
  }

  // Safeguard 2: Remote check
  if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
    throw new Error(`CRITICAL ABORT: Supabase URL ${SUPABASE_URL} appears remote. Restore verification only permitted locally.`);
  }

  if (!fs.existsSync(DB_BACKUP_FILE) || !fs.existsSync(DB_MANIFEST_FILE)) {
    throw new Error(`Backup file or manifest missing at ${DB_BACKUP_FILE}. Run backup-database.ts first.`);
  }

  // Verify SHA-256 of backup file before restoring
  const dbManifest = JSON.parse(fs.readFileSync(DB_MANIFEST_FILE, "utf-8"));
  const currentBuffer = fs.readFileSync(DB_BACKUP_FILE);
  const currentHash = crypto.createHash("sha256").update(currentBuffer).digest("hex");
  if (currentHash !== dbManifest.sha256) {
    throw new Error(`Integrity error: Database backup SHA-256 ${currentHash} does not match manifest ${dbManifest.sha256}`);
  }
  console.log(`Verified backup file integrity (SHA-256: ${currentHash.slice(0, 16)}...)`);

  // Step 1: Clean up any old restore database
  console.log(`Dropping any existing disposable database '${RESTORE_TARGET_DB}'...`);
  runPsql(PROD_DB_NAME, `DROP DATABASE IF EXISTS ${RESTORE_TARGET_DB};`);

  // Step 2: Create fresh empty restore test database
  console.log(`Creating fresh empty database '${RESTORE_TARGET_DB}'...`);
  runPsql(PROD_DB_NAME, `CREATE DATABASE ${RESTORE_TARGET_DB};`);

  try {
    // Step 3: Bootstrap prerequisites on fairswap_restore_test
    console.log("Bootstrapping extensions and required schemas on restore target...");
    runPsql(
      RESTORE_TARGET_DB,
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto"; CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS app_security; CREATE SCHEMA IF NOT EXISTS public;`
    );

    // Step 4: Copy dump into container and restore
    console.log(`Restoring dump into '${RESTORE_TARGET_DB}'...`);
    execSync(`docker cp "${DB_BACKUP_FILE}" ${CONTAINER_NAME}:/tmp/restore_test.sql`, { stdio: "inherit" });
    execSync(`docker exec ${CONTAINER_NAME} psql -U postgres -d ${RESTORE_TARGET_DB} -f /tmp/restore_test.sql`, {
      stdio: "ignore", // Suppress noisy DDL logs
    });

    // Step 5: Post-Restore Verification
    console.log("Validating restored schemas, tables, and record counts...");

    // Check schemas
    const schemasRaw = runPsql(
      RESTORE_TARGET_DB,
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public', 'app_security', 'auth') ORDER BY schema_name;`
    );
    const schemas = schemasRaw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (schemas.length !== 3) {
      throw new Error(`Missing required schemas in restored DB. Found: ${schemas.join(", ")}`);
    }
    console.log(`  [PASS] Required schemas present: ${schemas.join(", ")}`);

    // Verify key tables exist and check counts against active database
    const tablesToVerify = [
      "user_accounts",
      "profiles",
      "staff_roles",
      "categories",
      "listings",
      "listing_media",
      "conversations",
      "messages",
      "reports",
      "support_tickets",
      "audit_logs",
    ];

    for (const table of tablesToVerify) {
      const origCount = parseInt(runPsql(PROD_DB_NAME, `SELECT COUNT(*) FROM public.${table};`), 10);
      const restCount = parseInt(runPsql(RESTORE_TARGET_DB, `SELECT COUNT(*) FROM public.${table};`), 10);

      if (origCount !== restCount) {
        throw new Error(`Table ${table} record count mismatch: original=${origCount}, restored=${restCount}`);
      }
      console.log(`  [PASS] Table public.${table}: record count matches (${restCount} rows; source=${origCount}, restored=${restCount})`);
    }

    // Referential Integrity & Foreign Key / Orphan Checks
    console.log("Validating referential integrity and zero orphan invariants...");

    // 1. user_accounts without auth.users
    const orphanAccounts = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.user_accounts ua LEFT JOIN auth.users u ON u.id = ua.user_id WHERE u.id IS NULL;`
      ),
      10
    );
    if (orphanAccounts > 0) {
      throw new Error(`Found ${orphanAccounts} orphan user_accounts referencing missing auth.users`);
    }
    console.log("  [PASS] Zero orphan user_accounts (100% referential integrity with auth.users)");

    // 2. listings without valid seller
    const orphanListings = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.listings l LEFT JOIN public.user_accounts ua ON ua.user_id = l.seller_id WHERE l.seller_id IS NOT NULL AND ua.user_id IS NULL;`
      ),
      10
    );
    if (orphanListings > 0) {
      throw new Error(`Found ${orphanListings} orphan listings referencing missing seller`);
    }

    // Also verify any GDPR-anonymized listing (where seller was deleted) is correctly marked 'removed'
    const invalidAnonymizedListings = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.listings WHERE seller_id IS NULL AND status != 'removed';`
      ),
      10
    );
    if (invalidAnonymizedListings > 0) {
      throw new Error(`Found ${invalidAnonymizedListings} anonymized listings with status other than removed`);
    }
    console.log("  [PASS] Zero orphan listings (100% referential integrity with sellers; GDPR deleted accounts properly set to removed)");

    // 3. listing_media without valid listing
    const orphanMedia = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.listing_media lm LEFT JOIN public.listings l ON l.id = lm.listing_id WHERE l.id IS NULL;`
      ),
      10
    );
    if (orphanMedia > 0) {
      throw new Error(`Found ${orphanMedia} orphan listing_media referencing missing listings`);
    }
    console.log("  [PASS] Zero orphan listing_media (100% referential integrity with listings)");

    // 4. messages without valid conversation
    const orphanMessages = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.messages m LEFT JOIN public.conversations c ON c.id = m.conversation_id WHERE c.id IS NULL;`
      ),
      10
    );
    if (orphanMessages > 0) {
      throw new Error(`Found ${orphanMessages} orphan messages referencing missing conversations`);
    }
    console.log("  [PASS] Zero orphan messages (100% referential integrity with conversations)");

    // 5. support_tickets without valid user_account (when user_id is provided)
    const orphanSupportTickets = parseInt(
      runPsql(
        RESTORE_TARGET_DB,
        `SELECT COUNT(*) FROM public.support_tickets st LEFT JOIN public.user_accounts ua ON ua.user_id = st.user_id WHERE st.user_id IS NOT NULL AND ua.user_id IS NULL;`
      ),
      10
    );
    if (orphanSupportTickets > 0) {
      throw new Error(`Found ${orphanSupportTickets} orphan support_tickets referencing missing user_accounts`);
    }
    console.log("  [PASS] Zero orphan support_tickets (100% referential integrity with user_accounts)");

    console.log("Database restore verification PASSED completely.");
  } finally {
    // Step 6: Always drop fairswap_restore_test after verification
    console.log(`Dropping disposable database '${RESTORE_TARGET_DB}'...`);
    runPsql(PROD_DB_NAME, `DROP DATABASE IF EXISTS ${RESTORE_TARGET_DB};`);
    console.log(`Disposable database '${RESTORE_TARGET_DB}' dropped cleanly.`);
  }
}

async function verifyStorageRestore() {
  console.log("\n--- Phase 2: Storage Disaster Recovery Verification ---");

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

  // Safeguard: Verify we never touch production buckets
  const activeOrigHashBefore = runPsql(PROD_DB_NAME, `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'listing-originals';`);
  const activeDerivHashBefore = runPsql(PROD_DB_NAME, `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'listing-derivatives';`);

  // Step 1: Create disposable recovery buckets
  console.log(`Creating disposable recovery buckets: '${DISPOSABLE_RECOVERY_BUCKETS.originals}' and '${DISPOSABLE_RECOVERY_BUCKETS.derivatives}'...`);

  // Clean up any existing recovery buckets first
  await supabase.storage.emptyBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
  await supabase.storage.deleteBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
  await supabase.storage.emptyBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);
  await supabase.storage.deleteBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);

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
      if (uploadedCount % 30 === 0 || uploadedCount === entries.length) {
        console.log(`Uploaded ${uploadedCount} / ${entries.length} objects to recovery buckets...`);
      }
    }

    // Step 3: Re-download all objects from recovery buckets and recompute SHA-256
    console.log("Re-downloading objects from recovery buckets and verifying 100% SHA-256 manifest match...");
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
      if (verifiedCount % 30 === 0 || verifiedCount === entries.length) {
        console.log(`Verified SHA-256 match for ${verifiedCount} / ${entries.length} objects (100% identical)...`);
      }
    }

    console.log(`  [PASS] 100% (${verifiedCount}/${entries.length}) of restored objects matched their exact expected SHA-256 values.`);

    // Safeguard verification: active FairSwap buckets were never altered
    const activeOrigHashAfter = runPsql(PROD_DB_NAME, `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'listing-originals';`);
    const activeDerivHashAfter = runPsql(PROD_DB_NAME, `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'listing-derivatives';`);

    if (activeOrigHashBefore !== activeOrigHashAfter || activeDerivHashBefore !== activeDerivHashAfter) {
      throw new Error("CRITICAL SAFETY VIOLATION: Active production storage buckets were modified during restore verification!");
    }
    console.log("  [PASS] Active FairSwap storage buckets were NOT modified during recovery verification.");

  } finally {
    // Step 4: Purge and delete recovery buckets
    console.log("Purging recovery objects and deleting disposable recovery buckets...");
    await supabase.storage.emptyBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
    await supabase.storage.deleteBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);

    await supabase.storage.emptyBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);
    await supabase.storage.deleteBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);
    console.log("Disposable recovery buckets purged and deleted cleanly.");
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("   FAIRSWAP DISASTER RECOVERY & INTEGRITY VERIFICATION (MILESTONE 1.6 r4)      ");
  console.log("===============================================================================");

  try {
    await verifyDatabaseRestore();
    await verifyStorageRestore();

    console.log("\n===============================================================================");
    console.log("   DISASTER RECOVERY VERIFICATION RESULT: COMPLETE PASS (100% VERIFIED)        ");
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
