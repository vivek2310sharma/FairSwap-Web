# FairSwap — Deployment Guide

This guide documents the architecture, configuration, secrets management, database migration protocols, and deployment procedures for **FairSwap** across local development, staging, and production environments.

---

## 1. System Architecture & Topology

FairSwap is a Next.js (App Router) marketplace application powered by Supabase (PostgreSQL 15+, GoTrue Auth, PostgREST, and Realtime).

* **Frontend & Server Actions**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4)
* **Authoritative Data & Security Layer**: Supabase PostgreSQL with two-tier RPC architecture (`public` SECURITY INVOKER wrappers delegating to unexposed `app_security` SECURITY DEFINER functions)
* **Object Storage**: Supabase Storage (`listing-originals` and `listing-derivatives` buckets)
* **Authentication & Session Assurance**: Supabase GoTrue Auth with RFC 6238 TOTP AAL2 Multi-Factor Authentication for staff roles
* **Hosting Platforms / Branch Model**:
  * **Production**: `main` → Vercel Production → `https://fairswap.in` → Supabase `FairSwapProd` (`kriuhwppxgxsyyrbjsau`).
  * **Shared Staging**: `staging` → stable Vercel Preview `https://fair-swap-git-staging-fairswap.vercel.app` → Supabase `FairSwapTest` (`wpppxlnbzqynvhpeuavd`). The stable staging domain is explicitly shareable with testers; other previews remain protected by default.
  * **Feature Development**: short-lived `feature/*` branches → Vercel Preview → `FairSwapTest`. Merge accepted feature work into `staging` for shared verification before promoting it to `main`.
  * Long-lived milestone/history branches such as `Phase1`/`Phase2` are not part of the active deployment model. The historical Phase 1 baseline is preserved by tag instead.

---

## 2. Environment Variables & Secrets Checklist

| Variable Name | Environment | Tier | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Public | Supabase project URL. Production points to FairSwapProd; Preview/staging points to FairSwapTest. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cloud deploys | Public | Preferred modern browser/server publishable key for Supabase Auth and Direct API access. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local / legacy fallback | Public | Legacy public anon-key fallback supported by the application where required. |
| `SUPABASE_SECRET_KEY` | Cloud server only | Critical Secret | Preferred modern privileged Supabase server key. **NEVER expose to client bundles.** |
| `SUPABASE_SERVICE_ROLE_KEY` | Local / legacy fallback, server only | Critical Secret | Legacy privileged fallback. **NEVER expose to client bundles.** |
| `NEXT_PUBLIC_SITE_URL` | Production / stable staging | Public | Canonical application origin used to build Auth confirmation/recovery callbacks. Production is `https://fairswap.in`; staging is branch-scoped to the stable staging URL. |
| `JWT_SECRET` | Server/DB | Critical Secret | Secret HMAC key used where required by local/operational tooling (min 32 characters). |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | CI/Runner Only | Secret | Secret token passed via `x-vercel-protection-bypass` for authorized automated test suites. Rotate immediately if exposed. |
| `UPSTASH_REDIS_REST_URL` | Server Only | Secret | Upstash Redis REST endpoint for distributed rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | Secret | Upstash Redis authentication token. |
| `NODE_ENV` | All | Config | Set to `production` in Vercel staging and production deployments. |
| `PORT` | Optional | Config | HTTP binding port (default: 3000). |

### Current cloud environment mapping

| Environment | Git/Vercel target | Supabase project | `NEXT_PUBLIC_SITE_URL` |
|---|---|---|---|
| Production | `main` / Vercel Production / `https://fairswap.in` | `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) | `https://fairswap.in` |
| Shared staging | `staging` / Vercel Preview / stable branch URL | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) | `https://fair-swap-git-staging-fairswap.vercel.app` |
| Feature previews | short-lived `feature/*` / Vercel Preview | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) | Configure a branch-appropriate callback only when an Auth flow must be exercised directly on that preview; otherwise validate Auth on shared `staging`. |

### Secret Management Rules
* Never commit `.env.local` or raw secret strings to version control.
* In production, inject secrets exclusively via Vercel Project Settings or dedicated secret management vaults.
* The `VERCEL_AUTOMATION_BYPASS_SECRET` must be rotated immediately if exposed in test transcripts.

---

## 3. Database Migration Deployment Protocols

FairSwap uses ordered, immutable PostgreSQL migration scripts located in `supabase/migrations/`.
As of the controlled production pilot baseline, migrations are sequenced through **Migration 19**:
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

### C. Promotion invariant: FairSwapTest first, then FairSwapProd

For every schema-changing milestone:

1. Create a new migration file; test locally where applicable.
2. Apply that migration to **FairSwapTest** first and verify the application/security behavior there.
3. Promote the **exact same immutable migration file** to **FairSwapProd** only after acceptance and explicit production authorization.
4. Never edit or rewrite a migration that has already been applied to FairSwapProd. Corrections use a new follow-on migration.
5. Prefer backward-compatible **expand → migrate → contract** changes so staging and production application versions can coexist safely during rollout.
6. Because feature previews and shared staging use the same FairSwapTest database, run only **one schema-changing milestone at a time**. Avoid concurrent incompatible migration work across preview branches.

### D. Managed Production Deployment (`FairSwapProd`)

Production is active and is no longer under the old Milestone 1.6 pre-production freeze. Production changes still require explicit human authorization and the promotion invariant above.

Before a production database push, verify that the CLI is linked to `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) rather than FairSwapTest. Prefer an isolated release context/worktree or otherwise verify the linked project immediately before the command.

```bash
# After FairSwapTest verification and explicit production authorization
npx supabase db push --linked
```

Application promotion is through reviewed Git changes to `main`; Vercel Production then deploys `main` to `https://fairswap.in`.

---

## 4. Application Build & Quality Gates

Before any deployment, the application must pass all quality gates locally or in CI:

```bash
# 1. Typecheck validation
pnpm typecheck

# 2. Linting verification
pnpm lint

# 3. Unit, Security, and Reliability Tests
pnpm test:unit
pnpm test:security
pnpm test:reliability

# 4. Production Next.js Build
pnpm build
```

---

## 5. Rollback Procedures

### A. Application Rollback (Vercel)
1. Navigate to the **Deployments** tab in the Vercel dashboard.
2. Identify the last known-good deployment commit SHA.
3. Click the deployment menu `...` and select **Instant Rollback**.
4. Traffic is routed to the prior build artifact within seconds without rebuilding.

### B. Database Forward Corrective Strategy
* FairSwap enforces a **forward-only corrective migration strategy**.
* Do **NOT** execute destructive `DROP TABLE` or destructive down-migrations in active production.
* If a defect is discovered in a deployed migration, write and push a new forward corrective migration (e.g. Migration 20) that safely repairs constraints or functions while preserving data.
* Full database restore from backup is reserved strictly for catastrophic data loss disaster recovery scenarios.

### C. Storage Media Recovery
* If specific image assets are accidentally deleted or corrupted, restore missing image bytes by querying the backup manifest and uploading to the affected bucket via `scripts/backup-storage.ts` tooling without overwriting unrelated active objects.

---

## 6. External Launch Prerequisites (India Marketplace Context)

The controlled production pilot has completed these previously gated infrastructure items:

- **Production Transactional Email (SMTP)**: Supabase custom SMTP is configured through Resend using the verified `auth.fairswap.in` sending domain and has passed delivery testing.
- **Custom Domain & TLS**: `fairswap.in` and `www.fairswap.in` are bound to Vercel with HTTPS/TLS established.

Before opening FairSwap to wider public consumer traffic, the remaining external gates include:

1. **Statutory Grievance Officer / Compliance**: Complete and publish the required Grievance Officer information and any related launch compliance work.
2. **Legal Review**: Complete legal review of the applicable public-facing user agreements and policies.
3. **Dedicated Operations On-Call**: Confirm the required operational owners, escalation paths, and on-call coverage for public traffic.

These are public-launch gates, not blockers to the already established controlled technical pilot.
