/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

const BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "database");
const BACKUP_FILE = path.join(BACKUP_DIR, "fairswap_backup.json");
const MANIFEST_FILE = path.join(BACKUP_DIR, "backup_manifest.json");

const TABLES_TO_BACKUP = [
  "categories",
  "cities",
  "user_accounts",
  "profiles",
  "staff_roles",
  "listings",
  "listing_media",
  "listing_status_transitions",
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
  "audit_logs"
];

function runSql(sql: string, source: string) {
  const tmpFile = path.join(process.cwd(), `tmp-dump-${Date.now()}-${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tmpFile, sql, "utf8");
  try {
    let cmd = "";
    if (source === "staging") {
      cmd = `npx supabase db query --linked --file "${tmpFile}"`;
    } else if (source === "local") {
      // Must NOT use --linked for local!
      const localDbUrl = process.env.LOCAL_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
      if (localDbUrl.includes("supabase.co")) {
        throw new Error("CRITICAL SAFETY VIOLATION: Remote database URL supplied for local source");
      }
      cmd = `npx supabase db query --local --file "${tmpFile}"`;
    } else {
      throw new Error(`Unsupported source: ${source}`);
    }

    const res = execSync(cmd, {
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

  console.log(`=== FairSwap Disaster Recovery: Database Backup [Source: ${source}] ===`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tableData: Record<string, any[]> = {};
  const tableCounts: Record<string, number> = {};

  for (const table of TABLES_TO_BACKUP) {
    console.log(`Exporting table public.${table}...`);
    const res = runSql(`SELECT * FROM public.${table};`, source);
    tableData[table] = res.rows || [];
    tableCounts[table] = (res.rows || []).length;
    console.log(`  Captured ${tableCounts[table]} rows from public.${table}.`);
  }

  // Query migration versions from supabase_migrations.schema_migrations
  console.log("Exporting schema migration history...");
  const migRes = runSql("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC;", source);
  const migrations = (migRes.rows || []).map((r: any) => r.version);
  console.log(`  Captured ${migrations.length} migration versions (latest: ${migrations[migrations.length - 1]}).`);

  // Write database backup artifact
  const backupPayload = {
    sourceEnvironment: source === "staging" ? "FairSwapTest" : "local",
    projectRef: source === "staging" ? "wpppxlnbzqynvhpeuavd" : "local",
    timestamp: new Date().toISOString(),
    migrations,
    dataSchemasCaptured: ["public"],
    schemaReconstructionSource: "repository migrations",
    tables: tableData,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  fs.writeFileSync(BACKUP_FILE, jsonString, "utf8");

  const stats = fs.statSync(BACKUP_FILE);
  const hash = crypto.createHash("sha256").update(Buffer.from(jsonString)).digest("hex");

  const manifest = {
    sourceEnvironment: source === "staging" ? "FairSwapTest" : "local",
    projectRef: source === "staging" ? "wpppxlnbzqynvhpeuavd" : "local",
    timestamp: new Date().toISOString(),
    filename: "fairswap_backup.json",
    sizeBytes: stats.size,
    sha256: hash,
    dataSchemasCaptured: ["public"],
    schemaReconstructionSource: "repository migrations",
    migrationsCaptured: migrations.length,
    latestMigration: migrations[migrations.length - 1],
    tableCounts,
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\n=== Database Backup Completed Successfully ===");
  console.log(`Backup File: ${BACKUP_FILE}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`SHA-256: ${hash}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch((err) => {
  console.error("Unhandled database backup error:", err);
  process.exit(1);
});
