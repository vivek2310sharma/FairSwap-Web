# MOD-03A-R2: Submission-Triggered Automatic Moderation Architecture & Implementation

## 1. System Overview & Product Policy
FairSwap MOD-03A implements server-authoritative, submission-triggered automatic moderation for classified listings.
The system executes non-AI pattern checks using the canonical MOD-01A 3-rule text evaluator (`prototype_v0.1.1`) upon seller submission.

### Confirmed Policy:
1. **Clean Eligible Content (`no_review_flags`)**:
   - When all mandatory checks complete with zero flags and zero errors, and all publication prerequisites are met (listing is in `pending_review`, seller account is active with accepted policies, photo readiness rules are satisfied, required core fields are valid), the system **automatically approves and transitions the listing to `active`** immediately, without requiring an Admin visit or human intervention.
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

## 2. Architecture & Components (Hardened under R2)

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
   - `trg_fn_notify_moderation_worker`: Optional `pg_net` fail-safe HTTP trigger dispatching to Edge worker upon queue insert.
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

## 3. Verification & Layer-by-Layer Test Execution Results

| Layer | Execution Method | Verdict | Details |
|---|---|---|---|
| **Source & Unit: Text Checker** | `vitest run src/__tests__/moderation-text-checker.test.ts` | **PASSED** | 39/39 tests passed (100% rule coverage: prohibited items, shortened links, payment before viewing, combinatorics). |
| **Source & Unit: Worker & Edge Handler** | `vitest run src/__tests__/moderation-worker.test.ts` | **PASSED** | 10/10 tests passed (payload schemas, outcome translation, interrupted bit.ly, business rejection propagation, missing/wrong/valid secret header checks on `handleModerationWorkerRequest`). |
| **Worker + SQL Component Integration** | `vitest run src/__tests__/moderation-integration.test.ts` (opted-in) | **PASSED** | 11/11 tests passed against clean container `mod03a_1791713159697_db`. Cases A & B execute canonical `processClaimedJob`. |
| **Decision Safety: Post-Lock Clock & Expiry** | Vitest Case F in integration suite | **PASSED** | Fresh clock check `clock_timestamp()` verified. Simulated lock-wait expiry returns `LEASE_EXPIRED` without publishing or recording approval evidence. |
| **Controlled Concurrency & PID Blocking** | Vitest Case I in integration suite | **PASSED** | Captures `modPid` and `workerPid` via `pg_backend_pid()`. Asserts `pg_blocking_pids(workerPid)` contains `modPid`, verified serialization under competing moderator update. |
| **Denial Controls (Anon & Seller)** | Vitest Case D in integration suite | **PASSED** | Both `authenticated` sellers and `anon` visitors are rejected with `permission denied` or `Staff authorization required` when invoking service RPCs or staff findings. |
| **Clean Baseline Installation** | `scratch/bootstrap_mod03a.js` | **PASSED** | Applied GoTrue (70 migrations), Storage API tenant migrations, and all 39 repository SQL migrations cleanly from zero with 0 errors. |
| **Standalone PostgREST / Deno Edge Listener** | Full HTTP Daemon Transport | **BLOCKED** | Standalone PostgREST daemon and Deno Edge Runtime daemon listeners were not provisioned in the local single-container PostgreSQL scope (preventing unapproved external package installs/downloads). Layer tested via exported HTTP handler unit contract. |
| **Workspace Typecheck** | `tsc.cmd --noEmit` | **PASSED** | Clean compilation, 0 type errors across all TypeScript files. |
| **Protected File Integrity** | SHA256 checksum comparison | **PASSED** | Both `20261010071050_invalidate_pending_review_on_media_mutation.sql` and `pending_review_media_invalidation.test.sql` match expected byte-for-byte hashes. |
