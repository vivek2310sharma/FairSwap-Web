# Avatar cleanup drainer

Route: `GET`/`POST /api/internal/avatar-cleanup`, scheduled by Vercel Cron (`vercel.json` `crons`, every 15 minutes: `*/15 * * * *`).

Drains the Backend `avatar_cleanup_queue` (replaced, removed, deleted-account and hard-deleted avatars). The avatar upload route also deletes the previous object directly, but only best-effort; this job is the retry safety net. Do not release the public avatar feature without this job scheduled.

## Authorization
- `Authorization: Bearer <secret>` where the secret equals `AVATAR_CLEANUP_SECRET` or `CRON_SECRET`, constant-time compare. A variable that is unset or shorter than 16 characters never authorizes anything (fail closed, 401).
- The service-role client is created only after authorization. The queue RPCs (`service_claim_avatar_cleanup`, `service_complete_avatar_cleanup`, `service_fail_avatar_cleanup`) are EXECUTE-granted to `service_role` only.

## Behaviour
- Bounded per run: 25 rows per batch, up to 8 batches, about 20 s (`maxDuration = 60`). Rows are leased (`FOR UPDATE SKIP LOCKED`), so overlapping runs never double-process; an interrupted run is resumed by the next one.
- Only bucket `avatars` is touched. Removing an already-missing object is success, so retries are idempotent.
- A failed delete calls `service_fail_avatar_cleanup` with the fixed code `STORAGE_REMOVE_FAILED`. Backoff is `2^attempts` minutes capped at 6 hours; after 8 attempts the row is dead-lettered (`dead_lettered_at` set) and no longer claimed. Completed rows are pruned after 30 days.
- The JSON response contains counts only (`claimed`, `deleted`, `failed`, `batches`); object paths and storage error text are never returned or logged.

## Environment variables (set by the release owner; nothing was set here)
| Name | Staging | Production | Notes |
|---|---|---|---|
| `AVATAR_CLEANUP_SECRET` | required, server-only | required, server-only | 32+ random bytes, different per environment. Never `NEXT_PUBLIC_`. |
| `CRON_SECRET` | required, same value as staging `AVATAR_CLEANUP_SECRET` | required, same value as production `AVATAR_CLEANUP_SECRET` | Vercel Cron sends it as the Bearer token. |

Vercel Cron runs only against Production deployments. For Staging, either promote the same schedule via a staging-branch production-like project, or call the route from any scheduler that can send the Bearer header (for example a scheduled GitHub Actions job using `AVATAR_CLEANUP_SECRET`). Check your Vercel plan's cron limits (Hobby allows only daily schedules; `*/15` needs Pro).

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
