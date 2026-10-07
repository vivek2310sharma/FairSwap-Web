# Admin Test workflow contracts — implementation evidence

Date: 2026-10-07 (Europe/Copenhagen). Source baseline c415d689124f405db56cbe8d7daecde7eeef1c29, local branch codex/admin-test-workflow-contracts. The owner approved the exact two proposals and scoped checkout in the Admin conversation ("approve for all"). This supersedes historical no-backend-change wording only for these Test changes. No Web application, other-platform client, old migration, dependency or Production file changed.

## Applied Test changes

Target: wpppxlnbzqynvhpeuavd only.
- supabase/migrations/20261007153735_admin_pending_medium_download.sql
- supabase/migrations/20261007153744_atomic_reviewed_moderation.sql

The existing cached CLI 2.117.0 generated two empty files with migration new. After MCP application assigned the actual Test migration versions, only those new filenames were reconciled to those versions, with SQL bytes preserved. No migration-history SQL was edited manually.
SQL SHA-256:
- medium policy: 00dc1b41edcb189dc3c868f1d7bcfbcc03c45379b917aecd451d7fc8e5126c2e
- reviewed RPC: 25315751b0d273cc5a00106b3b159f7e408b97f2717cdf08227d18a2634edce8

The medium policy grants authenticated download only of READY recorded medium derivatives for pending listings to active AAL2 moderator/admin with current policy acceptance. Both buckets remain private; no originals/list/sign/write/transform/public access or elevated signer was added.

The additive moderate_listing_reviewed operation validates supplied revision/status while holding FOR UPDATE on the listing and delegates to the existing moderation implementation in the same transaction. Authorization, self-review, media eligibility, transitions/audit/notification behavior remains backend-owned. Old moderation API/signature remains unchanged. This protects only callers of the new operation and only changes reflected in revision/status.

## Actual verification

MCP apply_migration returned success for both changes. Read-only postflight confirmed the exact policy, signatures, fixed search paths, private guarded definer/public invoker, authenticated execution and anonymous denial. Existing function-definition fingerprints remained equal for moderate_listing, impl_moderate_listing, is_active_staff_aal2, log_audit_event, handle_listing_before_update and handle_listing_status_transition. PostgreSQL default privileges retain service_role EXECUTE on the new public invoker; this is not a privileged Admin client or a substitute for the function's verified staff checks.

A rollback-only diagnostic ran actual database grant checks and invocation under SET LOCAL ROLE anon / authenticated with an empty request JWT. Anonymous invocation and missing-identity invocation denied with insufficient_privilege; missing-identity SELECT exposed no objects in either listing bucket. Result: METADATA_AND_MISSING_IDENTITY_DENIAL_CHECKS_PASS. These are real limited database observations, not a real staff-session acceptance test. They changed no application records.

supabase/tests/admin_reviewed_contract.test.sql adds 10 pgTAP checks in the existing backend format. Its full runner is NOT RUN: pgTAP is absent on Test and no approved disposable local database is available. No extension installation or account-creating existing security suite was run. Real positive staff mutations, stale/concurrent two-session decisions, required audit/history/notifications and photo delivery remain to be observed with approved fixtures/user browser. The Admin's mocked RPC tests cannot establish PostgreSQL concurrency.

Read-only layout inspection found 11 ready media rows with matching medium objects, eight on pending listings, three on active listings; both buckets private. No image bytes, originals or credential files were read by the backend connector.

Security advisors returned existing-function/default-permission, pg_net schema and password-protection warnings; no new reviewed RPC finding appeared. No baseline advisor report was taken, so warnings are not claimed newly introduced or resolved. Remediation references:
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Rollback and remaining gate

First stop/revert Admin's new RPC mapping if needed; drop only public.moderate_listing_reviewed(uuid,text,text,integer,public.listing_status_enum), then app_security.impl_moderate_listing_reviewed with that signature. Drop only admin_pending_medium_download on storage.objects to revoke derivative access. Do not alter old functions, erase evidence, remove buckets or delete data. No rollback was executed.

Exact disposable action targets, actor roles and notification recipients are not supplied. General approval is not an invented fixture identity. No listing/account/staff/report/support/privacy/category/location mutation has been performed. No push, merge or Production operation.