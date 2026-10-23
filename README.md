# FairSwap — Web

> ADS-01 local review, 23 October 2026: eight My Ads status tabs, owner-scoped counts and URL pagination are prepared for review; hosted acceptance is pending. See [scope and verification](docs/ADS-01-LOCAL-REVIEW.md).

**India-first, trust-first peer-to-peer classifieds.** FairSwap helps people discover, list and discuss second-hand items. Buyers and sellers arrange exchanges directly; FairSwap is **not** an item checkout, escrow, payout or delivery service.

> **Current documentation (reviewed 14 October 2026).** This repository is an operating Next.js application, not a starter pack. Older `Phase 1` / `Phase 2` milestones and starter prompts are historical records, **not active development gates**. Start with [CURRENT_STATE](docs/CURRENT_STATE.md), the [documentation index](docs/README.md), and [CONTRIBUTING](CONTRIBUTING.md).

## Environments and release status

| Environment | Git branch | Web app | Supabase |
| --- | --- | --- | --- |
| Controlled Production pilot | `main` | https://fairswap.in | `FairSwapProd` (`kriuhwppxgxsyyrbjsau`) |
| Shared staging / testing | `staging` | https://fair-swap-git-staging-fairswap.vercel.app | `FairSwapTest` (`wpppxlnbzqynvhpeuavd`) |
| Short-lived feature branches | Branch from `staging` | Protected Vercel previews | Test-only when explicitly configured |

Production and staging are **not meant to have identical commits or features at all times**. Staging incorporates current Production history plus development-only tests and features. Production releases require explicit review and acceptance; a merge does not authorize remote Supabase mutations. The controlled pilot is operational, but **wider public launch is not certified** by a successful deployment.

## What exists in the Web app

- **Accounts:** email/password signup and confirmation; password sign-in; six-digit email sign-in codes for eligible accounts; password recovery; staff TOTP/AAL2 controls. The current sign-in UI does **not** offer Google OAuth. A legacy OAuth callback path is not proof that Google is an approved login option. Phone-number/OTP login is **not** currently implemented in this Web repository.
- **Listings and safety:** owner-scoped drafts, listing lifecycle, moderated publication, private originals/derivative images, search/discovery, favourites, reports, user blocks, in-app communications and support. Use trusted server authorization and Supabase RLS; do not equate client-side hiding with security.
- **Moderation:** authenticated server-side moderation worker, including service-only Supabase Vault verification for dispatch credentials. Never expose a service-role key or worker secret to browsers.
- **Email:** consistent branded Supabase Auth confirmation, OTP and recovery templates are deployed and operator-verified in Test and Production (issues [#126](https://github.com/vivek2310sharma/FairSwap-Web/issues/126), [#111](https://github.com/vivek2310sharma/FairSwap-Web/issues/111), [#142](https://github.com/vivek2310sharma/FairSwap-Web/issues/142)).
- **Posting work in progress:** new category journeys and Test-only non-delivering email-capture utilities may exist on `staging`; their presence in Git does **not** mean they are active on Production or authorized for release. See [Post Ad evidence](docs/reference/post-ad/) and [roadmap](docs/ROADMAP.md).

FairSwap focuses on **lower fraud and stronger user trust than generic classifieds such as OLX India**: secure account flows, RLS-based ownership, moderation, and conservative notification boundaries. Never imply that a planned anti-scam or payment capability is shipped without live evidence.

## Technology

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zod and React Hook Form.
- Supabase PostgreSQL, Auth, Row Level Security, Storage, Realtime and Edge Functions.
- Vercel hosting; GitHub Actions for CI; pnpm pinned by `package.json` via Corepack.
- Vitest, Playwright, pgTAP and local disposable Supabase tests.

Consult `package.json` and `pnpm-lock.yaml` for **exact** versions; do not infer them from an old milestone report. Native Android/iOS have separate environments and repositories; this repository is the **Web** source of truth.

## Develop locally

**Prerequisites:** compatible Node.js with Corepack, Docker Desktop for local Supabase, Git, and a working terminal. Web development uses **Antigravity**; commands below work in its PowerShell terminal on Windows.

```powershell
git fetch origin --prune
git status
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm supabase start
corepack pnpm dev
```

The `.env.example` values are **placeholders**, not live credentials. Copy the required **local Supabase** values into `.env.local` privately after starting the local stack; never paste secrets into issues, PRs, or chat. For DB tests and resets, positively identify an **isolated disposable local** target before execution. **Never** run `supabase db reset`, `config push`, or other potentially destructive commands against a hosted Test/Prod project based on an assumed environment.

### Verification

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:security
corepack pnpm build
```

Run relevant browser tests (`corepack pnpm test:e2e`) and local pgTAP (`corepack pnpm supabase test db`) when a change touches user journeys, data contracts or database security. Not every test requires a live hosted service. Record **what actually ran**, targets and failures; green CI is not proof of a live production acceptance test.

## How we ship

1. Create a short-lived change branch from up-to-date `staging` and work against authorized Test/disposable resources.
2. Open a focused PR into `staging`. Require relevant CI, security review, and Vercel preview verification.
3. Release only an **approved subset** through a controlled PR to `main`. Do **not** blindly merge all staging-only features into Production.
4. Separately audit/backup/apply and verify hosted database/Auth/Edge changes. After a main-only hotfix, reconcile it back into `staging`.
5. Retire merged short-lived branches. Keep `main` and `staging` as the permanent branches.

See [contribution workflow](CONTRIBUTING.md), [deployment runbook](docs/operations/deployment-guide.md), and [verification protocol](docs/VERIFICATION.md).

## Find the right document

| Need | Start here |
| --- | --- |
| Current features, release boundaries and known gaps | [Current state](docs/CURRENT_STATE.md) |
| Documentation navigation and historical references | [Docs index](docs/README.md) |
| Backlog and workstreams (not phase gates) | [Roadmap](docs/ROADMAP.md) |
| Daily work, PRs, checks and approvals | [Contributing](CONTRIBUTING.md) / [Workflow](docs/WORKFLOW.md) |
| Production releases and operational controls | [Deployment guide](docs/operations/deployment-guide.md) |
| Auth email design, backup, deployment, acceptance | [Auth templates](docs/operations/auth-email-templates.md) / [Recovery](docs/operations/password-recovery-email.md) |
| Incident, grievance, backup and staffing | [Operations docs](docs/README.md#operations-and-compliance) |
| Older milestone plans and test evidence | [Historical records](docs/README.md#historical-project-records) |

**Operational caution:** Legal applicability decisions, backup/PITR limitations and public-launch approvals must be evaluated independently; read [operations readiness](docs/operations/public-beta-operations-readiness.md) before changing launch claims.
