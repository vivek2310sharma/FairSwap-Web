# MOD-02B Verification & Implementation Note: Review-Generation Integrity, Remediations, and Bounded Acceptance

## 1. Summary of Implemented Source, Remediations, and Test Changes

### A. Core Invalidation Migration (`supabase/migrations/20261010071050_invalidate_pending_review_on_media_mutation.sql`)
- **Status: VERIFIED & APPLIED IN PR #113**
- **Core Behavior**: When ready media is mutated (reordered, cover updated, ready photo deleted, or processing marked ready) while a listing is in `pending_review`, `trg_listing_media_before_delete` and related routines increment `listings.revision`, cleanly invalidating prior review contexts.
- Maintains statement-level reorder trigger (`AFTER UPDATE ON public.listing_media ... REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT`) filtering for actual changes on ready media with deterministic listing ID ordering.
- Handles cover photo clearing prior to row deletion in `public.handle_listing_media_before_delete()` to prevent FK constraint violations during bulk deletions.

### B. Legacy RPC Deprecation Migration (`supabase/migrations/20261010080000_remediate_legacy_moderate_listing.sql`)
- **Status: RESOLVED & VERIFIED IN PR #113**
- **Vulnerability Closed**: The unversioned legacy moderation RPC `public.moderate_listing(uuid, text, text)` previously allowed callers to bypass revision token checks (`expected_revision`, `expected_status`).
- **Remediation**:
  1. Revoked direct `EXECUTE` on `public.moderate_listing(uuid, text, text)` from `PUBLIC`, `anon`, and `authenticated`.
  2. Revoked direct `EXECUTE` on internal `app_security.impl_moderate_listing(uuid, text, text)` from `PUBLIC`, `anon`, and `authenticated`.
  3. Replaced `public.moderate_listing` with a fail-closed deprecation stub raising SQLSTATE `0A000` (`DEPRECATED_RPC`). All moderation now strictly flows through `public.moderate_listing_reviewed`.

### C. Review-Generation Integrity Migration (`supabase/migrations/20261010090000_invalidate_resubmission_review_token.sql`)
- **Status: RESOLVED & VERIFIED IN PR #113**
- **Vulnerability Closed**: Previously, when a listing transitioned `pending_review -> rejected -> pending_review` without content edits, `app_security.impl_seller_submit_listing` did not increment `revision`. A moderator holding a review token from the initial review cycle could replay their decision against the resubmitted listing.
- **Remediation**:
  1. Updated `app_security.impl_seller_submit_listing(p_listing_id uuid)` to evaluate `v_listing.status`.
  2. If `v_listing.status = 'rejected'`, resubmission increments `revision = v_listing.revision + 1`, generating a new review generation and invalidating prior review tokens with `PT409: MODERATION_REVIEW_CONFLICT`.
  3. Resubmission resets `rejection_reason = NULL`, clearing obsolete moderation notes.
  4. First-time submissions (`draft -> pending_review`) preserve initial revision (`revision = 1`) without duplicate increments.
  5. If an edited rejected listing transitions through `draft` (where Amendment 2 increments revision once), resubmission does not introduce a duplicate second increment.

### D. Regression Test Coverage
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

## 2. Test Execution & Multi-Session Concurrency Status

Disposable local PostgreSQL validation established:
1. **Clean One-Shot Migration Application**:
   - All 38 migrations (baseline 1-36, plus PR #113 migrations `20261010071050`, `20261010080000`, and `20261010090000`) apply cleanly in order without manual intervention.
2. **Acceptance Suite Execution**:
   - `supabase test db`: 97 pgTAP assertions passed across 5 test suites.
   - Vitest RLS security tests: 19 integration tests passed.
   - Moderation unit tests: 39 unit tests passed.
   - Lint and typecheck: clean (`eslint` passed, `tsc --noEmit` passed).
3. **Multi-Session Concurrency Schedules (All Verified)**:
   - Media mutation first $\rightarrow$ stale moderator decision rejected with `PT409`.
   - Approval first $\rightarrow$ material media deletion returns to `pending_review` with +1 revision.
   - Resubmission vs Stale Moderator $\rightarrow$ seller resubmission commits first with bumped revision; stale moderator decision fails with `PT409`.
   - Competing Moderator decisions $\rightarrow$ first moderator commits; competitor rejected with `PT409`.
   - Bulk deletion vs Moderator decision $\rightarrow$ moderator rejected with `PT409`.

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

The PR #113 remediations resolve media-mutation invalidation, legacy moderation bypass, and review-generation collision. The following limitations remain outside the scope of PR #113 and are tracked for subsequent milestones:

1. **Storage Object Immutability & External Mutation**:
   - Direct storage bucket object mutations outside database RPCs or storage webhooks do not trigger database revision bumps.
2. **Existing-Ready Media Reprocessing**:
   - Re-recording processing results on an already ready media record without a status transition does not bump revision.
3. **Tests Not Executed in Automated PR CI**:
   - High-load multi-worker stress benchmarks beyond deterministic concurrency schedules are run in dedicated nightly performance pipelines, not per-PR CI.
4. **Database Deployment & Authentic MFA Verification**:
   - **NOT DEPLOYED / NOT PROMOTED**: Migrations remain unapplied in production or hosted staging (`FairSwapTest`). Real hardware/TOTP MFA enforcement requires hosted deployment with Supabase Auth AAL2 verification.
