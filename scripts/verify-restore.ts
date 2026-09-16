/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PGlite } from "@electric-sql/pglite";

// Load local environment variables safely
if (process.loadEnvFile && fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
}

const DB_BACKUP_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "fairswap_backup.json");
const DB_MANIFEST_FILE = path.resolve(process.cwd(), "artifacts", "backups", "database", "backup_manifest.json");

const STORAGE_BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "storage");
const STORAGE_MANIFEST_FILE = path.join(STORAGE_BACKUP_DIR, "manifest.json");

const DISPOSABLE_RECOVERY_BUCKETS = {
  originals: "recovery-test-originals",
  derivatives: "recovery-test-derivatives",
};

/**
 * Phase 1: Isolated Local Database Disaster Recovery Verification (Option B)
 * - Reconstructs schema and security definitions strictly from repository migrations in a fresh local database.
 * - Loads backed-up application data.
 * - Validates record counts, referential integrity, and Point 9B listing metadata.
 * - Leaves FairSwapTest completely untouched.
 */
async function verifyLocalDatabaseRestore(restoreTarget: string) {
  console.log("\n--- Phase 1: Isolated Local Database Disaster Recovery Verification (Option B) ---");
  const startTime = Date.now();

  // Safeguard: Ensure restore target is strictly local and never remote
  if (restoreTarget !== "local") {
    throw new Error(`CRITICAL ABORT: Attempted restore into illegal target '${restoreTarget}'. Only '--restore-target=local' is permitted.`);
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
  console.log(`Verified backup data integrity (SHA-256: ${currentHash.slice(0, 16)}...)`);

  const backupData = JSON.parse(fs.readFileSync(DB_BACKUP_FILE, "utf-8"));

  // Step 1: Initialize clean, completely isolated local in-process PostgreSQL engine
  console.log("Initializing clean, disposable local PostgreSQL engine (PGlite)...");
  const db = new PGlite();

  try {
    // Step 2: Bootstrap standard platform base environment
    console.log("Bootstrapping platform roles, schemas, and publications...");
    await db.exec(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $$;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT null::uuid $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$ SELECT 'anon'::text $$ LANGUAGE sql STABLE;
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$ SELECT '{}'::jsonb $$ LANGUAGE sql STABLE;

      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        public boolean DEFAULT false,
        avif_autodetection boolean DEFAULT false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text REFERENCES storage.buckets(id),
        name text,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        last_accessed_at timestamptz DEFAULT now(),
        metadata jsonb,
        path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
      );
    `);

    // Step 3: Apply the complete repository migration chain (Migrations 1 to 19)
    const migDir = path.resolve(process.cwd(), "supabase", "migrations");
    const migrationFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
    console.log(`Reconstructing schema from repository migration chain (${migrationFiles.length} migrations)...`);

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migDir, file), "utf8");
      await db.exec(sql);
    }
    console.log(`  [PASS] Successfully applied all ${migrationFiles.length} migrations through ${migrationFiles[migrationFiles.length - 1]}.`);

    // Step 4: Verify reconstructed security schema objects
    console.log("\nVerifying reconstructed security schema and objects...");
    const secFns = await db.query(`SELECT proname FROM pg_proc n JOIN pg_namespace m ON n.pronamespace = m.oid WHERE m.nspname = 'app_security';`);
    if (secFns.rows.length === 0) throw new Error("Security reconstruction error: app_security functions missing!");
    console.log(`  [PASS] Reconstructed ${secFns.rows.length} app_security functions from migration source.`);

    const rlsCount: any = await db.query(`SELECT count(*) as cnt FROM pg_policy;`);
    console.log(`  [PASS] Reconstructed ${rlsCount.rows[0].cnt} RLS security policies.`);

    const idxCount: any = await db.query(`SELECT count(*) as cnt FROM pg_indexes WHERE schemaname = 'public';`);
    console.log(`  [PASS] Reconstructed ${idxCount.rows[0].cnt} performance & reliability indexes.`);

    // Step 5: Seed auth identities to satisfy foreign-key constraints
    if (backupData.tables.user_accounts && backupData.tables.user_accounts.length > 0) {
      await db.exec(`ALTER TABLE auth.users DISABLE TRIGGER ALL;`);
      for (const ua of backupData.tables.user_accounts) {
        await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`, [
          ua.user_id,
          `user_${ua.user_id.slice(0, 8)}@example.com`,
        ]);
      }
      await db.exec(`ALTER TABLE auth.users ENABLE TRIGGER ALL;`);
    }

    // Step 6: Restore application data rows into reconstructed public tables
    console.log("\nRestoring backed-up application data rows into local environment...");
    const tableNames = Object.keys(backupData.tables);

    // Truncate all application tables before restoring to avoid conflicts with migration seed rows
    for (const table of [...tableNames].reverse()) {
      await db.query(`TRUNCATE TABLE public.${table} CASCADE;`);
    }

    // Disable triggers during data restore to prevent triggers from duplicating historical events
    for (const table of tableNames) {
      await db.exec(`ALTER TABLE public.${table} DISABLE TRIGGER ALL;`);
    }

    for (const table of tableNames) {
      const rows = backupData.tables[table];
      if (rows && rows.length > 0) {
        // Exclude generated columns
        const cols = Object.keys(rows[0]).filter((c) => c !== "search_vector");
        for (const row of rows) {
          const colNames = cols.map((c) => `"${c}"`).join(", ");
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          const values = cols.map((c) => {
            const v = row[c];
            if (typeof v === "object" && v !== null) return JSON.stringify(v);
            return v;
          });
          await db.query(`INSERT INTO public.${table} (${colNames}) VALUES (${placeholders});`, values);
        }
      }
      console.log(`  Restored table public.${table} with ${rows.length} rows.`);
    }

    // Re-enable triggers
    for (const table of tableNames) {
      await db.exec(`ALTER TABLE public.${table} ENABLE TRIGGER ALL;`);
    }

    // Step 7: Post-Restore Verification
    console.log("\nValidating restored record counts against backup manifest...");
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
      const restRes: any = await db.query(`SELECT count(*) as cnt FROM public.${table};`);
      const restCount = parseInt(String(restRes.rows[0]?.cnt || "0"), 10);
      const expectedCount = dbManifest.tableCounts[table] ?? 0;

      if (restCount !== expectedCount) {
        throw new Error(`Table ${table} record count mismatch: expected=${expectedCount}, restored=${restCount}`);
      }
      console.log(`  [PASS] Table public.${table}: count matches manifest (${restCount} rows)`);
    }

    // Step 8: Referential Integrity & Zero-Orphan Checks
    console.log("\nValidating referential integrity and zero-orphan invariants in restored data...");
    const orphanListings: any = await db.query(`
      SELECT count(*) as cnt 
      FROM public.listings l 
      LEFT JOIN public.user_accounts ua ON ua.user_id = l.seller_id 
      WHERE l.seller_id IS NOT NULL AND ua.user_id IS NULL;
    `);
    if (parseInt(String(orphanListings.rows[0]?.cnt || "0"), 10) > 0) throw new Error("Found orphan listings");
    console.log("  [PASS] Zero orphan listings (100% referential integrity with sellers)");

    const orphanMedia: any = await db.query(`
      SELECT count(*) as cnt 
      FROM public.listing_media lm 
      LEFT JOIN public.listings l ON l.id = lm.listing_id 
      WHERE l.id IS NULL;
    `);
    if (parseInt(String(orphanMedia.rows[0]?.cnt || "0"), 10) > 0) throw new Error("Found orphan listing_media");
    console.log("  [PASS] Zero orphan listing_media (100% referential integrity with listings)");

    const orphanMessages: any = await db.query(`
      SELECT count(*) as cnt 
      FROM public.messages m 
      LEFT JOIN public.conversations c ON c.id = m.conversation_id 
      WHERE c.id IS NULL;
    `);
    if (parseInt(String(orphanMessages.rows[0]?.cnt || "0"), 10) > 0) throw new Error("Found orphan messages");
    console.log("  [PASS] Zero orphan messages (100% referential integrity with conversations)");

    // Step 9: Point 9B listing content check
    const p9bRes: any = await db.query(`SELECT id, title, status FROM public.listings WHERE id = 'ac521430-db02-4441-931f-d39a8f0ffb02';`);
    const p9b = p9bRes.rows[0];
    if (!p9b || p9b.title !== "Bike" || p9b.status !== "active") {
      throw new Error(`Point 9B listing verification failed in restored data: ${JSON.stringify(p9b)}`);
    }
    console.log(`  [PASS] Point 9B Mountain Bike listing verified intact: status=${p9b.status}, title='${p9b.title}'`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nLocal database restore verification PASSED completely in ${elapsed}s.`);
    return { elapsedSeconds: parseFloat(elapsed), verified: true };
  } finally {
    console.log("Tearing down isolated local database engine...");
    await db.close();
    console.log("Disposable local database torn down cleanly.");
  }
}

/**
 * Phase 2: Storage Disaster Recovery Verification
 * Uses disposable recovery buckets (recovery-test-originals / recovery-test-derivatives)
 * with credentials read securely from environment variables.
 */
async function verifyStorageRestore() {
  console.log("\n--- Phase 2: Storage Disaster Recovery Verification ---");
  const startTime = Date.now();

  if (!fs.existsSync(STORAGE_MANIFEST_FILE)) {
    throw new Error(`Storage manifest missing at ${STORAGE_MANIFEST_FILE}. Run backup-storage.ts first.`);
  }

  const manifest = JSON.parse(fs.readFileSync(STORAGE_MANIFEST_FILE, "utf-8"));
  const entries: Array<{ bucket: string; name: string; sizeBytes: number; sha256: string; localPath: string }> =
    manifest.objects;

  console.log(`Loaded storage backup manifest with ${entries.length} objects.`);

  const supabaseUrl =
    process.env.STAGING_SUPABASE_URL ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("wpppxlnbzqynvhpeuavd")
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : "https://wpppxlnbzqynvhpeuavd.supabase.co");
  // Prefer modern SUPABASE_SECRET_KEY before legacy fallback
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Staging Supabase URL and SUPABASE_SECRET_KEY environment variables required for storage restore.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function purgeBucket(bucketName: string) {
    try {
      async function listAll(prefix = ""): Promise<string[]> {
        const res: string[] = [];
        const { data: items } = await supabase.storage.from(bucketName).list(prefix, { limit: 100 });
        if (!items) return res;
        for (const item of items) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
          if (!item.id || item.metadata === null) {
            res.push(...await listAll(fullPath));
          } else {
            res.push(fullPath);
          }
        }
        return res;
      }
      const files = await listAll();
      if (files.length > 0) {
        await supabase.storage.from(bucketName).remove(files);
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

    const p9bEntries = entries.filter((e) => e.name.includes("3fc849f5-9211-49cd-b1b4-74053300f0ec"));
    console.log(`\n  --- Point 9B Media Byte Verification (${p9bEntries.length} assets) ---`);
    for (const p of p9bEntries) {
      console.log(`  [MATCH] ${p.bucket}/${p.name}: size=${p.sizeBytes} bytes, SHA-256=${p.sha256}`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nStorage restore verification PASSED completely in ${elapsed}s.`);
    return { elapsedSeconds: parseFloat(elapsed), verified: true };
  } finally {
    console.log("Purging recovery objects and deleting disposable recovery buckets...");
    await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.originals);
    await purgeBucket(DISPOSABLE_RECOVERY_BUCKETS.derivatives);
    console.log("Disposable recovery buckets purged and deleted cleanly.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--restore-target=")) || args.find((a) => a.startsWith("--target="));
  const restoreTarget = targetArg ? targetArg.split("=")[1] : "";

  if (restoreTarget === "production" || restoreTarget === "staging") {
    console.error(`CRITICAL SAFETY ERROR: Restore target '${restoreTarget}' is strictly forbidden. Database restore must be isolated locally.`);
    process.exit(1);
  }

  if (restoreTarget !== "local") {
    console.error("CRITICAL ERROR: Explicit restore target required. Use --restore-target=local. Aborting.");
    process.exit(1);
  }

  console.log("===============================================================================");
  console.log(`   FAIRSWAP DISASTER RECOVERY & RESTORE VERIFICATION [TARGET: ${restoreTarget}]  `);
  console.log("===============================================================================");

  try {
    const dbResult = await verifyLocalDatabaseRestore(restoreTarget);
    const storageResult = await verifyStorageRestore();

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
