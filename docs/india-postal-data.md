# India Postal Reference Data Runbook

This document details the operational lifecycle for importing, populating, refreshing, and validating India postal reference data (`india_postal_data` and `postal_pincode_localities`) across staging and production environments for FairSwap.

---

## 1. Overview & Architecture

FairSwap uses a **PIN-first** location model:
1. The seller inputs a 6-digit Indian PIN code.
2. The server-side RPC `public.lookup_pincode` derives administrative State, District, and City, and retrieves selectable Area/Locality candidates.
3. Candidate localities derived from official post offices are marked with `source: 'india_post_candidate'`. (They represent candidate postal localities, not FairSwap-curated marketplace localities).
4. Submissions are strictly verified in both the Next.js server actions and database RPC `app_security.impl_seller_submit_listing` to ensure submitted localities belong to the specified PIN code and city.

Schema Migration `20260929000025_india_postal_location_schema.sql` creates the required tables, indexes, and RPCs, leaving them empty. Populating these tables requires running the operator import procedure below.

---

## 2. Authoritative Source

The official data source for all PIN code and post office records in India is:
- **Authoritative Provider**: Department of Posts, Ministry of Communications, Government of India
- **Open Government Data Platform**: [data.gov.in — All India Pincode Directory](https://data.gov.in/resource/all-india-pincode-directory-till-last-month)
- **License**: Government Open Data License - India (GODL)

### How to Download
1. Navigate to the official dataset on [data.gov.in](https://data.gov.in/resource/all-india-pincode-directory-till-last-month).
2. Download the latest CSV export (typically named `all_india_pincode_directory.csv` or similar).
3. Verify the file size (typically ~150,000+ rows, ~15–25 MB).

> [!CAUTION]
> **Data Security & Git Hygiene**:
> NEVER commit the full government CSV dataset or any operator credentials into Git.
> Temporary files should be placed outside the git repository or in an ignored directory.

---

## 3. Required Environment Variables & Permissions

The postal importer operates directly against the Supabase database. Because table-level RLS blocks anonymous and normal authenticated users from writing to postal tables, the script requires service-role authorization.

| Variable | Description | Required Environment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Target Supabase project API URL (e.g. `https://<project-ref>.supabase.co`) | Operator CLI |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret key (bypasses RLS for operator ingestion) | Operator CLI |

> [!WARNING]
> **Operator Security Boundary**:
> Run the import script **only** from a secure operator environment or dedicated deployment bastion.
> NEVER embed `SUPABASE_SERVICE_ROLE_KEY` into client environments or automated client builds.

---

## 4. Execution Commands

The repository provides a CLI script: [`scripts/import-india-postal-data.ts`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/scripts/import-india-postal-data.ts) (aliased as `npm run location:import`).

### A. Production & Staging Ingestion (Strict Mode)
Requires a valid CSV file path. Fails loudly with exit code 1 if the input file is missing, empty, or unreadable:

```bash
# Using npm script:
npm run location:import -- /path/to/downloaded_pincode_directory.csv

# Or direct tsx execution:
npx tsx scripts/import-india-postal-data.ts /path/to/downloaded_pincode_directory.csv
```

### B. Local Development & Prototype Seeding (Demo Flag)
When seeding a development environment without the nationwide 150k+ CSV, pass `--demo`:

```bash
npm run location:import -- --demo
```
This populates sample records for major pilot cities (Bengaluru, Jaipur, Mumbai, Delhi).

---

## 5. Production Bootstrap Procedure

1. **Apply Migration**:
   Deploy migration `20260929000025_india_postal_location_schema.sql` via Supabase migration pipeline or Supabase CLI.
2. **Download CSV**:
   Obtain the latest official Department of Posts CSV from data.gov.in.
3. **Execute Importer**:
   From a secure operator terminal with production environment variables set, execute:
   ```bash
   npm run location:import -- ./india_pincode_data.csv
   ```
4. **Observe Output**:
   The script batches records in chunks of 500, outputting progress and a summary table:
   ```text
   Postal Import Summary:
     Total input rows:      155,000+
     Successfully imported: 155,000+
     Skipped (upsert err):  0
     Rejected (invalid):    <small number of header/footer artifacts>
     New cities created:    ...
     New localities created:...
     Mappings created:      ...
   ```

---

## 6. Idempotency & Monthly Refresh Procedure

- **Safe Re-runs**:
  - `india_postal_data` uses `ON CONFLICT (pincode, office_name) DO UPDATE`.
  - `postal_pincode_localities` uses `ON CONFLICT (pincode, locality_id) DO UPDATE`.
  - Running the import script multiple times on the same dataset is fully idempotent and will not duplicate records.
- **Recommended Schedule**:
  - India Post updates the PIN directory periodically (typically monthly/quarterly).
  - Schedule an operator task once a month to pull the latest export from data.gov.in and rerun the importer.
  - DO NOT automate nationwide imports as part of routine application build/deployment pipelines.

---

## 7. Verification & Sanity Checks

After import, run the following SQL queries in the Supabase SQL editor or via `psql` to verify the state:

```sql
-- 1. Check total imported postal records (~150,000 expected nationwide)
SELECT COUNT(*) AS total_postal_offices FROM public.india_postal_data;

-- 2. Verify distinct PIN code count (~19,000–20,000 expected nationwide)
SELECT COUNT(DISTINCT pincode) AS distinct_pincodes FROM public.india_postal_data;

-- 3. Verify locality mapping count
SELECT COUNT(*) AS total_mappings FROM public.postal_pincode_localities;

-- 4. Test RPC lookup directly on known PINs (e.g. Bengaluru, Jaipur)
SELECT public.lookup_pincode('560001');
SELECT public.lookup_pincode('302001');
```

---

## 8. Rollback & Failure Recovery Guidance

- **Failure during batch upsert**:
  If the network drops or the import terminates prematurely, re-running the command resumes cleanly because of upsert idempotency.
- **Malformed source data rollback**:
  If an invalid dataset was inadvertently imported:
  ```sql
  -- Clear imported postal reference records without affecting existing user listings:
  DELETE FROM public.postal_pincode_localities WHERE source = 'india_post_candidate';
  DELETE FROM public.india_postal_data;
  ```
  *Note: Do not truncate `cities` or `localities` if active listings are referencing them.*

---

## 9. Current Environment Status & Test Coverage

- **Database / Schema Validation**:
  - Verified using PGlite in a PostgreSQL-compatible automated test environment ([`tests/security/india-location-security.test.ts`](file:///c:/Users/VivekKumar/OneDrive%20-%20Nobly%20A%20S/Documents/FairSwap/tests/security/india-location-security.test.ts)).
  - Real local Supabase Docker smoke test remains pending on local environments where Docker Desktop engine is unavailable.
- **CSV Parser Smoke Testing**:
  - The importer and parser were tested using an automated test fixture structured to match official Department of Posts headers, BOM encoding, and quote formats. Testing against a live 150k+ production government export will occur during initial production deployment per this runbook.
