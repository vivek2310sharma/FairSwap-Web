# MOD-02E Verification & Implementation Note: Candidate Integration, Bounded Acceptance, and Remaining Release Limitations

## 1. Summary of Implemented Source and Test Changes

### A. Forward Migration (`supabase/migrations/20261010071050_invalidate_pending_review_on_media_mutation.sql`)
- **Status: UPDATED WITH VERIFIED MOD-02D/E1 CANDIDATE** (SHA-256: `e1a8352f109e7306e6de4d8b103644982230935fc71acd054c1c8fd10d30c710`, 23,092 bytes).
- **Core Correction**: In `public.handle_listing_media_before_delete()`, whenever a ready media row is deleted, the trigger clears `cover_photo_id = NULL` on the parent listing (`WHERE id = OLD.listing_id AND cover_photo_id = OLD.id`) while the row still exists. This prevents `fk_listings_cover_photo` foreign key constraint violations during multi-row / bulk deletion where a cover photo is deleted alongside other media.
- Maintains the statement-level reorder trigger (`AFTER UPDATE ON public.listing_media ... REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table FOR EACH STATEMENT`), filtering for actual changes on ready media with deterministic listing ID ordering.
- Maintains single structural deletion invalidation ownership via `trg_listing_media_before_delete` on `public.listing_media` (`BEFORE DELETE FOR EACH ROW`), without session configuration flags or caller bypass protocols.
- Maintains normalized parent-first locking in `impl_record_media_processing_result`.

### B. Regression Test Harness (`supabase/tests/pending_review_media_invalidation.test.sql`)
- **Status: FROZEN AND UNCHANGED** (SHA-256: `033019e471e988dd667ba41ec5d5fa97ea5f0b72cbd3d865c2f085ced87f4ee5`, 53,208 bytes).
- Declared TAP plan: `SELECT plan(30);` covering all 30 assertions (15 structural, 15 behavioral).
- Tests cover-inclusive bulk deletion in Test 15 without foreign key errors.

---

## 2. Test Execution & Validation Status (MOD-02D & MOD-02D-E1)

Disposable local PostgreSQL validation was performed and established:
1. **Clean One-Shot Baseline Application**:
   - Pinned candidate migration applied cleanly in 210 ms on a freshly bootstrapped PostgreSQL 15.8 instance with all 36 baseline migrations, genuine GoTrue auth migrations (70), and genuine storage API migrations without manual trigger drops or retries.
2. **Acceptance Suite Execution**:
   - `pg_prove:3.36` executed `pending_review_media_invalidation.test.sql` against the candidate; all 30 tests passed (`ok 1` through `ok 30`, exit status 0).
   - A separate TAP failure control (`is(1, 2)`) confirmed test runner failure sensitivity (`exit status 1`).
3. **Multi-Session Concurrency Schedules (All 9 Verified)**:
   - Verified via `scripts/run_concurrency_e1.js` with `pg_locks` wait event observation (`transactionid` and `tuple`) and failure exit propagation:
     - **Scenario A**: Media mutation first $\rightarrow$ stale moderator decision rejected with `PT409`.
     - **Scenario B**: Approval first $\rightarrow$ material media deletion returns to `pending_review` with +1 revision.
     - **Scenario C1**: Finalizer holds parent $\rightarrow$ seller delete blocks, then deletes media after release.
     - **Scenario C2**: Seller delete holds parent $\rightarrow$ finalizer on deleted row blocks, then returns `media record not found`.
     - **Scenario C3**: Finalizer holds parent $\rightarrow$ seller reorder blocks, then persists reordered membership.
     - **Scenario C4**: Seller reorder holds parent $\rightarrow$ finalizer on already-ready photo contends on parent lock, re-verifying dimensions idempotently.
     - **Scenario D**: Two eligible moderators hold same review context $\rightarrow$ exactly one commits, competitor rejected with `PT409`.
     - **Scenario E**: Cover-inclusive bulk delete vs moderator decision $\rightarrow$ moderator rejected with `PT409`, cover cleared to NULL, revision reaches 3.
     - **Scenario Privileged Direct-Write vs Seller**: Service-role direct row update vs seller delete RPC demonstrates serialization on row/parent locks.
4. **Supplemental Coverage**:
   - Verified bulk delete with cover as last inserted row, zero-row delete no-op, unready vs ready row delete revision rules, direct active cover deletion transitioning to `pending_review`, cascading parent deletion, draft revision stability, and audit log rollback containment.

---

## 3. Concurrency & Lock Order Summary

- Seller Delete: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Seller Reorder: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`ORDER BY id FOR UPDATE`)
- Seller Set Cover: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Processing Finalizer: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (`FOR UPDATE`)
- Moderator Reviewed RPC: `listings` (`FOR UPDATE`) $\rightarrow$ `listing_media` (read check)

*Note*: Direct privileged writes from service-role execute at table level and trigger re-review via statement/row triggers, but do not acquire parent locks prior to their own statements.

---

## 4. Bounded Acceptance & Remaining Release Limitations

The candidate migration resolves the review-context invalidation defect and foreign key constraint collisions during bulk deletion. However, the following limitations remain outside the scope of this migration and must be addressed prior to wider production release:

1. **Unversioned Legacy Moderation RPC (`public.moderate_listing`)**:
   - `public.moderate_listing` remains callable by authenticated staff and does not validate `expected_revision`. Callers must migrate strictly to `public.moderate_listing_reviewed`.
2. **Rejection and Resubmission Token Collisions**:
   - When a listing transitions `pending_review` $\rightarrow$ `rejected` $\rightarrow$ (resubmission) $\rightarrow$ `pending_review`, `impl_seller_submit_listing` does not increment `revision` if the seller resubmits without changing text fields.
3. **Existing-Ready Media Reprocessing**:
   - Re-recording processing results on an already ready media record without a status transition does not bump revision.
4. **Storage Object Immutability & External Mutation**:
   - Direct storage bucket object modifications outside database RPCs or storage webhooks do not trigger database revision bumps.
5. **Database Deployment Status**:
   - **NOT DEPLOYED / NOT PROMOTED**: The migration remains unreleased and unapplied in production or hosted staging (`FairSwapTest`). Application integration and database deployment remain subject to separate authorization.
