# Hosted V3 category evidence

The existing Wearables workflow defaults to its unchanged Wearables journey. Its
approved category modes (43 eligible ordinary-goods categories) use the protected `Test`
environment and bind the artifact to `test_activation_run_id`, the exact READY staging deployment,
the category slug and the GitHub run/attempt. Each category runs separately, after its
separately authorized Test activation. This runner never activates a category.

Use the existing `E2E_SUPABASE_URL`, `E2E_ALLOWED_EMAIL_DOMAIN`, anon/publishable
key, seller/buyer/moderator credentials and moderator TOTP secret. The seller must
have enforced identity and policy eligibility. The buyer is checked for authorization
boundaries (cannot start upload sessions). All three accounts must be distinct Test accounts.
The moderator needs active staff access and a verified TOTP factor. Private Vercel
deployments also need the existing bypass secret. No service-role key is accepted.

The Test project must contain the category's enabled canonical revision-1 contract,
PIN 560034 location data, working uploads and the actual five-check providers and
workers. No switches, provider settings or identity settings are changed here.
A clean synthetic item from the category fixture must actually auto-publish with automatic
provenance; the fraud-text image must actually reach the seller's `flagged` workflow state.
A missing provider, missing identity, different classifier result, inaccessible
location, failed cleanup, skipped test or unexpected retry prevents PASS evidence.
The incomplete-moderation control must also be observed before the held scan
completes; a run that misses that state fails rather than inventing coverage.

Cleanup uses seller-scoped reads and authorized AAL2 removal, verifies direct,
search and listing-page nonvisibility, and retains data under the existing policy.
It never deletes records or changes specialist contracts. Failed cleanup fails the
journey. The JSON report and every required step (`ownership_authorization`) plus cleanup
must pass before `v3-hosted-e2e.json` (schema `v3-hosted-e2e/2`) and its checksum are written.
Neither artifact contains account credentials or listing text.

Backend Production uses the existing `test_e2e_run_id` input, with the exact tested
`web_staging_sha` and `test_activation_run_id`. Its existing audit token must read
the Web workflow, deployment and immutable artifact. Evidence expires after seven
days and must match the current successful run attempt. No waiver is supported.
Deploy these dormant test/verifier changes to Test before Production. Reverting
them restores the previous hard block; it does not change category state.

Local checks: `node --test e2e/v3/evidence.test.mjs e2e/wearables/*.selftest.mjs`.
Hosted execution is UNVERIFIED until the protected workflow actually completes.
Do not run the hosted command as a local implementation check.
