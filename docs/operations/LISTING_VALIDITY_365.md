# Listing validity: 365 days

Local candidate, 11 November 2026. Backend owns expiry assignment; Web never
computes a production expiry. Seller copy and renewal confirmation now explain
365 days from publication and the existing three-renewal limit. Seed/security
fixtures use 365 days. Account/policy/maintenance/ownership gates are unchanged.

Canonical migration and isolated PostgreSQL tests live in FairSwap-Backend:
`supabase/forward-migrations/listing-validity-365/` and
`scripts/ci/test-listing-validity-365.mjs`. No Web migration, generated type,
environment-variable, dependency, mirrored worker or Actions change is needed.
Approval notification wording changes centrally in Backend; clients display the
stored notification body. Historical notifications and unrelated 30-day privacy,
retention and device-location durations remain unchanged.

ChatGPT release order: apply the isolated Backend candidate to FairSwapTest,
deploy focused Web staging changes with existing checks, verify automatically,
then selectively release Backend and Web Production automatically. Preserve
target-specific migration history and Test-only code boundaries. Other clients
follow their existing staging/preview and Production channels; unresolved native
release and HelpCenter staging mappings must be resolved in the release handoff.

Rollback uses a new Backend forward fix, preserving already granted expiry dates,
plus a coordinated Web revert. Review automatic Production receipts and monitor
expiry/moderation failures after deployment. No owner predeployment manual test.
