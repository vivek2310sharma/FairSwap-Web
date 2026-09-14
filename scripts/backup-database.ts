import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CONTAINER_NAME = "supabase_db_fairswap-local";
const BACKUP_DIR = path.resolve(process.cwd(), "artifacts", "backups", "database");
const BACKUP_FILE = path.join(BACKUP_DIR, "fairswap_backup.sql");
const MANIFEST_FILE = path.join(BACKUP_DIR, "backup_manifest.json");

async function main() {
  console.log("=== FairSwap Disaster Recovery: Database Backup ===");
  console.log(`Target Container: ${CONTAINER_NAME}`);
  console.log(`Local Backup Directory: ${BACKUP_DIR}`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Verify container is running
  try {
    const running = execSync(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`, {
      encoding: "utf-8",
    }).trim();

    if (!running.includes(CONTAINER_NAME)) {
      throw new Error(`Container ${CONTAINER_NAME} is not running.`);
    }
  } catch (err) {
    console.error("Failed to verify container status:", err);
    process.exit(1);
  }

  // 2. Execute pg_dump inside container
  console.log("Executing pg_dump inside container for schemas public, app_security, auth...");
  const dumpCmd = `docker exec ${CONTAINER_NAME} pg_dump -U postgres -d postgres --schema=public --schema=app_security --schema=auth --clean --if-exists -f /tmp/fairswap_db_dump.sql`;
  try {
    execSync(dumpCmd, { stdio: "inherit" });
  } catch (err) {
    console.error("pg_dump command failed:", err);
    process.exit(1);
  }

  // 3. Copy dump file out of container to local workspace
  console.log(`Copying dump from container to ${BACKUP_FILE}...`);
  try {
    execSync(`docker cp ${CONTAINER_NAME}:/tmp/fairswap_db_dump.sql "${BACKUP_FILE}"`, {
      stdio: "inherit",
    });
  } catch (err) {
    console.error("Failed to copy dump file from container:", err);
    process.exit(1);
  }

  // 4. Validate dump file size
  const stats = fs.statSync(BACKUP_FILE);
  if (stats.size === 0) {
    console.error("Backup file is empty (0 bytes). Aborting.");
    process.exit(1);
  }

  // 5. Compute SHA-256
  const fileBuffer = fs.readFileSync(BACKUP_FILE);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  const manifest = {
    timestamp: new Date().toISOString(),
    filename: "fairswap_backup.sql",
    sizeBytes: stats.size,
    sha256: hash,
    schemas: ["public", "app_security", "auth"],
    container: CONTAINER_NAME,
    sourceDatabase: "postgres",
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("=== Database Backup Completed Successfully ===");
  console.log(`File: ${BACKUP_FILE}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`SHA-256: ${hash}`);
  console.log(`Manifest written to: ${MANIFEST_FILE}`);
}

main().catch((err) => {
  console.error("Unhandled backup error:", err);
  process.exit(1);
});
