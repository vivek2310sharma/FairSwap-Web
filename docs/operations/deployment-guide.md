# FairSwap — Deployment Guide (Public Beta Readiness)

This guide documents the architecture, configuration, secrets management, database migration protocols, and deployment procedures for **FairSwap** (a peer-to-peer local classifieds platform) across local development, staging, and production environments.

---

## 1. System Architecture & Topology

FairSwap is a Next.js (App Router) classifieds platform powered by Supabase (PostgreSQL 15+, GoTrue Auth, PostgREST, and Realtime).

* **Frontend & Server Actions**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4)
* **Authoritative Data & Security Layer**: Supabase PostgreSQL with two-tier RPC architecture (`public` SECURITY INVOKER wrappers delegating to unexposed `app_security` SECURITY DEFINER functions)
* **Object Storage**: Supabase Storage (`listing-originals` and `listing-derivatives` buckets)
* **Authentication & Session Assurance**: Supabase GoTrue Auth with RFC 6238 TOTP AAL2 Multi-Factor Authentication for staff roles
* **Hosting Platforms**:
  * **Staging**: Hosted on Vercel preview branch `staging` (`https://fair-swap-git-staging-fairswap.vercel.app`), connected to Supabase staging project `FairSwapTest` (`wpppxlnbzqynvhpeuavd`).
  * **Production**: Hosted on Vercel production deployment (`main`), connected to dedicated Production Supabase project `FairSwapProd`.

---

## 2. Environment Variables & Secrets Checklist

| Variable Name | Environment | Tier | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Public | Public URL of the Supabase API Gateway / Cloud project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Public | Public publishable anon key for PostgREST & Auth client |
| `SUPABASE_SECRET_KEY` | Server Only | Critical Secret | Privileged secret key. **NEVER expose to client bundles.** |
| `JWT_SECRET` | Server/DB | Critical Secret | Secret HMAC key used to verify Supabase JWTs (min 32 characters) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | CI/Runner Only | Secret | Secret token passed via `x-vercel-protection-bypass` for automated test suites |
| `UPSTASH_REDIS_REST_URL` | Server Only | Secret | Upstash Redis REST endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | Secret | Upstash Redis authentication token |
| `NODE_ENV` | All | Config | Set to `production` in staging and production deployments |
| `PORT` | Optional | Config | HTTP binding port (default: 3000) |

### Secret Management Rules
* Never commit `.env.local` or raw secret strings to version control.
* In production, inject secrets exclusively via Vercel Project Settings or dedicated secret management vaults.
* The `VERCEL_AUTOMATION_BYPASS_SECRET` must be rotated immediately if exposed in test transcripts.

---

## 3. Database Migration Deployment Protocols

FairSwap uses ordered, immutable PostgreSQL migration scripts located in `supabase/migrations/`.
As of Public Beta readiness, migrations are sequenced through **Migration 21**:
* `20260914000001_create_accounts_and_profiles.sql`
* `20260914000002_create_staff_and_security.sql`
* `20260914000003_create_audit_and_privacy.sql`
* `20260914000004_create_categories_and_locations.sql`
* `20260914000005_create_listings.sql`
* `20260914000006_create_listing_media.sql`
* `20260914000007_create_storage_buckets_and_policies.sql`
* `20260914000008_create_listing_rpcs.sql`
* `20260914000009_create_discovery_and_favourites.sql`
* `20260914000010_create_notifications.sql`
* `20260914000011_create_communication.sql`
* `20260914000012_create_abuse_controls_and_reports.sql`
* `20260914000013_create_support_and_appeals.sql`
* `20260914000014_create_privacy_fulfillment_and_fk_safety.sql`
* `20260914000015_correct_report_notification_and_permissions.sql`
* `20260914000016_staff_user_moderation_and_hardening.sql`
* `20260914000017_fix_report_target_visibility.sql`
* `20260916000018_performance_and_reliability_indexes.sql`
* `20260916000019_fix_public_rls_staff_helper_execution.sql`
* `20260918000020_legal_acceptance_and_age_audit.sql`
* `20260918000021_policy_reacceptance_records.sql`

### A. Local Development Deployment
```powershell
# Apply pending migrations to local stack
npx supabase migration up
```

### B. Managed Staging Deployment (`FairSwapTest`)
When deploying schema updates to staging:
```bash
# Link to staging project (ref: wpppxlnbzqynvhpeuavd)
npx supabase link --project-ref wpppxlnbzqynvhpeuavd

# Safely push pending migrations through official migration tracking
npx supabase db push
```

> [!CAUTION]
> **NO AD-HOC DIRECT SQL BYPASSES**:
> Do **NOT** execute raw SQL scripts via arbitrary `psql -f` commands that bypass `supabase_migrations.schema_migrations`. All schema changes must be versioned migrations tracked in the migration table.

### C. Managed Production Deployment
> [!IMPORTANT]
> **PRODUCTION FREEZE IN EFFECT**:
> Production deployment requires **explicit written authorization from the Platform Owner (Vivek Kumar)**.
> When authorized, production migrations must be applied using:
> `npx supabase db push --linked` (linked to the production project ref `FairSwapProd`).

---

## 4. Application Build & Quality Gates

Before any deployment, the application must pass all quality gates locally or in CI:

```bash
# 1. Typecheck validation
corepack pnpm typecheck

# 2. Linting verification
corepack pnpm lint

# 3. Unit, Security, and Reliability Tests
corepack pnpm test:unit
corepack pnpm test:security

# 4. Production Next.js Build
corepack pnpm build
```

---

## 5. Rollback Procedures & Failure Behavior

### A. Application Rollback (Vercel)
1. **Compatibility Check**: Before rolling back the frontend in Vercel, verify whether the prior build artifact is compatible with the current database schema.
   * FairSwap strictly follows a **forward-only database migration strategy**; schema rollbacks are not executed in place.
   * If the previous frontend build is backward-compatible with the migrated schema: proceed with frontend rollback.
   * If the previous frontend build relies on obsolete database structures: do **not** roll back frontend alone. Deploy a forward corrective patch.
2. Navigate to the **Deployments** tab in the Vercel dashboard.
3. Identify the last known-good deployment commit SHA.
4. Click the deployment menu `...` and select **Instant Rollback**.
5. Traffic is routed to the prior build artifact within seconds without rebuilding.

### B. Database Forward Corrective Strategy
* FairSwap enforces a **forward-only corrective migration strategy**.
* Do **NOT** execute destructive `DROP TABLE` or destructive down-migrations in active production.
* If a defect is discovered in a deployed migration, write and push a new forward corrective migration (e.g. Migration 22) that safely repairs constraints or functions while preserving data.
* Full database restore from backup is reserved strictly for catastrophic data loss disaster recovery scenarios.

### C. Storage Media Recovery
* If specific image assets are accidentally deleted or corrupted, restore missing image bytes by querying the backup manifest and uploading to the affected bucket via `scripts/backup-storage.ts` tooling without overwriting unrelated active objects.

---

## 6. External Launch Prerequisites (India Classifieds Context)

Before opening FairSwap to public consumer traffic:
1. **Operational Ownership Handover**: Onboard and verify a qualified Backup Production Owner pursuant to `docs/operations/operational-owner-matrix.md`.
2. **Production Transactional Email (SMTP)**: Switch from development/sandbox email to a verified transactional email provider (SendGrid / Postmark / Amazon SES) with configured SPF, DKIM, and DMARC DNS records.
3. **Statutory Grievance Officer**: Publish the legal name, contact email, and address of the statutory Grievance Officer on `/contact` and `/terms` pursuant to the India Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules.
4. **Custom Domain & TLS**: Bind `fairswap.in` with automated HTTPS certificate renewal and verify CAA DNS records.
5. **Production Recovery Verification**: Perform a human-authorized backup and restore drill on `FairSwapProd` and record evidence.
6. **External Monitoring Configuration**: Provision uptime synthetic probes and alert routing for `https://fairswap.in`.
