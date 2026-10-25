# Avatar cleanup drainer

Route: `GET`/`POST /api/internal/avatar-cleanup`, invoked every 15 minutes by the **FairSwap-Backend GitHub Actions workflow** `.github/workflows/avatar-cleanup-15m.yml` (UTC minutes 7, 22, 37, 52). The workflow must be on Backend's default `main` branch to run. This replaces Vercel Cron because the FairSwap Vercel Hobby plan does not allow 15-minute cron schedules.

Drains the Backend `avatar_cleanup_queue` (replaced, removed, deleted-account and hard-deleted avatars). The avatar upload route also deletes the previous object directly, but only best-effort; this job is the retry safety net. Do not release the public avatar feature without this job scheduled.

## Authorization
- `Authorization: Bearer <secret>` where the secret equals `AVATAR_CLEANUP_SECRET` or `CRON_SECRET`, constant-time compare. A variable that is unset or shorter than 16 characters never authorizes anything (fail closed, 401).
- The service-role client is created only after authorization. The queue RPCs (`service_claim_avatar_cleanup`, `service_complete_avatar_cleanup`, `service_fail_avatar_cleanup`) are EXECUTE-granted to `service_role` only.

## Behaviour
- Bounded per run: 25 rows per batch, up to 8 batches, about 20 s (`maxDuration = 60`). Rows are leased (`FOR UPDATE SKIP LOCKED`), so overlapping runs never double-process; an interrupted run is resumed by the next one.
- Only bucket `avatars` is touched. Removing an already-missing object is success, so retries are idempotent.
- A failed delete calls `service_fail_avatar_cleanup` with the fixed code `STORAGE_REMOVE_FAILED`. Backoff is `2^attempts` minutes capped at 6 hours; after 8 attempts the row is dead-lettered (`dead_lettered_at` set) and no longer claimed. Completed rows are pruned after 30 days.
- The JSON response contains counts only (`claimed`, `deleted`, `failed`, `batches`); object paths and storage error text are never returned or logged.

## Environment variables and GitHub Actions (release-owned; currently disabled)

**Vercel project `fairswap / fairswap-web`**: set server-only `AVATAR_CLEANUP_SECRET` in Preview branch `staging` and Production, with a different strong random 32+ byte token per environment. The cleanup API also accepts `CRON_SECRET` for backward compatibility, but this scheduler does not require it.

**FairSwap-Backend repository** → Settings → Secrets and variables → Actions:

| Secret or repository variable | Purpose |
|---|---|
| Secret `AVATAR_CLEANUP_STAGING_SECRET` | Same value as staging Vercel `AVATAR_CLEANUP_SECRET` |
| Secret `AVATAR_CLEANUP_PRODUCTION_SECRET` | Same value as production Vercel `AVATAR_CLEANUP_SECRET` |
| Secret `VERCEL_STAGING_BYPASS_SECRET` | Vercel Project → Deployment Protection → Protection Bypass for Automation. Required because staging branch preview is Vercel-authenticated. |
| Variable `AVATAR_CLEANUP_STAGING_ENABLED` | `true` only after staging DB, bucket, Web and secrets deploy; otherwise unset/`false` |
| Variable `AVATAR_CLEANUP_PRODUCTION_ENABLED` | `true` only after production DB, bucket, Web and secrets deploy; otherwise unset/`false` |

Endpoints (verified Vercel project URLs): staging `https://fairswap-web-git-staging-fairswap.vercel.app/api/internal/avatar-cleanup`; production `https://fairswap.in/api/internal/avatar-cleanup`. Staging receives `x-vercel-protection-bypass` and its own bearer token; production receives its own bearer token. Both jobs fail on non-200, invalid `ok` or reported cleanup errors. Output is aggregate counts only.

GitHub's public-repository standard hosted Actions usage is free, but schedule events may be delayed/dropped under load. Immediate avatar deletion is still attempted by the Web app. Do not activate either schedule before its corresponding Web route and database migrations are deployed. GitHub Actions repo secrets/variables require separate setup by an authorized maintainer; never store tokens in `NEXT_PUBLIC_*`, source, logs, or chat.

For activation and rollback instructions, see `FairSwap-Backend/docs/operations/avatar-cleanup-scheduler.md`.

## Observability (read-only SQL, run in the SQL editor / as service role)
```sql
-- backlog and dead letters
select
  count(*) filter (where completed_at is null and dead_lettered_at is null)                         as pending,
  count(*) filter (where completed_at is null and dead_lettered_at is null and attempts > 0)        as retrying,
  count(*) filter (where dead_lettered_at is not null)                                              as dead_lettered,
  min(queued_at) filter (where completed_at is null and dead_lettered_at is null)                  as oldest_pending
from public.avatar_cleanup_queue;

-- recent dead letters (no object contents; last_error is a sanitised fixed code)
select id, attempts, last_error, dead_lettered_at
from public.avatar_cleanup_queue
where dead_lettered_at is not null
order by dead_lettered_at desc
limit 50;
```
Recommended alerts: any dead-lettered row, `oldest_pending` older than 1 hour, or repeated non-200 cron responses in Vercel logs. A dead-lettered object is a public sanitized WebP that failed to delete: investigate Storage, then re-enqueue or remove it manually.

## Generated types
`src/types/database.ts` was hand-aligned to the final Backend contract (`FairSwap-Backend/docs/contracts/profile-public-private.md`) because there was no database to generate from. After the staging migrations are applied, regenerate it from staging and reconcile any differences before production:
```bash
supabase gen types typescript --project-id <staging-project-ref> --schema public > src/types/database.ts
```
Use a read-only login; never commit tokens. Review the diff for the new RPCs (`save_my_profile_details` incl. `p_clear_full_name`, `get_my_private_details`, `public_profile_location`, `service_*_avatar*`, `service_*_avatar_cleanup`) and tables (`user_private_details`, `avatar_cleanup_queue`, `profiles.avatar_path`) rather than accepting unrelated churn.
