# FairSwap — Backup and Disaster Recovery Runbook (Public Beta Readiness)

This runbook establishes disaster recovery objectives, backup procedures, environmental safety boundaries, and restore verification protocols for **FairSwap** (a peer-to-peer local classifieds platform).

---

## 1. Disaster Recovery Objectives (Target vs. Observed vs. Production Reality)

### A. Business Target Objectives
* **Target Recovery Point Objective (RPO)**: $\le$ 1 hour (aspirational business target; unverified and not guaranteed in production).
* **Target Recovery Time Objective (RTO)**: $\le$ 2 hours (aspirational target; unverified and not guaranteed in production).

> [!IMPORTANT]
> **RPO / RTO Truthfulness & Supabase Configuration Attestation**:
> The figures above are **business target aspirations**, not contractual customer SLAs or verified operational capabilities.
> Regarding Supabase backup architecture:
> * **Pro Plan Daily Backups**: Managed automatic daily backups are available on the Supabase Pro tier ($25/mo), running on a daily schedule. They are distinct from continuous Point-in-Time Recovery.
> * **Point-in-Time Recovery (PITR)**: PITR is a separate paid add-on on eligible paid plans that provides continuous WAL archiving for minute-by-minute rollback.
> * **Comprehensive Production Recovery Scope**: A genuine production disaster recovery capability cannot consist merely of database rows. It must encompass:
>   1. Complete PostgreSQL database application data and schema migration history.
>   2. Supabase Storage object bytes across all buckets (`listing-originals`, `listing-derivatives`).
>   3. Supabase Auth configuration, OAuth providers, secrets/JWT keys, and Storage bucket policies.
>   4. Verified non-destructive restore rehearsal into an isolated target.
> * `FairSwapProd` was inspected and confirmed to be on the Supabase **Free** plan.
> * Managed daily backups and PITR are **not included** on the Free plan.
> * Untested RPO/RTO figures must never be presented as verified capabilities.
> * The Platform Owner previously accepted residual data-loss/recovery risk on 2026-09-19 under #41; however, for Production Release Candidate PR #124, backup readiness remains an explicit unresolved prerequisite (Release NO-GO).

### B. Empirically Observed Recovery Drill on Staging (FairSwapTest)
During the isolated Point 16 Disaster Recovery drill conducted on staging project `FairSwapTest` (`wpppxlnbzqynvhpeuavd`):
* **Database Backup Generation Duration**: ~5.2 seconds
* **Storage Object Byte Backup Duration**: ~18.4 seconds (46 objects downloaded, SHA-256 hashed)
* **Isolated Database Restore Duration**: 355.61 seconds (table structures reconstructed from clean migrations, rows re-inserted into isolated `@electric-sql/pglite` engine, counts and referential integrity validated)
* **Isolated Storage Restore & Hash Verification**: 59.62 seconds (disposable recovery buckets provisioned, objects uploaded, downloaded, and 100% byte hashes verified)
* **Total Staging Drill Duration**: **415.23 seconds (~6.9 minutes)** on staging test artifacts only. This drill demonstrated staging tooling mechanics, but does NOT represent verified production RPO/RTO.

### C. Production Backup & Recovery Posture
> [!WARNING]
> **VERIFIED PRODUCTION BACKUP GAP — RELEASE NO-GO**:
> FairSwapProd is on the Supabase Free plan and currently has **no managed project/database backup coverage** and no PITR.
> No production restore drill has been performed, and production Storage recovery remains unverified.
> For Production Release Candidate PR #124, backup readiness cannot be bypassed by historical risk acceptance: it remains an active blocker (NO-GO) requiring explicit project owner decision.

---

## 2. Backup Architecture & Environmental Safety Boundaries

To eliminate environmental ambiguity and protect production data from accidental mutation, all backup and verification tooling enforces decoupled, strictly validated source and restore flags:

* **Backup Creation Tooling**:
  * `--source=staging`: Connects read-only to `FairSwapTest`.
  * `--source=local`: Connects to the local development environment.
  * `--source=production`: **PROHIBITED by hard-coded safety guard**. Any attempt to supply production triggers an immediate process termination with a critical safety violation.
* **Database Restore Verification Tooling**:
  * `--restore-target=local`: **MANDATORY**. The restore verification script (`scripts/verify-restore.ts`) executes exclusively against an ephemeral in-process PostgreSQL database (`@electric-sql/pglite`).
  * `--restore-target=staging` or `--restore-target=production`: **PROHIBITED**. Tooling strictly refuses any remote database restore target.

### A. Database Application Data Backup
* **Command**: `pnpm tsx scripts/backup-database.ts --source=staging`
* **Mechanism**: Direct read-only table export across all tracked application tables via linked Supabase CLI session.
* **Output Location**: `artifacts/backups/database/fairswap_backup.json` (Gitignored)
* **Manifest**: `artifacts/backups/database/backup_manifest.json` (Gitignored)
  * Captures: UTC timestamp, source environment (`FairSwapTest`), project ref (`wpppxlnbzqynvhpeuavd`), Git commit SHA, byte size, SHA-256 hash, captured schemas (`dataSchemasCaptured = ["public"]`), reconstruction source (`repository migrations`), migration version, and per-table record counts.
* **Integrity Validation**: Automated SHA-256 checksum calculated immediately following export.

### B. Storage (Media Byte) Backup
* **Command**: `pnpm tsx scripts/backup-storage.ts --source=staging`
* **Mechanism**: Direct recursive object enumeration via Supabase Storage API for active buckets `listing-originals` and `listing-derivatives` using server environment credentials (`SUPABASE_SECRET_KEY`).
* **Output Location**: `artifacts/backups/storage/<bucket-name>/<object-path>` (Gitignored)
* **Manifest**: `artifacts/backups/storage/manifest.json` (Gitignored)
  * Captures: Object path, byte size, SHA-256 hash, local path, and bucket name for every retained asset.
* **Consistency Check**: Tooling verifies that all media records in the database backup (`listing_media`) have corresponding original and derivative files present in the storage backup manifest.

---

## 3. Disaster Recovery Verification Safeguards

To prevent accidental data loss or corruption, FairSwap enforces strict automated safeguards:

1. **Target Database Local Isolation Guard**:
   * Verification scripts **MUST NEVER** target `postgres`, `FairSwapTest`, or any live application database for restoration.
   * Target restore destination must be **EXACTLY**: `--restore-target=local`.
   * The database restore executes inside an isolated local database engine (`@electric-sql/pglite`) and applies the complete repository migration chain.
   * Script aborts immediately if connected to an unauthorized remote database or illegal target.
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

## 4. Step-by-Step Staging Restoration Verification

To execute an end-to-end disaster recovery verification drill using staging artifacts:

```bash
# 1. Generate explicit database application-data backup from staging
pnpm tsx scripts/backup-database.ts --source=staging

# 2. Generate explicit storage media backup from staging
pnpm tsx scripts/backup-storage.ts --source=staging

# 3. Execute isolated local disaster recovery verification
pnpm tsx scripts/verify-restore.ts --restore-target=local
```

### Verification Checklist Performed by `verify-restore.ts`
* [x] Verifies SHA-256 checksum of `fairswap_backup.json` against `backup_manifest.json`.
* [x] Initializes isolated local in-process PostgreSQL database (`@electric-sql/pglite`).
* [x] Reconstructs full schema by sequentially applying all repository migrations.
* [x] Validates reconstructed `app_security` functions, RLS policies, and performance indexes.
* [x] Restores application data rows from backup into reconstructed public tables.
* [x] Compares row counts between manifest snapshot and restored tables across all tables.
* [x] Validates referential integrity and zero-orphan invariants (users, listings, media, messages).
* [x] Provisions private disposable buckets `recovery-test-originals` and `recovery-test-derivatives`.
* [x] Uploads backed up media bytes into disposable recovery buckets.
* [x] Downloads all restored objects and verifies **100% SHA-256 hash equality**.
* [x] Purges and drops disposable recovery buckets and tears down local database.

---

## 5. Production Backup Verification Record and Future Checklist

Current verified state on 2026-09-19:

1. [x] FairSwapProd plan inspected in the Supabase Dashboard: **Free**.
2. [x] Managed project/database backups confirmed **not included** under the current setup.
3. [x] PITR confirmed unavailable under the current setup.
4. [ ] Production restore exercise: **not performed**.
5. [ ] Production Storage backup/recovery: **not verified**.
6. [x] Residual backup/recovery risk explicitly accepted by the Platform Owner under #41.

If FairSwap later adds managed backups or an external production backup/export process, verify recovery only into an isolated non-production target where technically supported. **Never restore a test backup over `FairSwapProd`**. Record future verification evidence in `docs/operations/recovery-drill-evidence.md`.

---

## 6. Backup Failure Triage & Ownership

| Failure Scenario | Severity | Owner | Target Response | Immediate Diagnostic Action |
|---|---|---|---|---|
| **Database Backup Script Fails** | P2 | Vivek Kumar (single operator; backup-owner risk accepted) | < 4 hours | Check Supabase connectivity, network egress, CLI session tokens. |
| **Storage Backup Fails** | P2 | Vivek Kumar (single operator; backup-owner risk accepted) | < 4 hours | Check Supabase Storage API rate limits and network egress quotas. |
| **Manifest SHA-256 Mismatch** | P1 | Vivek Kumar (single operator; backup-owner risk accepted) | < 1 hour | Quarantine artifact. Re-run backup. Inspect disk for bit-rot or tampering. |
| **Restore Verification Fails** | P1 | Vivek Kumar (single operator; backup-owner risk accepted) | < 1 hour | Inspect restore log for schema syntax errors, orphan FKs, or missing tables. |
| **Residual Test Buckets Detected** | P3 | Vivek Kumar (single operator; backup-owner risk accepted) | Next business day | Run cleanup helper (`purgeBucket`) to remove disposable buckets. |

> [!NOTE]
> Currently, automated backup alerting depends on script exit codes and runner logs. No external automated paging service is configured during Public Beta; failures surface via runner execution output.
