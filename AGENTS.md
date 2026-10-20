<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# FairSwap-Web agent instructions

FairSwap.in is an India-first, trust-first peer-to-peer classifieds web app. Buyers and sellers arrange payment and exchange themselves; there is no checkout, escrow, payout or delivery. Wider public launch is **not** certified; Production is a controlled pilot.

Last reviewed: 20 October 2026 against the repository at HEAD. Documentation never proves live hosted state: report hosted facts as owner-confirmed or NOT RUN unless you verified them.

## Read first

1. `README.md`, `docs/CURRENT_STATE.md`, `CONTRIBUTING.md`, `docs/README.md`, `.agents/rules/fairswap.md` (order from `START_HERE.md`), then `docs/WORKFLOW.md`.
2. `docs/operations/BACKEND_SOURCE_HANDOFF.md` before touching `supabase/`, CI, or anything database-related.
3. Follow the latest explicit human instruction. A plan, a dated document, or passing checks never authorize the next step. Approval for a scoped task covers only that scope.

Historical or superseded — do **not** follow as instructions: `FAIRSWAP_SPEC.md` (archived v4.0), `CHANGELOG.md` below its current entries, `PACK_VALIDATION.md`, `MANIFEST.sha256`, `prompts/*`, `docs/BOOTSTRAP.md`, `docs/UPGRADING.md`, `docs/FOUNDATION.md`, `docs/milestones/*`, `docs/plans/*`, `docs/PROGRESS.md`, retired "Phase 1/2" and "1.1–1.6" gates, and the historical command sections of `docs/operations/deployment-guide.md` and `auth-email-templates.md`. Do not rewrite historical records; add a dated correction instead.

## Environments and branches

| Branch | Environment | URL | Supabase project |
|---|---|---|---|
| `main` | Production (controlled pilot) | https://fairswap.in | FairSwapProd `kriuhwppxgxsyyrbjsau` |
| `staging` | Test | https://fair-swap-git-staging-fairswap.vercel.app | FairSwapTest `wpppxlnbzqynvhpeuavd` |

- `main` and `staging` are the only permanent branches and intentionally diverge. `staging` carries Test-only code (for example S1 email capture) that must never reach `main`. Never merge `staging` wholesale into `main`, and never merge Test-only code to "equalize" the branches.
- Feature work: branch from up-to-date `staging` (`git pull --ff-only`), prefix `feat/ fix/ security/ docs/ test/ chore/`, open one focused PR into `staging`. Use a worktree for concurrent agents.
- Production release: a focused PR to `main` containing only approved changes. After a `main` hotfix, reconcile it back into `staging`.
- Never force-push or force-reset a shared branch. Never push to `main` unless the owner explicitly tells you to for that change.
- GitHub reported `protected: false` for both branches on 14 Oct 2026, so CI is **not** a provably enforced merge gate. Do not claim it is; re-check before relying on it.
- Merging code does not apply migrations, Edge Functions, Auth templates, secrets or DNS. Hosted config can drift from the repo.
- Every PR states: what, why, linked issue, excluded scope, security impact, evidence (commands and outcomes), rollback, deploy dependencies. Do not close an issue before environment-specific verification.

## Hosted-Supabase freeze (owner-approved 18 Oct 2026)

Backend hosted release authority has **not** been granted to anyone. Therefore:

- Do not run `supabase db push`, `db reset`, `config push`, `link`, `db query --linked`, Edge deploys, or hosted Auth `apply`/`rollback`. `pnpm supabase …` passes straight through to the CLI and nothing blocks these; Production is `kriuhwppxgxsyyrbjsau`. Never push the raw 58-file migration set anywhere: Production has 52 applied versions, Test has 61.
- `tools/sync-supabase-auth-emails.mjs` and `tools/sync-supabase-recovery-email.mjs` reject `apply` and `rollback` before any network call; only read-only `audit --env test|prod` works. Their regression test is not run in CI.
- Do not revoke normal Web runtime keys. Do not request or print old token values. All four former personal CLI tokens are only declared unused; revocation is owner-attested, not independently verified.
- Never run SQL writes, DB resets, bulk notification tests or privileged user/admin mutations against a hosted project without separate explicit approval. Only run destructive local tests when the target is positively proven local and disposable.
- Older instructions in `docs/operations/deployment-guide.md`, `docs/operations/auth-email-templates.md`, README and `.agents/rules/fairswap.md` that describe `db push`/apply flows are frozen by the above.

## Repository boundaries

- **This repo (Web)** owns: Next.js app, Server Actions and API routes, Auth session integration, media HTTP routes, Vercel deployment, Auth email template sources/config, and the generated `src/types/database.ts` consumed artifact.
- **FairSwap-Backend** (private) is the canonical source for all shared SQL: the 58 migrations, 10 pgTAP files, `supabase/config.toml`, Auth templates, both Edge workers and the moderation modules. Web CI materializes them from a pinned commit (`2f26f839c3fa0ae690cf5c3795a983d62e1b6c47`) via `scripts/ci/materialize-backend.mjs`.
  - `supabase/migrations/*.sql`, `supabase/tests/*.sql` and `.fairswap-backend-ci-source/` are gitignored on purpose. Do not commit them or restore duplicate SQL to Web. A fresh checkout has no migrations, so local `supabase test db` needs materialization first.
  - 13 mirrored files (2 Edge `index.ts`, 2 `deno.json`, 3 templates, 2 `_shared` workers, 4 `src/lib/moderation/*`) and `supabase/config.toml` are byte-pinned to Backend. Do not edit them here; change Backend, then update the pins. Updating the Backend pin means changing the script, the three `ref:` lines in `.github/workflows/ci.yml`, and `tools/backend-mirror-guard.test.mjs`.
  - Do not edit or delete `supabase/functions/process-email-outbox-s1-capture` (Test-only).
- **FairSwap-Admin** is the staff console (admin.fairswap.in). `/admin` in this repo is retired: `src/proxy.ts` returns 404 for it, and there is no staff UI or `/auth/mfa` here. Docs that still describe in-app `/admin` are historical.
- **FairSwap-HelpCenter** serves `help.fairswap.in`; `/help` here redirects to it (307).
- **FairSwap-Android / FairSwap-iOS** are separate native clients. They depend on Web's media routes under `/api/listings/[id]/media` (Bearer auth) and on Backend RPCs. Do not change media route URLs, response shapes, error codes or auth behavior without checking those clients; there are no cross-repo contract tests.

## Commands

Use `corepack pnpm …`. pnpm 10.12.1; CI uses Node 20.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint              # eslint .
corepack pnpm typecheck         # tsc --noEmit
corepack pnpm docs:check        # tools/check-docs.mjs: local links in all tracked .md files
corepack pnpm test:unit         # vitest run (src/__tests__ and tests/**, jsdom)
corepack pnpm vitest run path/to/file.test.ts -t "name"   # single test
corepack pnpm build && corepack pnpm test:e2e             # Playwright runs `next start -p 3001`; build first
```

- DB-backed tests (`tests/security/listings-rls`, `seller-media-db-lifecycle`, `post-ad-compatibility-disposable-db`, moderation integration) need a local Supabase on 127.0.0.1:54321 plus materialized Backend SQL. `moderation-integration` also needs `MOD03A_RUN_LOCAL_DB_TESTS=true` and the other `MOD03A_*` variables.
- E2E that mutate data (`e2e/auth`, `communication`, `listings`) need `ALLOW_LOCAL_TEST_MUTATIONS=true`; use `node tests/helpers/run-local-e2e.js e2e/<spec>`. The guard allows loopback only.
- CI (`.github/workflows/ci.yml`) runs: docs:check, lint, typecheck, a **selected** set of Vitest files (not the full `test:unit`), pgTAP and `listings-rls` against local Supabase, and a PostgreSQL 17 rehearsal with hard-coded migration counts (36/39/41). It does **not** run the full unit suite, full `test:security`, most e2e, `pnpm build`, `tests/runtime/*`, `tools/backend-mirror-guard.test.mjs` or the freeze regression test. `help-centre-integration.yml` runs two e2e specs on PRs to `main`. Passing CI is not full verification; run the relevant tests yourself and report exactly what ran.
- `schema_email_outbox.test.sql` is excluded from CI as obsolete; email-outbox DB behavior is not covered by it.

Scripts you can run by accident that touch data:

- `scripts/check-expired-listings.ts` and `scripts/cleanup-orphan-media.ts` use the **service-role key with no host guard**. They act on whatever `.env.local` points at. Use `--dry-run` and confirm the target first.
- `scripts/import-india-postal-data.ts` needs `--allow-remote --confirm-host <host>` for non-local targets; Production additionally requires a `data.gov.in` source and `--expect-sha256`.
- `scripts/backup-*.ts` accept only `--source=staging|local` and write under gitignored `artifacts/`. `bootstrap-admin.ts` and `seed-listings.ts` are local-only.
- Never put hosted URLs plus a service key in `.env.local` for local work.

## Code conventions

- **Next 16 specifics:** the request interceptor is `src/proxy.ts` (`export async function proxy`, `config.matcher`). Do not create `middleware.ts`. `params`, `searchParams`, `cookies()` and `headers()` are Promises and must be awaited. `next.config.ts` sets `skipTrailingSlashRedirect`, custom redirects, security headers and `no-store` on `/account/*`; there is no CSP header. Zod is v3 (3.24.x), not v4.
- **Server work:** mutations are `"use server"` actions returning `{ error?, success? }`; route handlers are for media, webhooks and JSON APIs. Parse every external input with zod `safeParse`, return the first issue message, and fail closed.
- **Supabase clients (`src/lib/supabase`):** use `createClient` from `server` (cookie-based, forwards `x-request-id`) for user requests; `client` is browser-only. `createServiceRoleClient` is for reviewed server paths only (media storage, public discovery, sitemap, deletion orchestration). Never expose `service_role`, `sb_secret_*`, `SUPABASE_SECRET_KEY`, Management API tokens or `SUPABASE_ACCESS_TOKEN` to browser bundles or `NEXT_PUBLIC_*`. RLS and RPC checks are authoritative; UI hiding is not.
- **Auth:** email/password with mandatory confirmation, six-digit email OTP and password recovery. No Google button and no phone login. `/auth/callback` still contains a legacy OAuth `?code=` path and remains the live path for `token_hash` verification. Never trust `user_metadata` for permissions; never convert the OTP template to a magic link; auth emails stay anti-enumeration and carry no payment links.
- **Policy and maintenance gates:** account mutations call `requireCurrentPolicyAcceptance`; listing writes check `isSellerWriteMaintenanceEnabled()`. In `proxy.ts`, an error from the `has_current_policy_acceptance` RPC **fails open** (logged, request continues); server actions and the media guard fail closed. Do not assume the proxy is the only gate.
- **Redirects:** always pass user-supplied targets through `sanitizeRedirectPath` (`src/lib/security/redirect.ts`).
- **Media routes:** only `/api/listings/[id]/media/**` accept Bearer tokens (via `authenticateRequest` in `src/lib/supabase/request-auth.ts`; a malformed `Authorization` header is 401 with no cookie fallback). Post-ad, privacy-export, callback and all server actions are cookie-only. Media mutations use the guard order in `src/lib/media/api-contract.ts`: maintenance, account status, policy, owner, status matrix.
- **Logging:** use `logger` from `src/lib/logger`; correlation IDs are always server-generated. Known gotchas: `emit()` keeps only `correlation_id`, `upstream_request_id`, `error_digest`, `client_event_id`, `route`, `operation`, `duration_ms`, `actor_id` and `details`, so data passed as `error_code` or `extra` is silently dropped — put data under `details`. `logger.error` takes `(event, error, context)`. Never log OTPs, tokenized links, PII or secrets.
- **Env fallbacks:** the Supabase browser/server clients and `proxy.ts` fall back to hard-coded local defaults (`http://127.0.0.1:54321`, a local test key) when env vars are unset; a misconfigured deploy will not fail closed. `src/lib/listings/test-runtime.ts` gates Post Ad flags on the two project refs above plus `VERCEL_ENV`/`NODE_ENV`/`VERCEL_GIT_COMMIT_REF`. The `POST_AD_*_PRODUCTION_DRAFT_ENABLED` flags must not exist in Vercel Production (`docs/operations/PRODUCTION_CATEGORY_DRAFT_GATES.md`).
- **Orphaned code with no importers in `src/`** (used by tests only): `lib/privacy/deletion-orchestrator.ts`, `lib/moderation/{checker,rules,contract,target-guard}.ts`, `lib/listings/csv-fields/*`. Do not assume they are wired in; the moderation modules are Backend mirrors.

## Security and evidence rules

- Never commit `.env.local`, tokens, PII, reset links, backups, agent logs or real user data as fixtures. `.env.example` holds placeholders only. Treat the alert-webhook URL, `RESEND_WEBHOOK_SECRET` and `VERCEL_AUTOMATION_BYPASS_SECRET` as secrets.
- Do not send real notifications from synthetic tests. Test-only non-delivery capture stays Test-only.
- Keep private originals, derivatives and abuse evidence private. Preserve Vault-verified moderation dispatch (fail closed) and staff AAL2/TOTP enforcement.
- Never claim a check passed unless it ran. Use PASS / FAIL / BLOCKED / NOT RUN / OPERATOR CONFIRMED, and separate source inspection, local verification and hosted acceptance (`docs/VERIFICATION.md`).
- Update README, `docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, `docs/WORKFLOW.md` and affected runbooks in the same PR when behavior, commands, security or release gates change. `pnpm docs:check` only enforces retired-phrase bans on the listed active guides (not this file).
- Report vulnerabilities privately to the maintainer.
