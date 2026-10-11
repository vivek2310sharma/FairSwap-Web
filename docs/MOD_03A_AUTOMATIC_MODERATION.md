# MOD-03A-R2: Submission-Triggered Automatic Moderation Architecture & Implementation

## 1. System Overview & Product Policy
FairSwap MOD-03A implements server-authoritative, submission-triggered automatic moderation for classified listings.
The system executes a limited heuristic text evaluator (`prototype_v0.1.1`) upon seller submission.

### Verified Heuristic Scope (MOD-01A Text Checker):
The current text checker evaluates exactly three rules:
1. **`rule_prohibited_item_wording`**: Detects specific restricted keywords and prohibited goods/services.
2. **`rule_shortened_link`**: Identifies known URL shorteners (e.g. bit.ly, tinyurl) in titles and descriptions.
3. **`rule_payment_before_viewing`**: Flags explicit phrasing soliciting advance payments prior to item viewing.

> [!IMPORTANT]
> **Limitations & Out-of-Scope Capabilities**:
> - The checker is a **limited prototype**, not comprehensive fraud or scam detection.
> - Arbitrary contact-information extraction and price anomaly heuristics are **not implemented** in this ruleset.
> - **Image-content moderation is completely unimplemented** (no vision models, OCR, or NSFW image scanning).
> - Therefore, `moderation_automation_enabled` **defaults to `false`** and must remain disabled across all hosted environments.

### Confirmed Policy:
1. **Clean Eligible Content (`no_review_flags`)**:
   - If `moderation_automation_enabled` is explicitly `true` in system settings AND all mandatory checks complete with zero flags and zero errors, and all publication prerequisites are met (listing in `pending_review`, seller account active with current policies accepted, photo readiness rules satisfied, core fields valid), the system transitions the listing to `active`.
   - If `moderation_automation_enabled` is `false` (the default setting), clean listings **remain unpublished (`pending_review`)** and are routed to manual admin review (`decision: 'routed_to_admin'`).
2. **Flagged Content (`needs_review`)**:
   - When one or more flags are detected, the listing **remains unpublished** (`pending_review`).
   - The findings are recorded in `listing_moderation_results` and securely surfaced to human staff via the authenticated AAL2 `app_security.get_listing_moderation_findings` contract.
3. **Incomplete or Failed Checks (`checks_incomplete`)**:
   - The listing **remains unpublished** (`pending_review`).
   - The request is retried with exponential backoff up to 3 times (`attempt_count < 3`).
   - If retries are exhausted or lease abandoned, the request escalates to human staff for manual investigation with explicit `LEASE_EXPIRED_ABANDONED` evidence.
4. **Invalid Input (`invalid_input`)**:
   - The listing **remains unpublished** and is transitioned to `rejected` with an actionable correction reason (`rejection_reason`) so the seller has a clear path to edit and resubmit.
5. **Stale, Superseded, Expired, or Forged Evidence**:
   - If the listing content, title, description, or media changes (revision bump) while a worker holds a lease, or if an invalid/expired lease token is presented, finalization rejects the attempt (`decision: 'superseded'`, `'lease_expired'`, or `'lease_token_mismatch'`) and **never authorizes publication**.

---

## 2. Architecture & Components

### 2.1 Database Layer (PostgreSQL / Supabase Migrations)
1. **Queue & Evidence Storage** (`20261011000038_create_moderation_queue_and_results.sql`):
   - `public.listing_moderation_requests`: Stores durable review requests per listing generation. Statuses: `pending`, `claimed`, `completed`, `failed`, `superseded`.
   - `public.listing_moderation_results`: Append-only immutable log of completed evaluation runs with structured flags, errors, and outcome verdicts. Privileged direct `UPDATE` and `DELETE` are revoked from `service_role`.
   - `handle_listing_moderation_enqueue()` Trigger: Attached to `public.listings`. Fires when a listing status transitions to `pending_review` or when a pending listing's `revision` increments. Automatically supersedes prior active requests and enqueues a fresh generation request.
   - `app_security.claim_moderation_batch(p_batch_size, p_lease_seconds, p_request_id)`: Implements concurrency-safe queue processing using `FOR UPDATE OF r SKIP LOCKED`. Recovers expired leases bounded by `max_attempts`. When `attempt_count >= max_attempts`, sets status to `failed` and inserts explicit `LEASE_EXPIRED_ABANDONED` escalation evidence. Issues UUID claim tokens and sets lease expiration timestamps.
   - `app_security.impl_finalize_moderation_result(...)`: The core atomic publication gate. Normalizes lock ordering (Parent Listing locked *first*, Request locked *second*) to eliminate lock inversion deadlocks.
     - **Post-Lock Clock Freshness**: Obtains a fresh `v_now := pg_catalog.clock_timestamp()` *after* acquiring all required row locks immediately before validating lease expiry, closing the lease-expiry-during-lock-wait vulnerability.
     - **Post-Lock Killswitch Re-read**: Re-reads `moderation_automation_enabled` setting under lock.
     - **Material Edit / Field Completeness Check**: Revalidates presence of essential listing fields (`category_id`, `city_id`), routing incomplete listings to admin.
     - **Differentiated Photo Readiness**: Differentiates processing media from permanently failed media (`processing_status = 'failed'`). In normal processing waits, preserves the evaluator retry budget (`attempt_count = GREATEST(0, attempt_count - 1)`).
   - Public Schema Wrappers: Exposes narrow `SECURITY INVOKER` wrappers delegating to `app_security` routines for Supabase Client / Data API access:
     - `public.claim_moderation_batch` (granted strictly to `service_role`).
     - `public.impl_finalize_moderation_result` (granted strictly to `service_role`).
     - `public.get_listing_moderation_findings` (staff only, requiring active staff role and AAL2).
     - `public.get_seller_moderation_workflow_status` (seller ownership check; binds automatic provenance strictly to active listing's current revision).

2. **Dispatch & Recovery** (`20261011000039_moderation_dispatch_and_killswitch.sql`):
   - `public.app_system_settings`: System settings table including `moderation_automation_enabled` (boolean, defaults to `false` for fail-safe initialization).
   - `trg_fn_notify_moderation_worker`: Optional `pg_net` fail-safe HTTP trigger dispatching to Edge worker upon queue insert when vault secrets are configured.
   - `invoke_moderation_retry_batch`: Scheduled / on-demand RPC to reclaim abandoned leases bounded by `max_attempts`. Generates `LEASE_EXPIRED_ABANDONED` evidence and applies exponential backoff on retry.
   - Scheduled Recovery Job: Registered `pg_cron` schedule `process-moderation-queue-retries` running every 2 minutes.

### 2.2 Server Worker & Edge Function
- **Shared Worker Core** (`supabase/functions/_shared/listing-moderation-worker.ts`):
   - Strict Zod schemas validating configuration, invocation payloads, claimed database jobs, and database finalization responses.
   - Claims jobs via `claim_moderation_batch`.
   - Executes canonical `evaluateListingText` from `@/lib/moderation/checker`.
   - Propagates business rejections (`data.success === false`) as failures rather than falsely reporting success.
- **Edge Function Endpoint** (`supabase/functions/process-listing-moderation/index.ts`):
   - Validates `x-moderation-worker-secret` header against configured environment secret.
   - Exports `handleModerationWorkerRequest` for standard Web `Request`/`Response` integration testing.
   - Per-function gateway setting configured in `supabase/config.toml` (`verify_jwt = false`) to support secret header authentication without bearer tokens.

### 2.3 Web Application Feedback
- **Submission Action** (`src/app/account/listings/actions.ts`):
   - Uses authoritative `seller_submit_listing` RPC.
- **Live Status Feedback** (`src/app/account/listings/ModerationStatusBadge.tsx`):
   - Queries `get_seller_moderation_workflow_status`.
   - Bounded polling: enforces `pollCount >= maxPolls` even when RPC returns errors; prevents overlapping in-flight requests.
   - Explicit provenance handling: shows `Auto-Approved` only when proven by current revision's automatic evaluation result; otherwise displays `Live`. Displays `Status Unavailable` on RPC errors.

---

## 3. Verification Scope & Transport Categorization

To maintain strict auditability, test execution is differentiated into distinct verification layers:

| Layer | Execution Scope | Enforcement Status | Notes |
|---|---|---|---|
| **Text Checker Unit Tests** | `src/__tests__/moderation-text-checker.test.ts` | **CI Enforced** | 39 unit tests passing in Job 1. Verifies 3-rule regex heuristics and edge cases. |
| **Worker Unit Tests** | `src/__tests__/moderation-worker.test.ts` | **CI Enforced** | 10 unit tests passing in Job 1. Validates Zod schemas, claim shapes, and HTTP header auth. |
| **Target Guard Unit Tests** | `src/__tests__/moderation-target-guard.test.ts` | **CI Enforced** | 7 unit tests passing in Job 1. Verifies loopback restrictions, hosted URL rejection, and run-identity validation. |
| **Worker + SQL Component Integration** | `src/__tests__/moderation-integration.test.ts` (Cases A–J) | **CI Enforced** | 10 scenarios passing in Job 2 against disposable PostgreSQL. Validates row-locking triggers, lease expiration, and concurrency. |
| **Real PostgREST HTTP Smoke Test** | `src/__tests__/moderation-integration.test.ts` (Case K) | **CI Enforced** | Real HTTP transport via `@supabase/supabase-js` against local PostgREST daemon. Validates `service_role` 200 OK and `anon` 401 Unauthorized / 42501 permission denied. Pre-flight URL validator strictly blocks non-loopback calls. |
| **Database Migrations & pgTAP** | `supabase/tests/*.test.sql` | **CI Enforced** | 97 pgTAP assertions passing across 5 test suites on disposable Supabase. |
| **RLS Security Suite** | `tests/security/listings-rls.test.ts` | **CI Enforced** | 19 security assertions passing on disposable Supabase. |
| **Deno Edge Runtime Daemon Serving** | Live `supabase functions serve` | **NOT EXECUTED** | Deno runtime daemon is not spun up in CI. Edge handler logic is verified via Web standard `Request`/`Response` unit contracts. |
| **Hosted Migration & Automatic Activation** | Production / Staging Supabase | **NOT EXECUTED** | Migrations remain unapplied to hosted environments. `moderation_automation_enabled` remains `false`. |
| **Authentic Hardware/TOTP MFA** | WebAuthn / TOTP Auth | **NOT EXECUTED** | Local CI uses synthetic AAL2 claims. Live MFA enforcement requires hosted deployment. |
