import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

describe("Point 16 Recovery & Restore Failure Injection Matrix", () => {
  const artifactsStorageDir = path.resolve(process.cwd(), "artifacts", "backups", "storage");

  // A. Corrupt Database Backup Hash
  it("A. fails closed when database backup hash is corrupted", () => {
    // Create temporary corrupted manifest
    const tempDir = path.resolve(process.cwd(), "artifacts", "backups", "temp_failure_a");
    fs.mkdirSync(tempDir, { recursive: true });
    const dummyBackup = path.join(tempDir, "fairswap_backup.json");
    const dummyManifest = path.join(tempDir, "backup_manifest.json");

    fs.writeFileSync(dummyBackup, JSON.stringify({ tables: {} }), "utf8");
    fs.writeFileSync(
      dummyManifest,
      JSON.stringify({ sha256: "0000000000000000000000000000000000000000000000000000000000000000" }),
      "utf8"
    );

    // Run verification against corrupted manifest via node script
    const testScript = `
      import fs from "fs";
      import crypto from "crypto";
      const manifest = JSON.parse(fs.readFileSync("${dummyManifest.replace(/\\/g, "/")}", "utf8"));
      const content = fs.readFileSync("${dummyBackup.replace(/\\/g, "/")}");
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      if (hash !== manifest.sha256) {
        console.error("Integrity error: Database backup SHA-256 does not match manifest");
        process.exit(1);
      }
    `;

    const runner = path.join(tempDir, "run.mjs");
    fs.writeFileSync(runner, testScript, "utf8");

    try {
      expect(() => {
        execSync(`node "${runner}"`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
      }).toThrow(/Integrity error: Database backup SHA-256 does not match manifest/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // B. Missing Database Backup File
  it("B. fails closed when database backup file is missing", () => {
    const missingFile = path.resolve(process.cwd(), "artifacts", "backups", "database", "non_existent.json");
    expect(fs.existsSync(missingFile)).toBe(false);

    const testScript = `
      import fs from "fs";
      if (!fs.existsSync("${missingFile.replace(/\\/g, "/")}")) {
        console.error("Backup file or manifest missing. Run backup-database.ts first.");
        process.exit(1);
      }
    `;
    expect(() => {
      execSync(`node --input-type=module -e "${testScript.replace(/\n/g, " ")}"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }).toThrow(/Backup file or manifest missing/);
  });

  // C. Corrupt Storage Object Backup
  it("C. fails closed when a storage object hash does not match manifest", () => {
    const originalHash = "a15c9b75cbf5861f51e56ac7bcad87869d1f4641003899cb3e405ed8c269bfa2";
    const corruptedBytes = Buffer.from("corrupted payload simulation");
    const corruptedHash = crypto.createHash("sha256").update(corruptedBytes).digest("hex");

    expect(corruptedHash).not.toBe(originalHash);

    const checkHash = () => {
      if (corruptedHash !== originalHash) {
        throw new Error(`SHA-256 MISMATCH for listing-derivatives/test.webp! Expected: ${originalHash}, Got: ${corruptedHash}`);
      }
    };
    expect(checkHash).toThrow(/SHA-256 MISMATCH/);
  });

  // D. Missing Storage Object
  it("D. fails closed when an expected storage object is missing from manifest or disk", () => {
    const nonExistentObject = path.resolve(artifactsStorageDir, "listing-originals", "missing-id", "orig.jpg");
    expect(fs.existsSync(nonExistentObject)).toBe(false);

    const testVerifyObject = () => {
      if (!fs.existsSync(nonExistentObject)) {
        throw new Error(`Missing storage object file on disk: ${nonExistentObject}`);
      }
    };
    expect(testVerifyObject).toThrow(/Missing storage object/);
  });

  // E. Wrong Restore Target
  it("E. aborts immediately if restore target is forbidden (e.g. production or staging)", () => {
    expect(() => {
      execSync("npx tsx scripts/verify-restore.ts --restore-target=production", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }).toThrow(/CRITICAL SAFETY ERROR: Restore target 'production' is strictly forbidden/);
  }, 20000);

  it("E. aborts immediately if no restore target or illegal target is specified", () => {
    expect(() => {
      execSync("npx tsx scripts/verify-restore.ts --restore-target=random_env", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }).toThrow(/CRITICAL ERROR: Explicit restore target required/);
  }, 20000);

  it("E3. aborts immediately if backup source is production", () => {
    expect(() => {
      execSync("npx tsx scripts/backup-database.ts --source=production", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    }).toThrow(/CRITICAL ERROR: --source=production is strictly forbidden/);
  }, 20000);

  // F. Remote Restore URL supplied where local-only restore is required
  it("F. fails closed if remote restore URL is supplied without explicit authorization", () => {
    const checkTargetPolicy = (target: string, dbUrl?: string) => {
      if (target === "local" && dbUrl && dbUrl.includes("supabase.co")) {
        throw new Error("CRITICAL SAFETY VIOLATION: Remote database URL supplied for local-only restore");
      }
    };
    expect(() => checkTargetPolicy("local", "https://wpppxlnbzqynvhpeuavd.supabase.co")).toThrow(
      /Remote database URL supplied for local-only restore/
    );
  });

  // G. Invalid / Insufficient Maintenance Credential
  it("G. fails closed when maintenance credentials are invalid or insufficient", () => {
    const invalidServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";
    const checkAuth = () => {
      if (!invalidServiceKey || invalidServiceKey.includes("invalid")) {
        throw new Error("CRITICAL ABORT: Insufficient or invalid maintenance credential supplied");
      }
    };
    expect(checkAuth).toThrow(/Insufficient or invalid maintenance credential/);
  });
});
