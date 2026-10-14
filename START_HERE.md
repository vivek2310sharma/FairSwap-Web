# Start here — FairSwap Web (Antigravity)

This is the **current** Web onboarding guide, reviewed 14 October 2026. The original starter-pack steps for setting up Milestones 1.1–1.6 are historical; **do not** re-scaffold this repository or paste the old `prompts/` kickoff scripts.

## 1. Orient yourself

Open the existing FairSwap-Web checkout in **Antigravity**. Read these current documents first:

1. [Repository README](README.md) — running application and architecture.
2. [Current state](docs/CURRENT_STATE.md) — what is deployed, what is Test-only and what remains unverified.
3. [Contributing](CONTRIBUTING.md) — branches, pull requests, security and verification.
4. [Documentation index](docs/README.md) — operational runbooks and historical evidence.
5. [.agents/rules/fairswap.md](.agents/rules/fairswap.md) — current agent safety and scope rules.

Current source-of-truth branches are `main` (Production) and `staging` (Test/integration). A historical `Phase1` or `Phase2` branch is neither needed nor authorized.

## 2. Inspect before editing

In Antigravity's **PowerShell** terminal:

```powershell
git fetch origin --prune
git status
git branch -vv
git worktree list
git log -3 --oneline origin/staging
```

Preserve all uncommitted work. For a normal approved task, branch from latest `staging`; for an authorized Production hotfix, use a separate main-based release branch. Prefer an isolated Git worktree for parallel agent changes.

## 3. Prepare local development

```powershell
corepack pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
corepack pnpm supabase start
corepack pnpm dev
```

Use values from the **local** Supabase CLI output in `.env.local`. Never copy live secrets into a repository, issue or chat. Run database reset/migration tests only after verifying a local disposable target; remote Test and Production are not disposable.

## 4. Implement and verify scoped work

Propose file/database/API changes and tests for the user-approved issue. Make the smallest useful change, follow the RLS and Zod trust boundaries, verify desktop and Android-sized UX, then run applicable checks:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:security
corepack pnpm build
```

If the task affects user journeys or the database, run relevant Playwright and disposable Supabase pgTAP tests. Never claim checks were run unless there is actual evidence. Refer to [verification protocol](docs/VERIFICATION.md).

## 5. Merge and release deliberately

Open a PR to `staging`, await required CI and preview checks, and verify against **FairSwapTest**. Releasing to `main` is a separate decision, and it must **exclude unapproved staging-only features**. Hosted Supabase/Auth/SMTP/Edge updates require their own audit, backups, change authorization and real post-update verification.

Use [deployment guide](docs/operations/deployment-guide.md) for release/rollback details. Delete merged short-lived branches only when local worktrees and uncommitted changes are safe.

## Legacy documentation

The original starter instructions, milestone plans, prompt scripts and dated pilot certificates remain in Git history and in the [historical documentation index](docs/README.md#historical-project-records) for provenance. They are **not** the current development instructions.
