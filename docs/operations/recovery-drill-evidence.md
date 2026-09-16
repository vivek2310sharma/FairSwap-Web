# FairSwap — Point 16 Disaster Recovery Drill Evidence (Milestone 1.6)

This document provides durable, non-secret operational evidence for **Point 16 — Recovery & Operations Verification** in accordance with Milestone 1.6 requirements and targeted closure corrections.

---

## 1. Executive Summary & Verification Verdict

* **Milestone Item**: Point 16 — Recovery & Operations Verification
* **Final Verdict**: **COMPLETE PASS (100% VERIFIED)**
* **Execution Date & Time**: 2026-09-16 (UTC)
* **Git Repository**: `vivek2310sharma/FairSwap`
* **Starting Branch**: `Phase1`
* **Remote Main Checkpoint**: `333694bb7c1a91763b1bed3c7b9207ef9f85c3b8` (**Untouched**)
* **Staging Target**: `FairSwapTest` (Project Ref: `wpppxlnbzqynvhpeuavd`)
* **Hosted Staging Application**: `https://fair-swap-git-phase1-fairswap.vercel.app`
* **Production Status**: **Untouched & Fully Isolated**

---

## 2. Privileged Credential Exposure & Rotation Incident

During the initial Point 16 backup script refactoring, a privileged legacy FairSwapTest Supabase service-role JWT was committed to tracked source and printed in command execution logs.

### Incident Remediation Actions:
1. **Immediate Source Sanitization**: All hard-coded credentials and project URLs were removed from `scripts/backup-storage.ts`, `scripts/verify-restore.ts`, and all tracked files.
2. **Environment Variable Decoupling**: Tooling was refactored to read exclusively from server/operator environment variables (`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL`) safely loaded via native `process.loadEnvFile`.
3. **Modern Key Migration**: The staging environment was updated in `.env.local` to use the project's modern `sb_secret_` service key (`sb_secret_KvaFu...`). Functionality was verified against Supabase Storage and database endpoints.
4. **Credential Revocation Boundary**: Deactivation of the compromised legacy JWT key in the hosted project requires project owner action in the Supabase Dashboard under Project Settings -> API. The historical value in Git commit `6ed23d7` remains classified as an exposed historical credential.
5. **No Production Exposure**: The incident was strictly confined to the staging project `FairSwapTest`. No Production credentials or systems were touched or exposed.
6. **Automated Regression Guard**: A dedicated test suite (`tests/security/secret-exposure-regression.test.ts`) was added to ensure no hard-coded service JWTs, `sb_secret_` strings, or bypass tokens can ever be committed to tracked source.

---

## 3. Backup Source Targeting & Decoupled Model

Backup and restore scripts were redesigned with explicit, decoupled concepts:
* **Backup Creation**: `--source=staging` or `--source=local`
  * `--source=staging`: Exports data from `FairSwapTest` read-only via linked Supabase CLI and Storage API.
  * `--source=local`: Exports from local stack; fails closed if given a remote URL.
  * `--source=production`: Prohibited by hard-coded safety guard.
* **Database Restore Verification**: `--restore-target=local`
  * Strictly requires `--restore-target=local`.
  * Prohibits `--restore-target=staging` or `--restore-target=production`.
  * Guarantees zero restoration DDL or rows are ever sent to `FairSwapTest` or Production.

---

## 4. Migration History Reconciliation (Migrations 1 to 19)

Inspection of `FairSwapTest` revealed that migrations 1 through 16 were tracked in `supabase_migrations.schema_migrations`, while migrations 17, 18, and 19 were present in the schema but lacked tracking metadata.

### Verification of Existing Schema Effects:
* **Migration 17**: Function `app_security.impl_create_report` confirmed to contain target visibility logic (`is_listing_publicly_visible`).
* **Migration 18**: All 5 performance & reliability indexes confirmed present in `pg_indexes` (`idx_listings_moderation_queue`, `idx_listings_seller_updated`, `idx_support_tickets_status_updated`, `idx_privacy_requests_status_requested`, `idx_privacy_requests_user_quota`).
* **Migration 19**: Function execute privilege confirmed granted to `anon` on `app_security.is_active_staff_aal2`.

### Migration History Repair:
The migration tracking table was repaired using the official Supabase CLI workflow:
```bash
npx supabase migration repair --linked --status applied 20260914000017 20260916000018 20260916000019
```
Rerunning `npx supabase migration list --linked` confirmed all 19 migrations are now accurately tracked as applied both locally and remotely.

---

## 5. Database Backup Evidence (Option B: Application Data Backup)

* **Tool Command**: `pnpm tsx scripts/backup-database.ts --source=staging`
* **Backup Artifact**: `artifacts/backups/database/fairswap_backup.json` (Gitignored)
* **Byte Size**: 44.50 KB
* **SHA-256 Checksum**: `1ea2da74004055976288df0cfa3ef1e8fd28590d3324b84c62cbf732a28292db`
* **Data Schemas Captured**: `["public"]`
* **Schema Reconstruction Source**: `repository migrations` (Migrations 1 to 19)
* **Captured Migration State**: 19 migrations tracked through `20260916000019`
* **Captured Table Counts Snapshot**:
  | Table Name | Backup Record Count | Status |
  |---|---|---|
  | `categories` | 6 | Exported |
  | `cities` | 1 | Exported |
  | `user_accounts` | 4 | Exported |
  | `profiles` | 4 | Exported |
  | `staff_roles` | 1 | Exported |
  | `listings` | 1 | Exported (Point 9B Mountain Bike) |
  | `listing_media` | 1 | Exported (Point 9B Media) |
  | `listing_status_transitions` | 3 | Exported |
  | `favourites` | 0 | Exported |
  | `conversations` | 0 | Exported |
  | `messages` | 0 | Exported |
  | `conversation_read_states` | 0 | Exported |
  | `user_blocks` | 0 | Exported |
  | `notifications` | 1 | Exported (Point 9B Approval) |
  | `reports` | 0 | Exported |
  | `support_tickets` | 0 | Exported |
  | `support_messages` | 0 | Exported |
  | `privacy_requests` | 0 | Exported |
  | `audit_logs` | 76 | Exported |

---

## 6. Storage Backup Evidence (FairSwapTest Image Bytes)

* **Tool Command**: `pnpm tsx scripts/backup-storage.ts --source=staging`
* **Manifest File**: `artifacts/backups/storage/manifest.json` (Gitignored)
* **Total Objects Downloaded**: 46 objects across `listing-originals` and `listing-derivatives`
* **Total Media Bytes**: 0.17 MB (177,381 bytes)
* **Point 9B Retained Media Verification**:
  * **Original (`original.jpg`)**:
    * Path: `listing-originals/ac521430-db02-4441-931f-d39a8f0ffb02/3fc849f5-9211-49cd-b1b4-74053300f0ec/original.jpg`
    * Size: 51,709 bytes
    * SHA-256: `d66ac114ddd1a31750e6616288b7f4bde5f62f566d96b22c1c4b048d4083ac81`
  * **Large Derivative (`large.webp`)**:
    * Path: `listing-derivatives/ac521430-db02-4441-931f-d39a8f0ffb02/3fc849f5-9211-49cd-b1b4-74053300f0ec/large.webp`
    * Size: 55,002 bytes
    * SHA-256: `a15c9b75cbf5861f51e56ac7bcad87869d1f4641003899cb3e405ed8c269bfa2`
  * **Medium Derivative (`medium.webp`)**:
    * Path: `listing-derivatives/ac521430-db02-4441-931f-d39a8f0ffb02/3fc849f5-9211-49cd-b1b4-74053300f0ec/medium.webp`
    * Size: 55,002 bytes
    * SHA-256: `a15c9b75cbf5861f51e56ac7bcad87869d1f4641003899cb3e405ed8c269bfa2`
  * **Thumbnail Derivative (`thumb.webp`)**:
    * Path: `listing-derivatives/ac521430-db02-4441-931f-d39a8f0ffb02/3fc849f5-9211-49cd-b1b4-74053300f0ec/thumb.webp`
    * Size: 13,668 bytes
    * SHA-256: `b3e40d21ecb8f4759f4897c4711ed524ae77ad77f3b70d49a6891385f796968d`

---

## 7. Isolated Local Database Restore Execution (Option B)

Restoration was executed into a **completely isolated, disposable local in-process PostgreSQL engine** (`@electric-sql/pglite` 0.5.8), ensuring zero interaction with `FairSwapTest`.

* **Execution Duration**: **2.38 seconds**
* **Schema Reconstruction from Clean Migrations**:
  * Clean repository migration chain (Migrations 1 to 19) applied sequentially.
  * Verified **41 `app_security` functions** reconstructed from source.
  * Verified **32 RLS security policies** reconstructed from source.
  * Verified **79 performance & reliability indexes** reconstructed from source.
* **Data Restore & Verification**:
  * Triggers temporarily disabled during row insertion to prevent duplicate operational event triggers.
  * 19 / 19 tables matched exact backup manifest row counts.
  * Zero orphan listings, zero orphan media, zero orphan messages.
  * Restored Point 9B Mountain Bike listing: `title = 'Bike'`, `status = 'active'`.
* **Teardown**: Local disposable database engine closed and torn down cleanly.

---

## 8. Storage Restore Execution & Byte-Hash Verification

* **Destination**: Disposable recovery buckets `recovery-test-originals` and `recovery-test-derivatives` on Supabase Storage.
* **Execution Duration**: **63.07 seconds**
* **Hash Equality**: **100% (46/46) SHA-256 byte-for-byte exact matches**.
* **Point 9B Retained Media**:
  * `original.jpg`: Hash match (`d66ac114...`)
  * `large.webp`: Hash match (`a15c9b75...`)
  * `medium.webp`: Hash match (`a15c9b75...`)
  * `thumb.webp`: Hash match (`b3e40d21...`)
* **Teardown**: Disposable recovery buckets emptied and deleted cleanly via `purgeBucket` helper.

---

## 9. Failure-Injection Verification Results

Automated regression suite `tests/reliability/recovery-failure-injection.test.ts` verified that all failure scenarios fail closed:

| Scenario | Injected Condition | Expected Tooling Behavior | Result |
|---|---|---|---|
| **A** | Corrupted database backup hash | Aborts before restore; throws integrity error. | **PASS** |
| **B** | Missing database backup file | Aborts before restore; reports missing file. | **PASS** |
| **C** | Corrupted storage object bytes | Detects SHA-256 mismatch; halts verification. | **PASS** |
| **D** | Missing storage object on disk | Aborts before restore; reports missing asset. | **PASS** |
| **E** | Forbidden restore target (`production`/`staging`) | Aborts immediately with `CRITICAL SAFETY ERROR`. | **PASS** |
| **E2**| Unrecognized restore target (`random_env`)| Aborts immediately; requires explicit target. | **PASS** |
| **E3**| Forbidden backup source (`production`) | Aborts immediately with `CRITICAL ERROR`. | **PASS** |
| **F** | Remote URL supplied for local restore | Fails closed with safety violation exception. | **PASS** |
| **G** | Invalid maintenance credentials | Fails closed; rejects unauthorized connection. | **PASS** |

---

## 10. Post-Verification Cleanup & Baseline Attestation

Following completion:
* `FairSwapTest` contains **NO restore tables, schemas, or DDL** (restore was 100% local).
* Schema `fairswap_restore_test`: **Does NOT exist**.
* Disposable buckets `recovery-test-originals`, `recovery-test-derivatives`: **Do NOT exist**.
* Active storage buckets on `FairSwapTest`: Only `["listing-originals","listing-derivatives"]`.
* Retained baseline assets on `FairSwapTest`:
  * Active listing `ac521430-db02-4441-931f-d39a8f0ffb02`: **Intact**
  * Listing media `3fc849f5-9211-49cd-b1b4-74053300f0ec`: **Intact**
  * Administrator MFA Verified Factors: **Exactly 1**
* Production / Main Branch: **100% Untouched**.
