# FairSwap — Backup and Disaster Recovery Runbook (Milestone 1.6)

This runbook establishes operational procedures, RPO/RTO targets, backup tooling, and disaster recovery verification protocols for FairSwap's database and storage layers.

---

## 1. Disaster Recovery Objectives (Target vs. Observed)

### A. Business Target Objectives
* **Target Recovery Point Objective (RPO)**: $\le$ 1 hour (maximum acceptable business data loss interval in the event of major disaster).
* **Target Recovery Time Objective (RTO)**: $\le$ 2 hours (maximum target time to restore full platform availability from backup artifacts).

> [!IMPORTANT]
> **RPO / RTO Truthfulness Attestation**:
> The figures above are **business target objectives**, not platform-guaranteed SLAs.
> In current Phase 1 configuration:
> * Supabase managed automatic backups operate on a **daily schedule** (free/pro project baseline).
> * No hourly automated snapshot cron is currently deployed to execute offsite backups.
> * Therefore, **RPO $\le$ 1 hour is NOT currently achieved in automated production**. Achieving RPO $\le$ 1h is an operational launch prerequisite requiring an automated scheduled backup runner or Supabase Point-in-Time Recovery (PITR) configuration.

### B. Empirically Observed Recovery Drill (Point 16)
During the isolated Point 16 Disaster Recovery drill conducted on FairSwapTest (`wpppxlnbzqynvhpeuavd`):
* **Database Backup Generation Duration**: ~5.2 seconds
* **Storage Object Byte Backup Duration**: ~18.4 seconds (46 objects downloaded, SHA-256 hashed)
* **Isolated Database Restore Duration**: 355.61 seconds (table structures cloned, rows re-inserted into isolated schema, count and referential integrity validated)
* **Isolated Storage Restore & Hash Verification**: 59.62 seconds (disposable recovery buckets provisioned, objects uploaded, downloaded, and 100% byte hashes verified)
* **Total Recovery Drill Duration**: **415.23 seconds (~6.9 minutes)**, comfortably inside the RTO $\le$ 2 hours objective.

---

## 2. Backup Architecture & Explicit Target Model

To eliminate environmental ambiguity, all backup and verification tooling requires an **explicit source target**:
* `--target=staging` (targets staging environment `FairSwapTest`)
* `--target=local` (targets local isolated Docker development stack)
* `--target=production` is **strictly forbidden and blocked by safety guards** during automated recovery drills.

Both database and storage tools fail closed if target parameters are omitted, ambiguous, or if database inventories and storage endpoints do not point to the same intended environment.

### A. Database Backup
* **Command**: `pnpm tsx scripts/backup-database.ts --target=staging`
* **Mechanism**: Direct read-only table export across all 19 application tables via linked Supabase CLI session.
* **Output Location**: `artifacts/backups/database/fairswap_backup.json`
* **Manifest**: `artifacts/backups/database/backup_manifest.json`
  * Captures: UTC timestamp, source environment (`FairSwapTest`), project ref (`wpppxlnbzqynvhpeuavd`), Git commit SHA, byte size, SHA-256 hash, schema names (`public`, `app_security`), migration version, and per-table record counts.
* **Integrity Validation**: Automated SHA-256 verification immediately following export.

### B. Storage (Media Byte) Backup
* **Command**: `pnpm tsx scripts/backup-storage.ts --target=staging`
* **Mechanism**: Direct recursive object enumeration via Supabase Storage API for active buckets `listing-originals` and `listing-derivatives`.
* **Output Location**: `artifacts/backups/storage/<bucket-name>/<object-path>`
* **Manifest**: `artifacts/backups/storage/manifest.json`
  * Captures: Object path, byte size, SHA-256 hash, local path, and bucket name for every retained asset.
* **Consistency Check**: Tooling verifies that all media records in the database backup (`listing_media`) have corresponding original and derivative files present in the storage backup manifest.

---

## 3. Disaster Recovery Verification Safeguards

To prevent accidental data loss or corruption, FairSwap enforces strict automated safeguards:

1. **Target Database / Schema Isolation Guard**:
   * Verification scripts **MUST NEVER** target `postgres` or any live application schema for restoration.
   * Target restore destination must be **EXACTLY**: schema `fairswap_restore_test` (or disposable database `fairswap_restore_test` on local engine).
   * Script aborts immediately if connected to an unauthorized database or illegal target.
2. **Storage Recovery Isolation Guard**:
   * Restore bytes **MUST NEVER** be written into active buckets `listing-originals` or `listing-derivatives`.
   * Restoration is performed exclusively into temporary disposable test buckets:
     * `recovery-test-originals`
     * `recovery-test-derivatives`
   * Recovery buckets are created private with no public read policies.
   * Recovery buckets and objects are completely purged and deleted upon test completion in the `finally` block.
3. **Fail-Closed Execution**:
   * If any SHA-256 hash fails, if files are missing, or if referential integrity checks fail, the process immediately halts with non-zero exit code and logs diagnostic details.

---

## 4. Step-by-Step Restoration Verification

To execute an end-to-end disaster recovery verification drill:

```bash
# 1. Generate explicit database backup
pnpm tsx scripts/backup-database.ts --target=staging

# 2. Generate explicit storage media backup
pnpm tsx scripts/backup-storage.ts --target=staging

# 3. Execute isolated disaster recovery verification
pnpm tsx scripts/verify-restore.ts --target=staging
```

### Verification Checklist Performed by `verify-restore.ts`
* [x] Verifies SHA-256 checksum of `fairswap_backup.json` against `backup_manifest.json`.
* [x] Provisions isolated schema `fairswap_restore_test`.
* [x] Restores table schemas and records across all 19 application tables.
* [x] Compares row counts between manifest snapshot and restored tables.
* [x] Validates referential integrity and zero-orphan invariants (users, listings, media, messages).
* [x] Verifies Point 9B Mountain Bike listing title, active status, and seller ID.
* [x] Provisions private disposable buckets `recovery-test-originals` and `recovery-test-derivatives`.
* [x] Uploads backed up media bytes into disposable recovery buckets.
* [x] Downloads all restored objects and verifies **100% SHA-256 hash equality**.
* [x] Validates Point 9B media assets byte-for-byte (original, large, medium, thumb).
* [x] Purges and drops disposable recovery buckets and restore schema.

---

## 5. Maintenance Authentication Matrix

Operational and recovery tasks require distinct credential tiers. Service-role and database administrative credentials must **never** be used in client bundles or logged in command outputs.

| Operational Task | Credential Required | Classification | Storage / Access Mechanism |
|---|---|---|---|
| **Database Backup** | Supabase CLI linked session / Service Role | Platform Owner / Service Role | Machine environment / CI runner secret (`SUPABASE_SERVICE_ROLE_KEY`) |
| **Storage Media Backup** | Supabase Service Role Key | Service Role | Server-side environment variable (`SUPABASE_SERVICE_ROLE_KEY`) |
| **Restore Verification Drill** | Supabase Service Role Key + DB Admin | Service Role / DB Admin | Operator execution context / CI runner secret |
| **Migration Deployment** | Supabase CLI linked token / DB Admin | DB Administrator | Operator CLI session (`npx supabase db push`) |
| **Admin Portal Access** | Staff User Credentials + RFC 6238 TOTP | Staff AAL2 | Interactive browser session (`/admin`) |
| **Admin User Moderation Actions** | Authenticated Staff Session (AAL2) | Staff AAL2 | PostgREST RPC via authenticated JWT |
| **Scheduled Maintenance Tasks** | Internal Cron Secret / Service Role | Service Role | Server-side bearer authorization |

---

## 6. Backup Failure Behavior & Alerting Escalation

| Failure Scenario | Severity | Owner / On-Call | Target Response | Immediate Diagnostic Action | Escalation Path |
|---|---|---|---|---|---|
| **Database Backup Script Fails** | Sev 2 | Lead Backend Operator | < 1 hour | Check Supabase connectivity, disk space, and CLI credentials. | Escalate to Platform Owner if DB unreachable > 30m. |
| **Storage Backup Fails** | Sev 2 | Lead Backend Operator | < 1 hour | Check Supabase Storage API rate limits and network egress. | Escalate to Platform Owner if storage API 5xx persists. |
| **Manifest SHA-256 Mismatch** | Sev 1 | Security & Reliability Lead | < 15 mins | Quarantine backup artifact. Re-run backup. Inspect disk for bit-rot or tampering. | Abort deployment/recovery. Alert Lead Architect. |
| **Restore Verification Fails** | Sev 1 | Reliability Engineer | < 30 mins | Inspect restore log for schema syntax errors, orphan FKs, or missing tables. | Freeze releases until restore pipeline passes. |
| **Cleanup Failure (Residual Test Buckets)** | Sev 3 | DevOps / QA Engineer | < 4 hours | Run manual cleanup helper (`purgeBucket`) to remove disposable buckets. | Log issue in tracker; verify active buckets unaffected. |

> [!NOTE]
> Currently, automated backup alerting depends on CI/CD run notifications and process exit codes. No standalone PagerDuty/Opsgenie integration is active in Phase 1 sandbox; alerts surface via runner failure logs.
