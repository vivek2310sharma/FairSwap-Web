# FairSwap change, review and release workflow

> ADS-01 local review, 23 October 2026: eight My Ads status tabs, owner-scoped counts and URL pagination are prepared for review; hosted acceptance is pending. See [scope and verification](ADS-01-LOCAL-REVIEW.md).

**Active workflow — 14 October 2026.** This replaces the old sequential milestone execution procedure for current development. There is no mandatory `Phase 1` / `Phase 2` transition and no `1.1` kickoff prompt. [CONTRIBUTING](../CONTRIBUTING.md) is the canonical Git/PR guide.

## 1. Intake and authorization

1. Inspect the actual repository, applicable current docs, existing issues and Test/Production state. **Do not** use a dated plan's "NOT AUTHORIZED" wording as a new global freeze or silently treat a historical "PASS" as today's verification.
2. Agree on an issue or scoped change request: the user impact, trust/safety value, exact files/interfaces, Web/native clients affected, RLS/data boundary, tests, and explicit acceptance.
3. For multi-file changes write a reviewable execution plan, with reversible steps, file list, migration/deploy boundary and failure/rollback path. Approval of the plan does **not** grant Production data access or privileged operations automatically.
4. Work in an isolated branch or worktree based on latest `staging`, preserving other work. No branch/worktree cleanup before identifying unsaved changes.

Planning, implementation, read-only verification, deployment, and acceptance are distinct actions. A generic "go" applies to the conversation's agreed task, not unrelated Production changes.

## 2. Implementation contract

- Implement cohesive, testable changes; use TypeScript types, Zod at boundaries, database constraints and Supabase RLS to enforce ownership.
- Use SSR/session-scoped clients for customer data; privileged keys only for reviewed backend paths. Protect staff MFA and moderation dispatch.
- Keep user-facing behavior accessible and mobile-first. Optimize images/payloads for low-bandwidth India.
- Check differences in Web, Android and iOS API semantics before changing shared endpoint contracts. Native release builds are handled in their own projects.
- Avoid production-only migrations, email template changes, secret rotation and live notifications as unreviewed side effects.
- Keep test fixtures and synthetic data segregated from FairSwapProd. Test-only email-capture infrastructure must remain non-delivering and fail closed.

## 3. Evidence and review

Record **the commands actually run**, branch/head revision, target, CI result, browser/viewport coverage, database role, success/failure, and unverified assumptions. Do not relabel a blocked test as passing.

Minimum relevant code checks: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test:unit`. For security-sensitive work run focused `test:security`, disposable Supabase pgTAP/RLS and hostile direct-API assertions. For customer workflows run Playwright mobile/desktop coverage and hosted Test acceptance. For runtime changes run `corepack pnpm build`.

Refer to [VERIFICATION](VERIFICATION.md). Preview is useful but is **not** proof of full production behavior, real email receipt or a user's completed action.

## 4. Integration and Production

- Open a focused PR into `staging`. Require green applicable checks and Vercel Preview; inspect the entire diff and release dependencies.
- Verify against **FairSwapTest** for hosted workflows. Use separate authorization to apply Test database/Auth/Storage/Edge changes where necessary.
- To ship Production, select the approved subset. When staging also carries Test-only work, use a **main-based focused release PR** rather than merging all staging changes.
- Do not equate merging GitHub source with applying hosted Supabase config, migrations, Edge Function versions, secrets or DNS. For each environment audit, back up, apply only authorized fields, verify server-side state and exercise a real acceptance journey.
- After a main-only release, merge/reconcile the main security change back into staging without dropping staged work; CI must pass.
- Close linked issues only after required Test/Production acceptance. Retire merged short-lived branches and preserved clean worktrees, not shared `main` or `staging`.

## 5. Handoff and documentation

Use a brief walkthrough, code-review summary and dated evidence in the affected docs. Distinguish **implemented**, **tested locally**, **deployed to Test**, **deployed to Production**, **operator-confirmed acceptance**, **deferred**, and **blocked**. State remaining risks.

Keep [CURRENT_STATE](CURRENT_STATE.md), [ROADMAP](ROADMAP.md) and affected operations docs accurate. Historical [PROGRESS](PROGRESS.md), [milestone files](milestones/) and old starter [prompts](../prompts/) remain read-only evidence. Never start those old prompt scripts as if this were a fresh scaffold.
