# FairSwap — Deployment Guide (Public Beta Readiness)

This guide documents the architecture, configuration, secrets management, database migration protocols, and deployment procedures for **FairSwap** (a peer-to-peer local classifieds platform) across local development, staging, and production environments.

---

## 1. System Architecture & Topology

FairSwap is a Next.js (App Router) classifieds platform powered by Supabase (PostgreSQL 15+, GoTrue Auth, PostgREST, and Realtime).

* **Frontend & Server Actions**: Next.js 16 (React 19, Turbopack, Tailwind CSS v4)
* **Authoritative Data & Security Layer**: Supabase PostgreSQL with two-tier RPC architecture (`public` SECURITY INVOKER wrappers delegating to unexposed `app_security` SECURITY DEFINER functions)
* **Object Storage**: Supabase Storage (`listing-originals` and `listing-derivatives` buckets)
* **Authentication & Session Assurance**: Supabase GoTrue Auth with RFC 6238 TOTP AAL2 Multi-Factor Authentication for staff roles
* **Hosting Platforms / Branch Model**:
  * **Production**: `main` -> Vercel Production -> `https://fairswap.in` -> Supabase `FairSwapProd` (`kriuhwppxgxsyyrbjsau`).
  * **Shared Staging**: `staging` -> stable Vercel Preview `https://fair-swap-git-staging-fairswap.vercel.app` -> Supabase `FairSwapTest` (`wpppxlnbzqynvhpeuavd`). The stable staging domain is explicitly shareable with testers; other previews remain protected by default.
  * **Feature Development**: short-lived feature/fix branches start from current `staging`, use Vercel Preview and `FairSwapTest`, then merge accepted work back into `staging` for shared verification before production promotion.
  * **Production Hotfixes**: an explicitly authorized urgent production fix may branch from `main`, but the resulting `main` change must be reconciled back into `staging` promptly.
  * Long-lived milestone/history branches such as `Phase1`/`Phase2` are not part of the active deployment model.

---

## 2. Environment Variables & Secrets Checklist

| Variable Name | Environment | Tier | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Public | Supabase project URL. Production points to FairSwapProd; preview/staging points to FairSwapTest. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cloud deploys | Public | Preferred browser/server publishable key for Supabase Auth and Direct API access. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local / legacy fallback | Public | Legacy public anon-key fallback supported where required. |
| `SUPABASE_SECRET_KEY` | Cloud server only | Critical Secret | Preferred privileged Supabase server key. **NEVER expose to client bundles.** |
| `SUPABASE_SERVICE_ROLE_KEY` | Local / legacy fallback, server only | Critical Secret | Legacy privileged fallback. **NEVER expose to client bundles.** |
| `NEXT_PUBLIC_SITE_URL` | Production / stable staging | Public | Canonical application origin used for Auth callbacks and indexing behavior. Production is `https://fairswap.in`; shared staging uses the stable staging URL. |
| `JWT_SECRET` | Server/DB | Critical Secret | Secret HMAC key used to verify Supabase JWTs (min 32 characters) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | CI/Runner Only | Secret | Secret token passed via `x-vercel-protection-bypass` for automated test suites |
| `UPSTASH_REDIS_REST_URL` | Server Only | Secret | Upstash Redis REST endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | Secret | Upstash Redis authentication token |
| `RESEND_WEBHOOK_SECRET` | Server Only | Critical Secret | Signing secret used to authenticate Resend webhook deliveries; never expose to clients or logs |
| `OPERATIONS_ALERT_WEBHOOK_URL` | Server Only | Secret | HTTPS operational alert sink for sanitized Resend failure/bounce events; treat the URL as a credential |
| `NODE_ENV` | All | Config | Set to `production` in staging and production deployments |
| `PORT` | Optional | Config | HTTP binding port (default: 3000) |

### Current cloud environment mapping

| Environment | Git/Vercel target | Supabase project | `NEXT_PUBLIC_SITE_URL` |
|---|---|---|---|
| Production | `main` / Vercel Production / `https://fairswap.in` | `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) | `https://fairswap.in` |
| Shared staging | `staging` / stable Vercel Preview | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) | `https://fair-swap-git-staging-fairswap.vercel.app` |
| Feature previews | short-lived feature/fix branch / Vercel Preview | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) | Configure a branch-appropriate callback only when an Auth flow must be exercised directly on that preview; otherwise validate Auth on shared staging. |

### Secret Management Rules
* Never commit `.env.local` or raw secret strings to version control.
* In production, inject secrets exclusively via Vercel Project Settings or dedicated secret management vaults.
* The `VERCEL_AUTOMATION_BYPASS_SECRET` must be rotated immediately if exposed in test transcripts.
* Rotate `RESEND_WEBHOOK_SECRET` if exposed and update the matching Resend webhook configuration. During planned rotations, follow the provider's supported overlap window where available.
* Treat `OPERATIONS_ALERT_WEBHOOK_URL` as a secret because incoming-webhook URLs commonly authorize message delivery to the destination.

---

### Transactional Email Failure Monitoring

Production Auth email is delivered by Supabase Auth through Resend SMTP. FairSwap's application-side delivery-event receiver is:

- Endpoint: `POST /api/monitoring/resend`
- Signing secret: `RESEND_WEBHOOK_SECRET` (server only)
- Alert sink: `OPERATIONS_ALERT_WEBHOOK_URL` (server only, HTTPS)
- Actionable Resend events: `email.bounced`, `email.complained`, `email.delivery_delayed`, `email.failed`, and `email.suppressed`

The route verifies the exact raw request body with the Resend/Svix signature headers, rejects timestamps outside the replay window, and never forwards recipient addresses, subjects, message bodies, or provider error text to the operations alert destination. Only provider event identifiers, event type, occurrence time, severity, and coarse bounce classification are included.

For actionable events, an unavailable or failed operations alert returns HTTP 503 so the provider can retry delivery rather than silently acknowledging an unalerted failure event. Configure and test the alert sink **before** enabling the production Resend webhook.

The Resend webhook endpoint/signing secret and alert-sink URL must be different per environment. No webhook secret or incoming-alert URL belongs in Git.

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

### C. Promotion invariant: FairSwapTest first, then FairSwapProd

For every schema-changing milestone:

1. Create a new migration file and test locally where applicable.
2. Apply that migration to **FairSwapTest** first and verify the application/security behavior there.
3. Promote the **exact same immutable migration file** to **FairSwapProd** only after acceptance and explicit production authorization.
4. Never edit or rewrite a migration already applied to FairSwapProd. Corrections use a new follow-on migration.
5. Prefer backward-compatible **expand -> migrate -> contract** changes so staging and production application versions can coexist safely during rollout.
6. Because feature previews and shared staging use the same FairSwapTest database, run only one schema-changing milestone at a time.

### D. Managed Production Deployment (`FairSwapProd`)

Production is active. Production changes still require explicit human authorization and the promotion invariant above.

Before a production database push, verify that the CLI is linked to `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) rather than FairSwapTest. Prefer an isolated release context/worktree or otherwise verify the linked project immediately before the command.

```bash
# After FairSwapTest verification and explicit production authorization
npx supabase db push --linked
```

Application promotion is through a reviewed `staging` -> `main` release PR; Vercel Production then deploys `main` to `https://fairswap.in`.

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

## 6. External Launch Prerequisites & Operational Posture

Operational, legal, and infrastructure status for public traffic:
1. **Operational Ownership**: FairSwap operates under an accepted single-operator model (Vivek Kumar as sole operator). The operational risk of proceeding without a designated Backup Production Owner was explicitly accepted by the Platform Owner on 2026-09-19 under Issue #41 (see [`docs/operations/operational-owner-matrix.md`](./operational-owner-matrix.md)).
2. **Production Transactional Email & Monitoring**: Production transactional email operates via custom Supabase SMTP through Resend (`auth.fairswap.in`). Production failure monitoring is active and verified end-to-end via signed Resend webhooks (`POST /api/monitoring/resend`) delivering sanitized failure alerts to the operations Slack webhook (passed 2026-09-19 under Issue #41).
3. **Statutory Grievance Mechanism & Legal Policies**: Promoted to production on 2026-09-19 (PR #56). Implemented via `/grievance` (Grievance Officer: Vivek Kumar), `/terms`, `/privacy`, `/acceptable-use`, `/security`, and global footer links with conditional Rule 3A / GAC guidance (subject to final legal review under Issue #38).
4. **External Uptime & TLS Monitoring**: UptimeRobot HTTP/keyword monitoring and Cloudflare Universal SSL certificate alerts are configured and verified active on `https://fairswap.in`. Dedicated DNS monitoring was closed via owner risk acceptance under #41.
5. **Production Backup Posture**: `FairSwapProd` operates on the Supabase Free plan with no managed backups or PITR; no production restore exercise has been executed. The Platform Owner explicitly accepted this residual data-loss and recovery risk under Issue #41 on 2026-09-19. If backups are added later, verify recovery only into disposable non-production targets; never restore a test backup over `FairSwapProd`.
6. **Application Error Monitoring**: Additional automated alerting channels (5xx, client errors, Supabase DB/storage/realtime metrics, auth spikes) were closed as owner-accepted residual risks under #41 on 2026-09-19.
