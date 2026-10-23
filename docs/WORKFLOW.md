# FairSwap change, review and release workflow

> ADS-01 production release preparation (23 October 2026): local main-based port; release and hosted acceptance are pending. See [handoff and verification](ADS-01-PRODUCTION-HANDOFF.md).

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


HDR-03 local review (23 October 2026): the isolated staging cleanup centralizes navigation auth and unread badges, preserves server/RLS authorization, and refreshes counts after successful notification reads. This is local implementation evidence, not hosted acceptance. `get_unread_counts()` must enforce the caller identity and return non-negative integer `unread_messages` and `unread_notifications`; without it, notifications use an owner-scoped exact count and chat badges are omitted. No Backend, RLS or hosted changes are included.

HDR-03 review 5627179716 follow-up: direct authenticated identity switches now discard private document/router state; loading auth and unavailable counts stay explicitly unknown. The companion Backend candidate defines individual inbound-message counts and owner-only `unread_count_signals` events for arrivals/read markers. Hosted installation and two-user/two-tab acceptance remain outstanding; source review does not authorize deployment.

HDR-03 Production release preparation (23 October 2026): selected merged staging PR #234 onto main-based release/hdr-03-main-20261023 at bad68d0, without merging staging. Centralized session-aware navigation, owner-scoped unread refresh, unknown chat-count fallback, private-state invalidation on identity change, and newest-100/read-cursor corrections are included. Production category, ListingCard, moderation and SRCH-04 implementations remain unchanged. Backend installation and genuine two-account Test acceptance are separate release gates; no deployment is authorized. See [release evidence and owner acceptance steps](operations/HDR03_PRODUCTION_RELEASE_20261023.md).
