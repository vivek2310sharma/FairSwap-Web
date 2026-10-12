# MOD-02B Verification & Implementation Note: Review-Generation Integrity, Remediations, and Bounded Acceptance

## 1. Summary of Implemented Source, Remediations, and Test Changes

The branch contains **39 migration files** in total: 36 baseline migrations (1 through 36) and three MOD-02B forward migrations.

### A. The Three MOD-02B Migrations
1. **`supabase/migrations/20261010071050_invalidate_pending_review_on_media_mutation.sql`**
   - **Core Behavior**: When ready media is mutated (reordered, cover updated, ready photo deleted, or processing marked ready) while a listing is in `pending_review`, `trg_listing_media_before_delete` and related routines increment `listings.revision`, cleanly invalidating prior review contexts.
   - Enforces a statement-level reorder trigger (`AFTER UPDATE ON public.listing_media ... REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT`) filtering for actual changes on ready media with deterministic listing ID ordering.
   - Handles cover photo clearing prior to row deletion in `public.handle_listing_media_before_delete()` to prevent `fk_listings_cover_photo` constraint violations during bulk deletions.

2. **`supabase/migrations/20261010080000_remediate_legacy_moderate_listing.sql`**
   - **Vulnerability Closed**: The unversioned legacy moderation RPC `public.moderate_listing(uuid, text, text)` previously allowed callers to bypass revision token checks (`expected_revision`, `expected_status`).
   - **Remediation**:
     - Revoked direct `EXECUTE` on `public.moderate_listing(uuid, text, text)` from `PUBLIC`, `anon`, and `authenticated`.
     - Revoked direct `EXECUTE` on internal `app_security.impl_moderate_listing(uuid, text, text)` from `PUBLIC`, `anon`, and `authenticated`.
     - Replaced `public.moderate_listing` with a fail-closed deprecation stub raising SQLSTATE `0A000` (`DEPRECATED_RPC`). All moderation now strictly flows through `public.moderate_listing_reviewed`.

3. **`supabase/migrations/20261010090000_invalidate_resubmission_review_token.sql`**
   - **Vulnerability Closed**: Previously, when a listing transitioned `pending_review -> rejected -> pending_review` without content edits, `app_security.impl_seller_submit_listing` did not increment `revision`. A moderator holding a review token from the initial review cycle could replay their decision against the newly resubmitted listing.
   - **Remediation**:
     - In `app_security.impl_seller_submit_listing(p_listing_id uuid)`, if `v_listing.status = 'rejected'`, resubmission increments `revision = v_listing.revision + 1`, generating a new review generation and invalidating prior review tokens with `PT409: MODERATION_REVIEW_CONFLICT`.
     - Resubmission clears obsolete notes with `rejection_reason = NULL`.
     - First-time submissions (`draft -> pending_review`) preserve initial revision (`revision = 1`) without duplicate increments.
     - When an edited rejected listing transitions through `draft` (where Amendment 2 increments revision once), resubmission from draft preserves the incremented revision without a redundant second bump.

### B. Regression Test Coverage
- **pgTAP Test Suite (`supabase/tests/pending_review_media_invalidation.test.sql`)**:
  - Declared TAP plan: `SELECT plan(31);` covering all 31 assertions (15 structural, 16 behavioral).
  - Test 16 asserts that an unchanged rejected listing resubmitted by the seller increments revision from 1 to 2, rejects stale review tokens with `PT409`, clears `rejection_reason`, and successfully accepts current review tokens.
  - All 97 pgTAP tests in the active suite pass cleanly.
- **RLS & Database Security Suite (`tests/security/listings-rls.test.ts`)**:
  - Expanded to 19 database integration tests (all passing).
  - Includes dedicated test `test_rejected_listing_resubmission_invalidates_prior_review_token` (unchanged resubmission advances revision and rejects old token with `PT409`).
  - Includes dedicated test `test_edited_rejected_listing_resubmission_has_no_duplicate_revision_increment` (edited rejected listing preserves single revision increment across draft resubmission cycle).
  - Includes `test_legacy_moderate_listing_rpc_revoked` (verifies `0A000: DEPRECATED_RPC`).
  - Includes `test_moderate_listing_reviewed_rejects_stale_revision` (verifies `PT409`).

---

## 2. CI Verification Scope & Multi-Session Concurrency Status

### Automated CI Pipeline Scope
GitHub Actions executes the automated regression test suite on disposable local Supabase in CI:
- **`supabase test db`**: 97 pgTAP assertions passed across 5 test files (`pending_review_media_invalidation.test.sql`, `admin_medium_operation.test.sql`, `admin_reviewed_contract.test.sql`, `schema_listings.test.sql`, `schema_security.test.sql`).
- **`vitest run tests/security/listings-rls.test.ts`**: 19 database integration tests passed.
- **`vitest run src/__tests__/moderation-text-checker.test.ts`**: 39 unit tests passed.
- **Lint & Typecheck**: `eslint .` and `tsc --noEmit` pass with zero errors.

### Dedicated Multi-Session Concurrency Harness
*Important Scope Clarification*:
The per-PR GitHub Actions pipeline validates database regression assertions, row-locking triggers, and RLS security boundaries in single/sequential test runner sessions. It does **not** execute a dedicated multi-session concurrency harness or live lock contention stress test. Ad-hoc multi-session concurrency scripts used during manual verification are not committed or run in GitHub Actions CI.

---

## 3. Concurrency & Lock Order Summary

- Seller Submit Listing: `listings` (`FOR UPDATE`) $\rightarrow$ validation & revision advancement
- Seller Delete: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Seller Reorder: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`ORDER BY id FOR UPDATE`)
- Seller Set Cover: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Processing Finalizer: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Moderator Reviewed RPC: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (read check)

---

## 4. Bounded Acceptance & Remaining Release Limitations

The PR #113 remediations resolve media-mutation invalidation, legacy moderation bypass, and review-generation collision. The following limitations remain outside the scope of PR #113 and are explicitly tracked:

1. **Storage Object Immutability & External Mutation**:
   - Direct storage bucket object modifications outside database RPCs or storage webhooks do not trigger database revision bumps.
2. **Existing-Ready Media Reprocessing**:
   - Re-recording processing results on an already ready media record without a status transition does not bump revision.
3. **Dedicated Multi-Session Concurrency & Stress Tests**:
   - Multi-session concurrency schedules and high-load stress testing are not CI-enforced and must be run in dedicated performance/soak testing environments.
4. **Database Deployment & Authentic MFA / TOTP Verification**:
   - **NOT DEPLOYED / NOT PROMOTED**: Migrations remain unapplied in production or hosted staging (`FairSwapTest`). Local CI verifies database security boundaries using synthetic AAL2 claims; genuine hardware/TOTP MFA enforcement requires hosted deployment with Supabase Auth AAL2 verification.
