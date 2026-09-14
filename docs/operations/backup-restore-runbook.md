# FairSwap — Backup and Disaster Recovery Runbook (Milestone 1.6)

This runbook establishes operational procedures, RPO/RTO targets, backup automation, and disaster recovery verification protocols for FairSwap's database and storage layers.

---

## 1. Disaster Recovery Objectives

* **Recovery Point Objective (RPO)**: <= 1 hour (maximum acceptable data loss interval in the event of major hardware or platform failure).
* **Recovery Time Objective (RTO)**: <= 2 hours (maximum target time to restore full platform availability from backup artifacts).

---

## 2. Backup Architecture & Procedures

FairSwap uses distinct, decoupled backup procedures for relational state and binary media assets:

### A. Database Backup
* **Script**: `corepack pnpm tsx scripts/backup-database.ts`
* **Underlying Mechanism**: `pg_dump` targeting schemas `public`, `app_security`, and `auth` (capturing foreign key relationships with `auth.users`).
* **Output Location**: `artifacts/backups/database/fairswap_backup.sql`
* **Manifest**: `artifacts/backups/database/backup_manifest.json` containing SHA-256 hash, byte size, schema list, and UTC timestamp.
* **Integrity Validation**: Automated SHA-256 computation immediately after dump extraction.

### B. Storage (Media) Backup
* **Script**: `corepack pnpm tsx scripts/backup-storage.ts`
* **Underlying Mechanism**: Direct export and download of all objects from `listing-originals` and `listing-derivatives` buckets via authenticated service client.
* **Output Location**: `artifacts/backups/storage/<bucket-name>/<object-path>`
* **Manifest**: `artifacts/backups/storage/manifest.json` cataloging object paths, sizes, and SHA-256 hashes.

---

## 3. Disaster Recovery Verification Safeguards

To prevent accidental data corruption or overwrite during restore testing, FairSwap enforces strict automated safeguards:

1. **Target Database Safety Guard**:
   * Verification scripts **MUST NEVER** target `postgres` or any live production database name.
   * Target database name must be **EXACTLY**: `fairswap_restore_test`.
   * The script automatically aborts if connected to an unauthorized database or remote endpoint.
2. **Storage Isolation Safety Guard**:
   * Restore bytes **MUST NEVER** be written into active buckets `listing-originals` or `listing-derivatives`.
   * Restoration is performed exclusively into temporary disposable test buckets:
     * `recovery-test-originals`
     * `recovery-test-derivatives`
   * Test buckets are automatically purged and deleted upon test completion.
   * The script verifies that active production bucket object counts remain 100% unchanged before and after testing.

---

## 4. Step-by-Step Restoration Verification

To execute the automated end-to-end disaster recovery verification cycle:

```bash
# 1. Generate fresh database backup
corepack pnpm tsx scripts/backup-database.ts

# 2. Generate fresh storage media backup
corepack pnpm tsx scripts/backup-storage.ts

# 3. Run automated disaster recovery verification
corepack pnpm tsx scripts/verify-restore.ts
```

### Verification Checklist Performed by `verify-restore.ts`
* [x] Verifies SHA-256 checksum of `fairswap_backup.sql` matches `backup_manifest.json`.
* [x] Bootstraps disposable database `fairswap_restore_test` with required PostgreSQL extensions (`uuid-ossp`, `pgcrypto`).
* [x] Restores backup dump and validates schemas `public`, `app_security`, and `auth`.
* [x] Compares row counts between active database and restored database across all application tables.
* [x] Verifies zero orphan records across `user_accounts`, `listings`, and `messages`.
* [x] Uploads media backup to disposable recovery buckets.
* [x] Re-downloads all objects from recovery buckets and verifies 100% SHA-256 match against manifest.
* [x] Purges and drops disposable recovery database and recovery buckets.
