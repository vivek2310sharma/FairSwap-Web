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
| `RESEND_API_KEY` | Supabase Edge Function / Server | Critical Secret | API key for transactional email dispatch via Resend; configured as Supabase Edge Function secret |
| `EMAIL_FROM` | Supabase Edge Function / Server | Config | Sender identity (e.g. `FairSwap <notifications@fairswap.in>`) |
| `EMAIL_WORKER_SECRET` | Supabase Edge Function / Webhook | Secret | Shared secret authenticating Edge Function triggers from Database Webhooks and cron runners |
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

---

### Listing Transactional Email Outbox & Edge Function Pipeline (Issue #83)

Listing lifecycle state transitions trigger durable transactional email jobs stored in `public.email_outbox`.

The production/staging deployment architecture requires **two complementary execution paths**:

```text
New email_outbox INSERT
    -> PostgreSQL AFTER INSERT trigger (Migration 23)
    -> pg_net asynchronous POST
    -> immediate process-email-outbox invocation

AND

Recurring scheduler (REQUIRED operational configuration)
    -> pg_cron every 5 minutes
    -> app_security.invoke_email_outbox_retry_batch()
    -> pg_net batch invocation
    -> retry jobs whose next_attempt_at has elapsed
    -> reclaim stale processing leases
```

1. **Immediate Execution (PostgreSQL trigger + pg_net)**: Fires on `INSERT` to deliver emails to users within seconds under normal conditions. The trigger is fail-safe and must never roll back the parent listing transaction if dispatch infrastructure is unavailable.
2. **Periodic Retry & Recovery (pg_cron - REQUIRED)**: Immediate INSERT dispatch cannot process future retries. The canonical recurring scheduler executes every 5 minutes and is **MANDATORY** to claim pending retries whose `next_attempt_at` has passed and to recover leases from crashed workers (`locked_at < NOW() - 10 minutes`).

#### Supported Email Events & Recipients
1. **`listing_submitted_for_review`**: When any listing enters `pending_review`, enqueues notifications to all active staff whose role is `administrator` or `moderator`. Excludes `support_agent` and `content_editor`, and prohibits self-review notification (does not notify the seller even if the seller is staff).
2. **`listing_approved`**: When a listing transitions from `pending_review` to `active`, enqueues a notification to the seller with a link to the live listing (`/listings/<slug>`), respecting `user_accounts.notification_preferences.email_notifications`.
3. **`listing_rejected`**: When a listing transitions from `pending_review` to `rejected`, enqueues a notification to the seller with the moderation rejection reason and the seller edit link (`/account/listings/<id>/edit`), respecting `notification_preferences.email_notifications`.

#### Security & Access Control
- `public.email_outbox` has RLS enabled with fail-closed permissions. Direct SELECT, INSERT, UPDATE, and DELETE are strictly revoked from `PUBLIC`, `anon`, and `authenticated`.
- **Two-Layer RPC Pattern**: Worker functions follow FairSwap's standard two-layer pattern:
  - Private implementations in `app_security` (`impl_claim_email_outbox_batch`, `impl_claim_email_outbox_job_by_id`, `impl_complete_email_outbox_job`, `impl_fail_email_outbox_job`) are `SECURITY DEFINER`.
  - Narrow wrappers in `public` (`claim_email_outbox_batch`, `claim_email_outbox_job_by_id`, `complete_email_outbox_job`, `fail_email_outbox_job`) delegate to `app_security.impl_*`.
  - All execute privileges are strictly revoked from `PUBLIC`, `anon`, and `authenticated`. Only `service_role` is granted EXECUTE on both layers.
  - The `app_security` schema is never exposed to PostgREST.
- Recipient email addresses are never stored in plain outbox payloads; they are resolved server-side from `auth.users` via Supabase Auth Admin API during job execution.
- HTML escaping is strictly enforced on all user- and staff-supplied text (listing titles, rejection reasons) prior to rendering email bodies.
- Safe link sanitization ensures outbound URLs cannot be manipulated into protocol-relative or external open redirects.

#### Required PostgreSQL Extensions (Migration 24)
The transactional email notifications pipeline requires the following PostgreSQL extensions:
- `pg_net`: Asynchronous HTTP client for immediate trigger-based dispatch and scheduled batch execution.
- `pg_cron`: Periodic in-database job scheduler for retry recovery and stale-lease reclamation.
- `supabase_vault`: Encrypted secret storage for worker URLs and authentication credentials.

These extensions and their required runtime capabilities are declared, enabled, and validated by **Migration 24** (`20260926000024_email_outbox_runtime_extensions.sql`). Migration 24 also ensures the canonical 5-minute scheduler job `process-email-outbox-retries` is converged.

#### Worker Edge Function Configuration
The worker is located at `supabase/functions/process-email-outbox/index.ts`. Required Edge Function environment values:

**1. Platform-provided Edge Function environment variables** (automatically injected by Supabase runtime; do **not** set manually via `supabase secrets set`):
- `SUPABASE_URL`: Supabase project API URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Privileged service role secret key (used server-side inside the worker for Auth/DB operations only; **never** accepted for inbound worker authentication).

**2. Custom Edge Function secrets** (configured per environment via `supabase secrets set`):
- `RESEND_API_KEY`: API key for outbound dispatch via Resend.
- `EMAIL_FROM`: Sender identity (e.g. `FairSwap <notifications@auth.fairswap.in>`).
- `SITE_URL`: Application canonical origin (e.g. `https://fairswap.in` in production; `https://fair-swap-git-staging-fairswap.vercel.app` in staging).
- `EMAIL_WORKER_SECRET`: Dedicated authorization secret used exclusively to authenticate webhook and batch runner invocations.

> [!NOTE]
> The transactional email pipeline has been verified on `FairSwapTest` across the complete operational matrix:
> - Migration 22 (`20260926000022_listing_email_notifications.sql`)
> - Migration 23 (`20260926000023_email_outbox_dispatch_runtime.sql`)
> - Migration 24 (`20260926000024_email_outbox_runtime_extensions.sql`)
> - Deployed `process-email-outbox` Edge Function under the live Supabase Deno Edge Runtime
> - Real Resend email delivery (submission, approval, and rejection notifications)
> - Immediate dispatch trigger via `pg_net`
> - 5-minute retry scheduler via `pg_cron`
> - Downstream failure isolation (listing moderation never rolls back)
> - Secret and credential rotation (Vault worker secret and Resend API key)
> Production deployment and verification remain strictly pending formal release authorization.

#### Edge Function JWT Verification (`verify_jwt = false`)
Because the Edge Function relies on custom webhook authentication via `EMAIL_WORKER_SECRET` rather than a standard user JWT, default Supabase API gateway JWT verification must be disabled:
- In `supabase/config.toml`:
  ```toml
  [functions.process-email-outbox]
  verify_jwt = false
  ```
- When deploying via CLI:
  ```bash
  supabase functions deploy process-email-outbox --no-verify-jwt
  ```
If `verify_jwt` is not set to `false`, the Supabase API Gateway will reject incoming Database Webhook calls before they reach the Edge Function code.

#### Immediate Dispatch & Retry Scheduler Architecture (Migration 23)

FairSwap uses an environment-portable, declarative database runtime architecture codified in **Migration 23** (`20260926000023_email_outbox_dispatch_runtime.sql`) that combines PostgreSQL triggers, `pg_net`, `pg_cron`, and **Supabase Vault**:

```text
New email_outbox INSERT
    -> trg_email_outbox_immediate_dispatch
    -> app_security.trg_fn_notify_email_outbox_worker() (SECURITY DEFINER)
    -> reads Vault: email_outbox_worker_url & email_worker_secret
    -> pg_net asynchronous HTTP POST
    -> process-email-outbox invocation (immediate delivery)

AND

Recurring scheduler (pg_cron every 5 minutes: '*/5 * * * *')
    -> cron.job 'process-email-outbox-retries'
    -> SELECT app_security.invoke_email_outbox_retry_batch() (SECURITY DEFINER)
    -> reads Vault: email_outbox_worker_url & email_worker_secret
    -> pg_net batch HTTP POST ({})
    -> process-email-outbox batch runner (recovers retries & stale leases)
```

#### Key Architecture & Security Guarantees:
1. **Immediate Execution**: Fires asynchronously on `INSERT` to deliver emails within seconds without blocking or slowing the database transaction.
2. **Fail-Safe Transaction Isolation**: The immediate-dispatch trigger function wraps the Vault retrieval and `net.http_post` call in an exception block. If Vault is unconfigured or a network error occurs, the trigger logs a warning and allows the transaction to commit. Under NO circumstances does downstream email dispatch cause listing submission, approval, or rejection to fail.
3. **Encrypted Credentials at Rest**: Secrets and endpoint URLs are stored in Supabase Vault (`vault.decrypted_secrets`), NOT in plain SQL trigger arguments, cron job commands, or git.
4. **Clean Cron Command**: `cron.job.command` contains only `SELECT app_security.invoke_email_outbox_retry_batch();`, completely free of embedded URLs or credentials.
5. **Periodic Retry & Recovery (REQUIRED)**: The 5-minute recurring scheduler is mandatory to process future retries whose `next_attempt_at` has passed and reclaim stale leases (`locked_at < NOW() - 10 minutes`).

#### Canonical 6-Step Deployment Order:
1. **Apply Migrations**:
   Run database migrations to apply Migration 22 (schema, outbox, RPCs), Migration 23 (dispatch trigger, retry batch function), and Migration 24 (runtime extensions, capability verification, canonical scheduler convergence):
   ```bash
   supabase db push
   ```
2. **Configure Supabase Vault Secrets** (per environment):
   Store the worker URL and dedicated worker secret in Vault:
   ```sql
   -- email_outbox_worker_url: Edge Function process-email-outbox URL
   SELECT vault.create_secret(
     'https://<project-ref>.supabase.co/functions/v1/process-email-outbox',
     'email_outbox_worker_url',
     'Edge Function endpoint for email outbox worker'
   );

   -- email_worker_secret: 256-bit cryptographically secure shared secret
   SELECT vault.create_secret(
     '<EMAIL_WORKER_SECRET>',
     'email_worker_secret',
     'Dedicated authentication secret for email outbox worker'
   );
   ```
3. **Configure Edge Function Secrets**:
   Set custom runtime secrets via Supabase CLI (do NOT commit secrets to Git):
   ```bash
   supabase secrets set \
     RESEND_API_KEY="re_..." \
     EMAIL_FROM="FairSwap <notifications@auth.fairswap.in>" \
     SITE_URL="https://fairswap.in" \
     EMAIL_WORKER_SECRET="<EMAIL_WORKER_SECRET>"
   ```
   *(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are platform-provided and automatically injected by the Edge Runtime).*
4. **Deploy Edge Function**:
   Deploy `process-email-outbox` with `--no-verify-jwt`:
   ```bash
   supabase functions deploy process-email-outbox --no-verify-jwt
   ```
5. **Verify Immediate Dispatch**:
   Perform a controlled listing transition and verify the trigger invokes `net.http_post`, claims the job, and transitions `status` to `sent` with populated `provider_message_id`.
6. **Verify Cron Retry Runner**:
   Execute `SELECT app_security.invoke_email_outbox_retry_batch();` and inspect `net._http_response` to verify status code 200. Check `SELECT * FROM cron.job WHERE jobname = 'process-email-outbox-retries';`.

#### Retry Strategy & Idempotency
- **Idempotency**: Resend calls include an `Idempotency-Key` header formatted as `fairswap/listing-email/<outbox-row-id>`, preventing duplicate sends on retries. At the database layer, `CONSTRAINT uq_email_outbox_transition_event_recipient UNIQUE (transition_id, event_type, recipient_user_id)` prevents duplicate transitions from spawning redundant outbox jobs.
- **Retry Backoff**: Temporary failures (HTTP 429 rate limits, HTTP 5xx errors, network timeouts) transition the job to `status = 'retry'` with bounded exponential backoff (60s, 300s, 900s, 3600s, 7200s).
- **Dead-Letter Handling**: Permanent client errors (HTTP 4xx such as unverified domain, missing recipient in `auth.users`, template parsing error) or jobs exceeding 5 failed attempts transition immediately to `status = 'dead_letter'`.
- **Stale Lease Recovery**: If a worker node crashes mid-processing, jobs with `status = 'processing'` whose `locked_at` timestamp is older than 10 minutes (600s) are automatically re-claimed by subsequent worker runs.

#### Manual Dead-Letter Recovery Procedure
Operators can inspect and re-queue dead-letter jobs after addressing root causes (e.g. provider outages, domain verification):

1. **Inspect Dead-Letter Jobs**:
```sql
SELECT id, event_type, recipient_user_id, last_error_code, last_error_status, last_error_message, attempt_count, updated_at
FROM public.email_outbox
WHERE status = 'dead_letter'
ORDER BY updated_at DESC;
```

2. **Re-queue Specific Job for Processing**:
```sql
UPDATE public.email_outbox
SET status = 'pending',
    attempt_count = 0,
    next_attempt_at = clock_timestamp(),
    locked_at = NULL,
    lock_token = NULL,
    updated_at = clock_timestamp()
WHERE id = '<job_id>';
```

3. **Re-queue Batch of Dead-Letter Jobs**:
```sql
UPDATE public.email_outbox
SET status = 'pending',
    attempt_count = 0,
    next_attempt_at = clock_timestamp(),
    locked_at = NULL,
    lock_token = NULL,
    updated_at = clock_timestamp()
WHERE status = 'dead_letter' AND last_error_code = '<resolvable_error_code>';
```

---

## 3. Database Migration Deployment Protocols

FairSwap uses ordered, immutable PostgreSQL migration scripts located in `supabase/migrations/`.
As of Issue #83 production-release readiness, repository migrations are sequenced through **Migration 24**. Production remains unchanged until the production preflight and an explicitly authorized deployment:
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
* `20260926000022_listing_email_notifications.sql`
* `20260926000023_email_outbox_dispatch_runtime.sql`
* `20260926000024_email_outbox_runtime_extensions.sql`

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
   * **Location Contract Guard (Issue #81)**: If database migrations 25–30 have been applied, **DO NOT reopen listing writes on the old UI**. The old frontend code permits listing submissions without validated PIN codes and sends raw unconstrained locality strings, which triggers contract failures in `app_security.impl_seller_submit_listing`. If a deployment fails after database migrations, keep seller-write maintenance active and forward-deploy a fix.
2. Navigate to the **Deployments** tab in the Vercel dashboard.
3. Identify the last known-good deployment commit SHA.
4. Click the deployment menu `...` and select **Instant Rollback**.
5. Traffic is routed to the prior build artifact within seconds without rebuilding.

### B. Database Migration & Rollback Semantics (Migrations 25–30)
* **Non-Atomic Migration Series**: Running `npx supabase db push` executes migration scripts sequentially; it is **NOT globally atomic**.
* **Before Migration 25**: If the deployment is aborted before executing Migration 25, the database remains in its previous state (**safe abort**).
* **After Any Migration Succeeds**:
  * Do **NOT** assume all prior migrations rolled back if a later migration fails.
  * Keep the listing maintenance window enabled.
  * Inspect the actual migration state via `supabase_migrations.schema_migrations`.
  * Continue forward by diagnosing and repairing the specific migration or performing an explicitly reviewed DB forward fix.
* **Ingestion Interruption / Failure**:
  * If the nationwide CSV ingestion is interrupted or fails after checksum verification, do **NOT** automatically purge or truncate production postal/locality data as the first action.
  * The importer is designed around idempotent upserts (`ON CONFLICT ... DO UPDATE`).
  * Diagnose the transient issue and re-run the same SHA-256-locked importer to converge the snapshot safely.

### C. Seller-Write Maintenance Window Protocol
* **Unconditional Table Triggers Prohibited**: An unconditional `BEFORE INSERT OR UPDATE ON public.listings` trigger must **not** be used, as it blocks administrative moderation reviews, staff audit logs, and system operations.
* **Scoped Seller-Write Guard**: Use an application-level toggle (`NEXT_PUBLIC_MAINTENANCE_SELLER_WRITES`) to intercept listing creation (`/account/listings/new`), draft edits (`/account/listings/[id]/edit`), and review submissions (`submitListingForReview`), while leaving buyer-seller messaging, discovery/search, authentication, and staff/admin tools operational. (See [`docs/india-postal-data.md`](../india-postal-data.md) Section 11 for complete procedure).

### D. Storage Media Recovery
* If specific image assets are accidentally deleted or corrupted, restore missing image bytes by querying the backup manifest and uploading to the affected bucket via `scripts/backup-storage.ts` tooling without overwriting unrelated active objects.

---

## 6. External Launch Prerequisites & Operational Posture

Operational, legal, and infrastructure status for public traffic:
1. **Operational Ownership**: FairSwap operates under an accepted single-operator model (Vivek Kumar as sole operator). The operational risk of proceeding without a designated Backup Production Owner was explicitly accepted by the Platform Owner on 2026-09-19 under Issue #41 (see [`docs/operations/operational-owner-matrix.md`](./operational-owner-matrix.md)).
2. **Production Transactional Email & Monitoring**: Production transactional email operates via custom Supabase SMTP through Resend (`auth.fairswap.in`). Production failure monitoring is active and verified end-to-end via signed Resend webhooks (`POST /api/monitoring/resend`) delivering sanitized failure alerts to the operations Slack webhook (passed 2026-09-19 under Issue #41).
3. **Statutory Grievance Mechanism & Legal Policies**: Promoted to production on 2026-09-19 (PR #56). Implemented via `/grievance` (Grievance Officer: Vivek Kumar), `/terms`, `/privacy`, `/acceptable-use`, `/safety`, and global footer links with conditional Rule 3A / GAC guidance (unresolved legal applicability deferred under closed Issue #38).
4. **External Uptime & TLS Monitoring**: UptimeRobot HTTP/keyword monitoring and Cloudflare Universal SSL certificate alerts are configured and verified active on `https://fairswap.in`. Dedicated DNS monitoring was closed via owner risk acceptance under #41.
5. **Production Backup Posture**: `FairSwapProd` operates on the Supabase Free plan with no managed backups or PITR; no production restore exercise has been executed. The Platform Owner explicitly accepted this residual data-loss and recovery risk under Issue #41 on 2026-09-19. If backups are added later, verify recovery only into disposable non-production targets; never restore a test backup over `FairSwapProd`.
6. **Application Error Monitoring**: Additional automated alerting channels (5xx, client errors, Supabase DB/storage/realtime metrics, auth spikes) were closed as owner-accepted residual risks under #41 on 2026-09-19.
