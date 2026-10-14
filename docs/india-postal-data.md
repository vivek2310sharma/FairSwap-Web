# India Postal Reference Data Runbook

> [!IMPORTANT]
> **Hosted source inventory refreshed by read-only queries on 2026-10-14:** Both FairSwapTest and FairSwapProd have 165,620 `data.gov.in`-labelled postal rows across 19,586 PIN codes, with no other sources returned by the aggregate; `source_updated_at` is NULL. The earlier Test mirror and initial remote import examples are historical, not today's hosted state. The database source label is **not** independent verification that the upstream government CSV has not changed.

This document details the operational lifecycle for importing, populating, refreshing, and validating India postal reference data (`india_postal_data` and `postal_pincode_localities`) across staging and production environments for FairSwap.

---

## 1. Overview & Architecture

FairSwap uses a **PIN-first** location model:
1. The seller inputs a 6-digit Indian PIN code.
2. The server-side RPC `public.lookup_pincode` derives administrative **State** and **District** (not Taluk), and retrieves selectable Area / Locality candidates.
3. Candidate localities derived from official post offices are marked with `source: 'india_post_candidate'`. (They represent candidate postal localities, not FairSwap-curated marketplace localities).
4. Submissions are strictly verified in both the Next.js server actions and database RPC `app_security.impl_seller_submit_listing` to ensure submitted localities belong to the specified PIN code and compatibility district/city.
5. **Compatibility Layer**: For Issue #81, `public.cities` rows function as the current administrative district compatibility layer. `listings.city_id` and `localities.city_id` point to these compatibility rows. Future marketplace city and locality curation is a separate follow-up.

Schema Migrations:
- Migration `20260929000025_india_postal_location_schema.sql` creates tables, indexes, grants, and submit integrity RPC.
- Migration `20260930000026_fix_india_location_admin_and_lookup.sql` corrects `public.lookup_pincode` to strictly return State and District and prevents Taluk from masquerading as city.
- Migration `20260930000027_support_multi_district_pincodes.sql` adds multi-district same-state PIN resolution without guessing, returning explicit district choices to the caller, while failing closed on cross-state conflicts with `CONFLICTING_POSTAL_STATES`.
- Migration `20260930000028_harden_official_postal_snapshot.sql` introduces deterministic `source_record_key`, upgrades uniqueness to `UNIQUE (source, source_record_key)` to preserve post offices sharing names across districts/divisions, handles sentinel NA administrative values (`PINCODE_ADMIN_DATA_UNAVAILABLE`), and establishes automated trigger recomputation on INSERT or UPDATE.
- Migration `20261001000029_fix_listing_landmark_column_permissions.sql` explicitly grants authenticated users INSERT and UPDATE permissions on `public.listings.landmark`.
- Migration `20261001000030_require_explicit_postal_source.sql` drops the DEFAULT constraint on `public.india_postal_data.source` so data.gov.in provenance must never be assigned implicitly.

---

## 2. Authoritative Source Policy & Production Gate

The official source for all PIN code and post office records in India is:
- **Upstream Production Source**: Department of Posts, Ministry of Communications, Government of India
- **Open Government Data Platform**: [data.gov.in — All India Pincode Directory](https://data.gov.in/resource/all-india-pincode-directory-till-last-month)
- **License**: Government Open Data License - India (GODL)
- **FairSwap Runtime Source**: FairSwap Supabase (`public.india_postal_data`)

> [!IMPORTANT]
> **Production Source Gate:**
> - Only authoritative Government of India / Department of Posts exports (from `data.gov.in`) are permitted for `FairSwapProd`.
> - Third-party mirrors (GitHub, Kaggle), unofficial scraper sites (such as `postalpincode.in`), and unauthenticated commercial APIs are **strictly prohibited** for production bootstrapping.
> - If the official Government of India portal is temporarily unreachable or offline: **Production postal bootstrap is blocked pending authoritative dataset availability.**

### Official Snapshot Verification & Provenance Metrics
The official Department of Posts snapshot file has been downloaded and verified:
- **Official File Name**: `all-india-pincode-html-csv-Ver-2026.csv`
- **File Size**: `20,810,655` bytes
- **SHA-256 Checksum**: `d06f4c5f20aabd116a1918a328c17e526755f29a831e9c3599589ba63d76ba79`
- **Total CSV Rows**: `165,627`
- **Canonical Duplicate Rows**: `7`
- **Unique Canonical Raw Records**: `165,620`
- **Distinct PIN Codes**: `19,586`

> [!NOTE]
> **Canonical Deduplication Breakdown**:
> 165,627 input rows - 7 canonical duplicates after whitespace/case normalization = 165,620 unique source records.
> *(The canonicalization deliberately collapses internal whitespace to a single space; this changed from the earlier pre-normalization estimate of 165,621 because `"Pendri  BO"` [with two spaces] and `"Pendri BO"` [with one space] canonicalize to the exact same record).*

> [!NOTE]
> **Snapshot-Record Fingerprint Semantics**:
> `source_record_key` is a deterministic **snapshot-record fingerprint** derived from the 10 canonical postal fields, **not a permanent upstream entity ID**.
> Upstream records from `data.gov.in` do not provide a permanent primary key.
> Therefore, future monthly refreshes must use **controlled snapshot replacement/reconciliation**, not simple upsert-over-old-snapshot (which would orphan stale records whenever postal boundary details change). *(Note: Do not build that future refresh system now.)*

### Production Procedure (Authoritative GoI Source)
1. Obtain the CSV directly from the authoritative data.gov.in resource.
2. Confirm the local file SHA-256 matches the approved checksum (`d06f4c5f20aabd116a1918a328c17e526755f29a831e9c3599589ba63d76ba79`).
3. Pass `--expect-sha256 <64-hex>` to the importer CLI. Remote imports targeting production or specifying `--source data.gov.in` strictly require this flag and will abort before reading data or contacting Supabase if it differs.
4. Record source URL/resource metadata and publication/update date in deployment records.

> [!CAUTION]
> **Data Security & Git Hygiene**:
> NEVER commit the full government CSV dataset or any operator credentials into Git.
> Temporary files should be placed outside the git repository or in an ignored directory.

---

## 3. Hosted postal state (read-only verification, 2026-10-14)

| Project | Stored source | Records | Distinct PIN codes | Recorded upstream update |
| --- | --- | ---: | ---: | --- |
| FairSwapTest (`wpppxlnbzqynvhpeuavd`) | `data.gov.in` only | 165,620 | 19,586 | NULL |
| FairSwapProd (`kriuhwppxgxsyyrbjsau`) | `data.gov.in` only | 165,620 | 19,586 | NULL |

The verification was a **read-only** per-source `COUNT(*)`, `COUNT(DISTINCT pincode)` and `MAX(source_updated_at)` aggregate in each Supabase database. It did not re-download the CSV, recompute its SHA-256 or independently establish the official source publication date. No hosted data was modified by this documentation audit.

### Historical mirror state (30 September 2026)

Earlier, FairSwapTest held **154,789** records from an unverified GitHub mirror. An in-place provenance repair marked those rows `github_mirror_unverified` and set `source_updated_at = NULL`. That mirror contained **1,246** PIN codes mapped to multiple district labels. This describes the September **superseded** Test snapshot, not the current official-labelled contents of FairSwapTest.

---

## 4. Required Environment Variables & Permissions

The postal importer operates directly against the Supabase database. Because table-level RLS blocks anonymous and normal authenticated users from writing to postal tables, the script requires service-role authorization.

| Variable | Description | Required Environment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Target Supabase project API URL (e.g. `https://<project-ref>.supabase.co`) | Operator CLI |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret key (bypasses RLS for operator ingestion) | Operator CLI |
| `SUPABASE_SECRET_KEY` | Supported alternative fallback secret key | Operator CLI |

> [!WARNING]
> **Operator Security Boundary**:
> Run the import script **only** from a secure operator environment or dedicated deployment bastion.
> NEVER embed service role secret keys into client environments or automated client builds.

---

## 5. Execution Commands & Provenance Flags

The repository provides a CLI script: [`scripts/import-india-postal-data.ts`](../scripts/import-india-postal-data.ts) (aliased as `npm run location:import`).

### A. Provenance Parameters
- `--source <source>`: **Mandatory** for all non-demo CSV imports (both local and remote). Supported values:
  - `data.gov.in` (required for production)
  - `github_mirror_unverified` (allowed for staging QA)
  - `operator_curated_seed` (allowed for local development / prototype)
- `--expect-sha256 <64-hex>`: **Mandatory** for any remote import with `--source data.gov.in`, and strictly enforced for `FairSwapProd`. Evaluates the file hash before parsing data or contacting Supabase.
- `--source-updated-at <iso_timestamp>`: **Optional** official publication timestamp (e.g. `2026-08-01T00:00:00Z`). If omitted, stores `NULL`. Never assumes execution timestamp as source update time. Prefer omitting this parameter and storing `NULL` if there is any uncertainty regarding upstream resource timestamps.
- `--allow-remote`: Required when targeting remote Supabase instances.
- `--confirm-host <hostname>`: Required when targeting remote instances; must exactly match destination hostname.
- `--continue-on-error`: Optional flag for dev ingestion to continue after batch failures. Default is **fail-fast** (aborts on batch error).

### B. Archived Test mirror import example — do not use as current setup
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key> \
npm run location:import -- ./pincode_mirror.csv \
  --allow-remote \
  --confirm-host <staging-ref>.supabase.co \
  --source github_mirror_unverified
```

### C. Historical approved-source import example — separate approval required for future use
The importer fails closed if the Production source is not `data.gov.in` or a SHA-256 verification flag is missing/mismatched. The following command illustrates the **original** approved dataset and checksum; **do not rerun it** merely because this runbook is being read. Any replacement needs fresh source approval, a new verified checksum, an environment-specific backup/rollback plan and separately authorized hosted write:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key> \
npm run location:import -- ./all-india-pincode-html-csv-Ver-2026.csv \
  --allow-remote \
  --confirm-host <prod-ref>.supabase.co \
  --source data.gov.in \
  --expect-sha256 d06f4c5f20aabd116a1918a328c17e526755f29a831e9c3599589ba63d76ba79
```

### D. Local Development Seeding (Demo Mode)
When seeding a development environment without the nationwide CSV, pass `--demo`:
```bash
npm run location:import -- --demo
```
This seeds sample records for pilot cities (Bengaluru, Jaipur, Mumbai, Delhi) with source `operator_curated_seed`.

---

## 6. Batching, Idempotency & Error Handling

- **500-Item Batching**:
  - `india_postal_data`: Batched in chunks of 500. Uses `ON CONFLICT (source, source_record_key) DO UPDATE`.
  - `localities`: Batched in chunks of 500. Uses `ON CONFLICT (city_id, slug) DO UPDATE`.
  - `postal_pincode_localities`: Batched in chunks of 500. Uses `ON CONFLICT (pincode, locality_id) DO UPDATE`.
- **Deduplication Semantics**:
  - Raw records deduplicated by canonical fingerprint `(source, source_record_key)` aligned with PostgreSQL database constraint `UNIQUE (source, source_record_key)`.
  - Candidate mappings deduplicated by `(pincode, locality_id)`.
- **Fail-Fast Safety**:
  - By default, any batch failure aborts remote import immediately with a descriptive error.
- **Accurate Statistics Reporting**:
  - The script reports `postalRowsUpserted`, `localityRowsUpserted`, and `mappingRowsUpserted` rather than claiming new row creations on upsert.

---

## 7. Verification & Sanity Checks

After import or migration, run the following queries:

```sql
-- 1. Check per-source counts (165,620 official-labelled rows on 2026-10-14)
SELECT source, count(*), min(created_at), max(created_at)
FROM public.india_postal_data
GROUP BY source;

-- 2. Check distinct PINs (19,586 on 2026-10-14)
SELECT COUNT(DISTINCT pincode) AS distinct_pincodes FROM public.india_postal_data;

-- 3. Verify locality mapping count and mapping source
SELECT source, COUNT(*) AS total_mappings
FROM public.postal_pincode_localities
GROUP BY source;

-- 4. Test RPC lookup returns district and state (never taluk as city)
SELECT public.lookup_pincode('560034'); -- Bengaluru Urban, Karnataka (single district)
SELECT public.lookup_pincode('302017'); -- Jaipur, Rajasthan (single district)
SELECT public.lookup_pincode('110001'); -- New Delhi, Delhi (single district: New Delhi)
SELECT public.lookup_pincode('110003'); -- Delhi (multi-district selector: New Delhi, South, South East)
```

---

## 8. Provenance inspection and retired repair SQL (read-only)

The original September Test-only repair corrected an incorrectly labelled unverified mirror. The old SQL to change `source = 'data.gov.in'` to `github_mirror_unverified` is **retired** and must not be run against the current hosted data; doing so would corrupt truthful stored provenance.

Use this **read-only** check before any source refresh or remediation:

```sql
SELECT source, COUNT(*) AS rows, COUNT(DISTINCT pincode) AS pincodes,
       MAX(source_updated_at) AS latest_recorded_update
FROM public.india_postal_data
GROUP BY source
ORDER BY source;
```

If database provenance diverges from the source file, stop, preserve evidence and obtain a reviewed, separately authorized correction plan rather than bulk-relabeling the table.

---

## 9. Production Preflight: Import Duration & Maintenance Window

During nationwide staging replacement, the actual verified import metrics were:
- **Dataset Size**: 165,627 input rows, producing 165,620 unique canonical records across 332 batches (batch size: 500).
- **Actual Ingestion Duration**: **~11 minutes 6 seconds** (666 seconds).
- **Operational Requirement**:
  - Do **NOT** plan production maintenance around hypothetical 75–90 second benchmarks.
  - Operators must budget a **~15–20 minute listing maintenance window** for the nationwide postal import and post-ingestion verification, subject to actual production network and database load.

### Verification Key Expectations
- **PIN `110001`**: Evaluates to `New Delhi, Delhi` (single district). It must **not** be expected to return `Central Delhi/New Delhi`.
- **PIN `110003`**: Evaluates to multi-district Delhi (`requires_district_selection = true`), prompting the user to select between `New Delhi`, `South`, and `South East`.

---

## 10. Historical migration rollout and forward-only recovery

### Database Migration Atomicity
**Historical initial rollout:** Migrations 25–30 belong to the existing tracked chain and are **not pending setup steps**. During the original rollout, applying them sequentially was **not globally atomic**. Before any new deployment, read the target migration history, apply only newly reviewed forward migrations, and preserve a verified rollback strategy.
- **Before Migration 25**: If aborted prior to executing Migration 25, the database remains in its pre-Issue #81 state (**safe abort**).
- **After Any Migration Succeeds (25–30)**:
  - Do **NOT** assume all prior migrations rolled back if a later migration fails.
  - Keep the listing maintenance window enabled.
  - Inspect the exact applied migration state in `supabase_migrations.schema_migrations`.
  - Continue forward by diagnosing and repairing the specific migration, or execute an explicitly reviewed database forward fix.

### Ingestion Failure & Idempotent Retry
- If the nationwide CSV ingestion is interrupted or fails after SHA-256 verification (e.g. transient network timeout or connection reset):
  - Do **NOT** automatically purge or truncate production postal/locality tables as the first response.
  - The import script is built with idempotent upserts (`ON CONFLICT (source, source_record_key) DO UPDATE`, `ON CONFLICT (city_id, slug) DO UPDATE`, `ON CONFLICT (pincode, locality_id) DO UPDATE`).
  - Diagnose the specific batch failure and **re-run the exact same SHA-256-locked importer**. It will resume and converge the snapshot safely without generating duplicate rows.

### Vercel Deployment Failure Post-DB Push
- If the new Vercel application deployment fails after database migrations 25–30 have been applied:
  - **DO NOT reopen listing writes on the old UI.**
  - An application code rollback to the pre-Issue #81 UI is **NOT compatible** with the new database contract. The old UI allows submissions without mandatory PIN codes and passes raw unconstrained locality strings, which will trigger database constraint errors in `app_security.impl_seller_submit_listing`.
  - Keep listing maintenance active and repair/forward-deploy the application frontend.

---

## 11. Production-Safe Seller-Write Maintenance Window Mechanism

### Motivation & Risk with DB Triggers
An unconditional database trigger such as `BEFORE INSERT OR UPDATE ON public.listings` is **prohibited for maintenance windows**. Because the `listings` table is shared between seller authoring and platform administration, an unconditional table trigger blocks critical administrative, moderation, and system operations:
- Moderator review transitions (`pending_review` -> `active` / `rejected`)
- Staff audit log recording and abuse report resolutions
- System cleanups or background jobs

### Implemented server-side seller-write maintenance guard (not necessarily enabled)
The smallest, production-safe mechanism blocks seller draft mutations while keeping the rest of the marketplace operational:
1. **Scope of Block**:
   - Blocks Create Listing (`/account/listings/new` form submission and page entry banner).
   - Blocks Seller Draft Edits (`/account/listings/[id]/edit` form submission and page entry banner).
   - Blocks Seller Submit for Review (`submitListingForReview`).
2. **Operations Remaining Fully Operational**:
   - Public marketplace browsing, item discovery, category filters, and search (`/listings`, `/search`).
   - Buyer-seller messaging and real-time chat.
   - User authentication, profile settings, favourites.
   - Staff administration, listing moderation, reports, and audit logging (`/admin/*`).
3. **Server Action & Server Component Protection**:
   - Maintenance enforcement belongs strictly at the server boundary; it does not need to be exposed or inlined into the client browser bundle via `NEXT_PUBLIC_*`.
   - **Source implementation confirmed 2026-10-14**:
     - Next.js server actions (`createListing`, `updateListing`, `submitListingForReview`) read `process.env.MAINTENANCE_SELLER_WRITES`.
     - Server-rendered Create and Edit pages (`/account/listings/new`, `/account/listings/[id]/edit`) read the same flag server-side and pass the maintenance state/message down to the client UI as a prop.
     - When active, server actions reject mutations with an actionable error:
       > *"Listing creation and editing are temporarily paused while we upgrade location reference data. Active listings and buyer messages remain accessible. Please try again shortly."*
     - This ensures stale browser tabs opened before maintenance cannot bypass the UI block.
4. **Configuration & Decoupled Toggle Procedure**:
   - The guard is controlled via a server environment variable (`MAINTENANCE_SELLER_WRITES="true"`) that **does not depend on Migrations 25–30**.
   - > [!IMPORTANT]
   - > **Vercel Activation Semantics**:
   - > Changing an environment variable in Vercel project settings **does not dynamically update an already-running deployment**. Activating the flag requires triggering or promoting a deployment containing that updated environment variable value.
   - **Enable Procedure**:
     1. Set `MAINTENANCE_SELLER_WRITES="true"` in Vercel project environment settings.
     2. Trigger/promote a deployment to activate maintenance enforcement on the live environment.
     3. Verify Create Listing displays maintenance banner and server action rejects mutation.
     4. Proceed only with an **independently approved current** postal snapshot replacement or new forward migration; never reapply historical migrations or reimport a dataset just for documentation alignment.
   - **Disable Procedure**:
     1. Verify migrations, CSV import, and sanity checks (110001, 110003, 560034) pass.
     2. Set `MAINTENANCE_SELLER_WRITES="false"` (or remove the variable).
     3. Trigger/promote a deployment to restore live seller authoring capabilities.
**Source status:** `src/lib/maintenance/seller-writes.ts` implements this server-only toggle, and listing actions/pages, readiness checks and media endpoints reference the guard. This does **not** prove the toggle is active on either deployed environment. Verify Vercel's effective environment and exercise a blocked write before relying on a maintenance window.
