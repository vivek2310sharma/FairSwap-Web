# Ratings V1 operations delta — 28 October 2026

The authenticated `/api/internal/ratings-monitor` endpoint sends fixed aggregate
alert codes through the existing `OPERATIONS_ALERT_WEBHOOK_URL`. Product flags
remain OFF. It requires `CRON_SECRET` (at least 32 random characters),
`RATINGS_OPERATIONS_ENVIRONMENT=FairSwapTest|FairSwapProd`, the corresponding existing
`NEXT_PUBLIC_SUPABASE_URL`, and the environment's existing server-only Supabase key.
Test is `wpppxlnbzqynvhpeuavd`; Prod is `kriuhwppxgxsyyrbjsau`.

Backend dependency: apply only additive migration
`20261028104504_ratings_operations_v1.sql` after the six Ratings migrations. The
endpoint claims durable two-minute leases and acknowledges only delivered alerts.
Retries may duplicate an alert after a delivery/ack crash; persistent incidents
repeat hourly and cleared incidents reset. There is no notification/test dispatch
or feature activation in this endpoint. Missing configuration and delivery failure
return generic HTTP 503; consumer callers cannot inspect alert codes.

Provision a trusted external five-minute scheduler in both environments, retaining
deployment protection. Backend's `tests/ratings/monitor-scheduler.mjs` is the ready
runner: it fixes the two URLs, checks heartbeat responses, rejects redirects and
returns failure to the scheduler. Configure the scheduler to notify Vivek Kumar on
nonzero exit/non-2xx or no successful heartbeat for ten minutes. No scheduled input
contains secrets; inject the environment's `CRON_SECRET` securely and, when required,
its `VERCEL_AUTOMATION_BYPASS_SECRET` protection header.

For a verified Pro/Enterprise deployment, merge the optional
[Vercel cron fragment](ratings-monitor.vercel-cron.json) into `vercel.json` for primary
production invocations. Keep independent heartbeat supervision. Vercel cron does not
run in branch previews, and a five-minute expression blocks Hobby deployment. The
checked-in deployment configuration is unchanged. Hosted scheduler provisioning is
release work and was not performed by the coding agent.

Responsible operator: Vivek Kumar. The canonical detailed recovery, fixture isolation,
Test-before-Prod deployment, rollback and owner production checks are in Backend's
`docs/operations/RATINGS_V1_OPERATIONS.md`. Keep Web's
`FAIRSWAP_RATINGS_V1_ENABLED=false` and `FAIRSWAP_RATINGS_PUBLIC_SCORE_ENABLED=false`,
all private backend gates false and existing Admin Ratings flags false. No owner
staging test is a gate. Owner real Auth/MFA acceptance follows production deployment.
All four English/Hindi HelpCenter articles remain drafts with no review date.

Rollback product flags and the two Ratings cron jobs using Backend's existing
rollback procedure; revert Web source through ChatGPT's release process. Retain the
additive schema and evidence; repair SQL forward. No new Edge deployment is needed.
