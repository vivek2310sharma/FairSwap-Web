# Contributing to FairSwap-Web

This is the active contribution guide for the India-first FairSwap Web application, last reviewed **14 October 2026**. There are **no active Phase 1/Phase 2 or milestone-number prerequisites**. Prioritize by issue, risk, product value and actual verification.

Read [CURRENT_STATE](docs/CURRENT_STATE.md), [WORKFLOW](docs/WORKFLOW.md), the relevant feature contract and [deployment guide](docs/operations/deployment-guide.md) before making security-sensitive changes.

## Branches and environments

- `main`: **Production**, deployed at https://fairswap.in to Supabase `FairSwapProd`.
- `staging`: shared **Test/integration**, deployed to the stable staging URL and Supabase `FairSwapTest`.
- `feat/*`, `fix/*`, `security/*`, `docs/*`, `test/*`, `chore/*`: short-lived branches created from the latest staging branch. Delete after merge.
- Production-only hotfixes can start from `main` with explicit approval. Reconcile the resulting main changes **back into staging** promptly, keeping staging-only work intact.

Staging may have more commits and files than main. **Zero commits behind main** is a useful reconciliation target; **identical file trees are not required**. Never force-reset either shared branch or merge development-only Test capture utilities into Production merely to equalize counts.

## Start a task safely

```powershell
git fetch origin --prune
git status
git switch staging
git pull --ff-only origin staging
git switch -c docs/example-change
corepack pnpm install --frozen-lockfile
```

Check `git worktree list` and preserve local work before switching branches. Use an isolated worktree for concurrent agents or when your main checkout has changes. Do not force-push shared branches or clean unknown worktrees.

Create or link a GitHub issue for substantial changes. Write a concise scope and acceptance contract: desired behavior, affected web/mobile contracts, database impact, attack surface, Test/Prod boundaries, files, tests, rollback and rollout. A human-approved task authorizes **only** the reviewed scope; passing a CI gate does not authorize unrelated deployment or data access.

## Local verification

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:security
corepack pnpm build
```

Run `corepack pnpm test:e2e` for changed user journeys and `corepack pnpm supabase test db` for schema/RLS changes using a positively identified **disposable local** database. Prefer focused Vitest suites during iteration, then relevant regression suites. Do not invent test results, disable failing assertions or mistake mocks/build output for hosted acceptance.

Test mobile-width/slow-network and accessibility behavior when changing customer UI. Verify English/Hindi wording where the relevant localization exists; do not falsely claim unshipped languages are supported. Optimize for low-end Android bandwidth even when building Web.

## Security and data boundaries

- Enforce authorization in Supabase RLS, database constraints, and trusted server-side checks; never depend on client UI visibility for access control.
- Validate untrusted inputs with Zod. For user requests use the request-scoped Supabase client; never put `service_role`/`sb_secret_`/management tokens into browser bundles or public environment variables.
- Do not trust `user_metadata` for staff/owner permissions. Protect staff workflows with applicable role/status and TOTP/AAL2 checks. Preserve existing Vault-based moderation dispatch verification.
- Keep private listing originals, derivatives, draft media and abuse evidence behind existing access controls. Audit public delivery and cache keys.
- Keep user-facing emails neutral against account enumeration and resistant to phishing, fake payment links and impersonation. FairSwap item transactions do not use escrow or payment links from buyers.
- For migrations: preserve historical applied files; introduce reviewed **forward** migrations with explicit GRANT/RLS checks and negative permission tests. A repo merge does not apply a hosted migration.
- Scope experiments and Test-only non-delivery capture to `FairSwapTest`. Do not deploy those functions or use synthetic accounts in Production without separate explicit authorization.
- Follow India's privacy, consumer and intermediary obligations as determined by current legal guidance; historical checklists do not constitute a fresh legal opinion.

Never commit `.env.local`, credentials, Supabase tokens, personal information, account reset links, screenshots of live secrets, production backups or temporary agent logs. Update `.env.example` with **placeholders only** when environment configuration changes.

## Pull requests and releases

Every PR must say what changed, why, its issue/acceptance criteria, excluded scope, relevant file/API/migration impacts, security/privacy concerns, evidence (commands + outcomes), rollback plan and deployment dependencies.

1. Branch from `staging` and make a reviewable, isolated change.
2. Open a PR to `staging`; require applicable GitHub Actions jobs and Vercel Preview checks. Test against the *correct* Supabase project.
3. Merge after review and required checks. Retire the temporary branch when local worktrees are clear.
4. For Production, select only **approved, tested changes**. A staging-to-main PR is appropriate only when **all** included staging changes are approved. Otherwise create a **focused release branch from main** with the accepted changes.
5. Record a release decision, Production checks and rollback path. Deploying code in Vercel is **separate** from Supabase migrations, Auth templates, secrets, functions or email-provider settings. Reconcile Production hotfix/release history back to staging.
6. Do not mark an issue completed until the required environment-specific behavior is verified and documented.

**Repository permissions:** Regardless of whether GitHub currently enforces branch protection, use PR review and CI as policy. Do not push directly to `main`; configure branch rulesets/required checks where supported.

## Documentation ownership

Update the **active** docs in the same PR whenever behavior, commands, security posture or release gates change: [README](README.md), [current state](docs/CURRENT_STATE.md), [roadmap](docs/ROADMAP.md), [workflow](docs/WORKFLOW.md), and affected [operations runbooks](docs/README.md#operations-and-compliance).

Historical plans, starter prompts, acceptance evidence, migration history, signed-off legal decisions and incident drills remain preserved as **historical records**. Do not rewrite their past claims as if they describe today. Add a correction or new dated record and link to current evidence.

Escalate private vulnerabilities securely to the maintainer. Never publish exploit paths, credentials, private user data or sensitive incident details in a public issue.
