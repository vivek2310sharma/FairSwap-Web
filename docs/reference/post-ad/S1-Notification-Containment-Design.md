# Issue #118 — FairSwapTest non-delivery containment

**Status:** CODE REVIEW ONLY; **NO HOSTED DEPLOYMENT, AUTH CREATION, TEST SUBMISSION OR VAULT CHANGE AUTHORIZED.**
**Target:** FairSwapTest `wpppxlnbzqynvhpeuavd`. **Never deploy** this S1 capture function to FairSwapProd `kriuhwppxgxsyyrbjsau`.

## Why the S1 test must stop today

A valid new-family submission to `pending_review` creates an email-outbox
notification addressed to at least one **existing active staff reviewer**, not
the synthetic seller. The installed `trg_email_outbox_immediate_dispatch`
and `process-email-outbox-retries` both invoke the Vault-configured email
worker. The currently deployed `process-email-outbox` uses the actual Resend
API and has no no-delivery flag. Synthetic email domains or Mailpit alone do
not intercept this. The reviewed Windows operator manifest correctly says
**BLOCKED**; it is not an approval to change Test infrastructure.

## Smallest code-scoped mitigation

A **separate** Supabase Edge Function is added at
`supabase/functions/process-email-outbox-s1-capture/` and a non-delivering
shared core at `supabase/functions/_shared/email-outbox-s1-capture.ts`.
The existing live `process-email-outbox` implementation is **unchanged**.

- It contains **no Resend client/key, SMTP, external URL transport, fetch or
  provider fallback**. Only the existing Supabase RPC claim/fail path is used.
- Requires the exact **HTTPS FairSwapTest project URL**, an explicit Issue #118
  approval marker, a run ID, nonempty worker secret, **three distinct
  explicitly approved disposable listing IDs**, and **one approved staff
  recipient ID**. All are server-only project env/secrets, never browser env.
- The UTC window expires at most **60 minutes** after activation; missing,
  wrong, expired or overlong configuration returns HTTP 503 before claiming a job.
  Expiration **does not silently revert to live delivery**.
- Accepts the existing, worker-secret-authenticated immediate webhook body
  `{record:{id}}` and retry batch `{}`. Only POST is accepted.
- Validates every claimed row against the exact listing IDs, event
  `listing_submitted_for_review`, and staff recipient **before** altering any
  of their delivery statuses. Unexpected rows fail closed (HTTP 503); the
  claim lease needs operator review. It cannot email unexpected rows.
- A recognized job is marked **`dead_letter`** via the existing
  `fail_email_outbox_job` RPC with distinct error code
  `S1_TEST_CAPTURE_NOT_DELIVERED`. It is *not* marked `sent`; it is not
  silently retried or delivered. Outbox + transition rows remain auditable.
- No SQL schema migration, RLS-policy change, listing-update change,
  feature flag, moderation toggle, or edit to Production worker is included.
- Local unit tests exercise Test/Prod identity validation, time bound, secret,
  immediate + batch paths, wrong staff/foreign listing, DB errors, and
  captured `dead_letter` metadata. CI passing is **not** proof of hosted egress
  isolation.

## One coordinated operator execution packet (MUST be approved separately)

The proposed hosted run has distinct preparatory and execution phases;
**all phases require explicit written Test-only operator authorization**.

1. **Preflight & recovery:** verify Test ref/TLS/project, 58 migration ledger,
   Issue #133 guard, moderation OFF, existing outbox/HTTP in-flight states,
   staff recipient count, exact cron/Vault worker route, and protected row hashes.
   Obtain a **fresh 58-migration PostgreSQL 17 Test backup** and successful
   isolated full restore with owners/ACLs. Inventory Storage objects, Auth hooks
   and outbound provider settings separately; DB backup alone does not restore
   those external systems.
2. **Disposable actors/draft stage:** approve exactly two genuine independently
   authenticated nonstaff Test actors, strict account provisioning without
   invitation/confirmation emails, and exactly three **new** family draft/media
   paths (Commuter Bikes, Hatchback, Apartment/Flat). The Windows proposal's
   representative category/contract IDs are candidates, not created fixtures.
   No retained staff account or existing listing can be a target. Capture the
   newly created listing IDs and independently revalidate the normal ready-photo
   submission requirements. Bind the exact IDs and current one staff recipient
   to the new function's configuration.
3. **Containment deployment:** after a separate change approval, deploy only
   `process-email-outbox-s1-capture` **to FairSwapTest**, not the regular
   worker, with verified code checksum and test project URL. Supply
   `S1_CAPTURE_APPROVAL=ISSUE-118-TEST-CAPTURE-NO-DELIVERY`,
   `S1_CAPTURE_RUN_ID`, `S1_CAPTURE_EXPIRES_AT_UTC`,
   `S1_CAPTURE_LISTING_IDS` (comma-separated three UUIDs),
   `S1_CAPTURE_STAFF_RECIPIENT_ID`, and existing worker secret.
   Capture function intentionally does not request `RESEND_API_KEY`.
4. **Route safely:** record and protect the original Test-only
   `vault.email_outbox_worker_url` secret; inspect pending HTTP requests,
   ongoing deliveries and other invocation routes. Repoint *only Test's*
   Vault endpoint to the capture function under a reviewed atomic operator
   change. Confirm the **immediate trigger and retry cron** both resolve to
   that sink, *not* the old Resend worker. Verify no in-flight old-worker
   invocation can race the switchover and old-worker direct clients/hook routes
   cannot receive test submissions. The cron may stay active **only after**
   this containment is proven. Any exception = STOP.
5. **Hostile negative-control and evidence:** run only an explicitly
   authorized, bounded Test-only negative control that proves unrelated
   recipient/listing events **cannot** reach Resend or any external mailbox,
   including Auth hooks, other notification transports, and the old worker
   endpoint. Confirm capture-only `dead_letter` status with exact error code,
   `sent_at IS NULL`, `provider_message_id IS NULL`, zero external
   provider events, and zero deliveries. Code-only tests do NOT establish this.
6. **Actual S1 owner matrix:** execute exactly one valid owner submission per
   family, with separately signed request limits, genuine owner/nonowner/anon
   credentials, unchanged retained data, and cause-specific SQLSTATE/API
   checks. Record each transition, outbox capture, review queue and listing
   revision. Do not run S2–S5 contention, reorder or retries under this S1
   budget.
7. **Recovery/cleanup:** stop the window before expiry. Verify only allowed
   synthetic outbox jobs were marked dead_letter and never sent. Under a
   separately reviewed FK/Storage cleanup plan remove only new disposable
   artifacts; verify protected hashes, active cron and moderation OFF. Do not
   reprocess S1 captured jobs. Restore Test Vault worker route **only after**
   no S1 outbox/in-flight work can be delivered; verify old sender restored
   without back-sending test messages. Never roll back by pointing queued S1
   messages back to the live worker.
8. **Results:** report true independently authenticated hosted S1 outcomes,
   exact operations/status/SQLSTATE and 0 actual recipients. Label failed
   backend/schema/policy/photo readiness as **INCONCLUSIVE**, not as owner
   denial. Preserve the full evidence. S2–S5/R1–R6 remain separate gates.

## Hard STOP boundaries

Never use Production URLs, users, service keys, email workers, providers,
Vault entries or backups. Do not change cron/trigger/worker secrets ad hoc.
Do not assume changing SMTP/Auth/Mailpit routes the Resend worker. No Production
DDL, no Test writes, and no credential export under this code-only PR.
Stop on unknown sender egress, extra staff recipient, changed enabled family,
baseline drift, missed ready-photo checks, invalid capture window or job ACL,
ambiguous COMMIT, or inability to prove cleanup. Existing Test emails outside
this narrowly planned run must remain protected from silent loss: the capture
worker refuses to classify unrelated events as delivered.
