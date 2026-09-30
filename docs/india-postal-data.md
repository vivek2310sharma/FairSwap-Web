# India Postal Reference Data Runbook

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
- Migration `20260930000026_fix_india_location_admin_and_lookup.sql` corrects `public.lookup_pincode` to strictly return State and District, prevents Taluk from masquerading as city, and detects conflicting administrative boundaries within a single PIN.

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

### Production Procedure (Authoritative GoI Source)
1. Obtain the CSV directly from the authoritative data.gov.in resource.
2. Record source URL/resource metadata and publication/update date.
3. Compute FairSwap's own SHA-256 of the downloaded file (`certutil -hashfile ./india_pincode_official.csv SHA256`).
4. Record that checksum in the deployment/import evidence. This proves exactly which downloaded bytes FairSwap imported without claiming the government published a checksum.

> [!CAUTION]
> **Data Security & Git Hygiene**:
> NEVER commit the full government CSV dataset or any operator credentials into Git.
> Temporary files should be placed outside the git repository or in an ignored directory.

---

## 3. Current Staging Environment Posture (`FairSwapTest`)

- **FairSwapTest Nationwide QA Dataset**:
  - The nationwide reference dataset currently resident in `FairSwapTest` was ingested from an unverified third-party GitHub mirror (`github.com/saravanakumargn/All-India-Pincode-Directory`) matching the expected Department of Posts schema.
  - This mirror was used **strictly for functional testing and staging QA** because the official `data.gov.in` download was temporarily returning HTTP 503 / 405.
  - **Operational Classification**: `github_mirror_unverified`.
  - **Gate Status**: This mirror dataset is **NOT approved for FairSwapProd**. It is retained in `FairSwapTest` exclusively to support continued staging application verification, PIN lookup integration testing, and Create Ad QA without disruption.
  - **FairSwapTest Provenance Repair**: The staging dataset in `FairSwapTest` was repaired in place on 2026-09-30 so that all 154,789 rows truthfully declare `source = 'github_mirror_unverified'` and `source_updated_at = NULL`.

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
- `--source <source>`: **Mandatory** for remote imports. Supported values:
  - `data.gov.in` (required for production)
  - `github_mirror_unverified` (allowed for staging QA)
  - `operator_curated_seed` (allowed for local development / prototype)
- `--source-updated-at <iso_timestamp>`: **Optional** official publication timestamp (e.g. `2026-08-01T00:00:00Z`). If omitted, stores `NULL`. Never assumes execution timestamp as source update time.
- `--allow-remote`: Required when targeting remote Supabase instances.
- `--confirm-host <hostname>`: Required when targeting remote instances; must exactly match destination hostname.
- `--continue-on-error`: Optional flag for dev ingestion to continue after batch failures. Default is **fail-fast** (aborts on batch error).

### B. Remote Staging Import (Unverified Mirror)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key> \
npm run location:import -- ./pincode_mirror.csv \
  --allow-remote \
  --confirm-host <staging-ref>.supabase.co \
  --source github_mirror_unverified
```

### C. Remote Production Import (Strict Official Mode)
Fails closed with exit code 1 if source is not `data.gov.in`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key> \
npm run location:import -- ./india_pincode_official.csv \
  --allow-remote \
  --confirm-host <prod-ref>.supabase.co \
  --source data.gov.in \
  --source-updated-at 2026-08-01T00:00:00Z
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
  - `india_postal_data`: Batched in chunks of 500. Uses `ON CONFLICT (pincode, office_name) DO UPDATE`.
  - `localities`: Batched in chunks of 500. Uses `ON CONFLICT (city_id, slug) DO UPDATE`.
  - `postal_pincode_localities`: Batched in chunks of 500. Uses `ON CONFLICT (pincode, locality_id) DO UPDATE`.
- **Deduplication Semantics**:
  - Raw records deduplicated by exact `(pincode, office_name)` case match aligned with PostgreSQL database constraint.
  - Candidate mappings deduplicated by `(pincode, locality_id)`.
- **Fail-Fast Safety**:
  - By default, any batch failure aborts remote import immediately with a descriptive error.
- **Accurate Statistics Reporting**:
  - The script reports `postalRowsUpserted`, `localityRowsUpserted`, and `mappingRowsUpserted` rather than claiming new row creations on upsert.

---

## 7. Verification & Sanity Checks

After import or migration, run the following queries:

```sql
-- 1. Check total imported postal records (~150,000 expected nationwide)
SELECT source, count(*), min(created_at), max(created_at)
FROM public.india_postal_data
GROUP BY source;

-- 2. Verify distinct PIN code count (~19,000–20,000 expected nationwide)
SELECT COUNT(DISTINCT pincode) AS distinct_pincodes FROM public.india_postal_data;

-- 3. Verify locality mapping count and mapping source
SELECT source, COUNT(*) AS total_mappings
FROM public.postal_pincode_localities
GROUP BY source;

-- 4. Test RPC lookup returns district and state (never taluk as city)
SELECT public.lookup_pincode('560034'); -- Bengaluru
SELECT public.lookup_pincode('302017'); -- Jaipur
```

---

## 8. Staging In-Place Provenance Repair Plan

If staging records ever need provenance synchronization without truncating or disrupting ongoing QA:

```sql
-- Truthful staging provenance update
UPDATE public.india_postal_data
SET source = 'github_mirror_unverified',
    source_updated_at = NULL
WHERE source = 'data.gov.in';

-- Confirm postal_pincode_localities mapping source remains india_post_candidate
SELECT source, COUNT(*) FROM public.postal_pincode_localities GROUP BY source;
```
