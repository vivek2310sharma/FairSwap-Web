# FairSwap verification protocol

**Current, issue-based verification (14 October 2026).** This document defines *how to prove an implementation*, not a claim that a specific test has run. No milestone-number prerequisite or Phase 1/Phase 2 completion rule applies to current changes.

## Target and evidence first

Identify: branch and commit, exact files under test, OS/terminal, package versions, browser/viewport, **local disposable** vs **FairSwapTest** vs **FairSwapProd**, identity/role, command, exit status, output and redacted log references.

Use `git status` and `git diff --check` on the proposed change. Verify the test runner and dependencies correspond to the checked-out revision. Tests and artifacts produced from an older worktree do **not** prove a new release candidate.

## Choose the relevant gates

| Changed boundary | Required verification |
| --- | --- |
| Basic code/README/docs | Link/cross-reference check, relevant unit tests where applicable, lint/typecheck and PR diff |
| User-facing Web page or critical flow | Accessibility/keyboard checks, mobile and desktop Playwright, hydration/log inspection |
| Server Actions/API input | Zod negative cases; unauthorized, malformed and cross-owner direct requests |
| Auth, OTP, callbacks, staff AAL2 | Positive and negative Auth/OTP paths, anti-enumeration, correct environment mapping, real controlled mailbox if email changes |
| RLS, schema, grants, RPCs | Forward migration tracking; pgTAP; direct `anon` / `authenticated` / owner / staff / `service_role` negatives on disposable DB |
| Media/Storage | Ownership, privacy, derivative/cache invalidation, content-type and size limits, race/idempotency tests |
| Moderation and background jobs | Strict Vault/service-only authorization, missing/invalid worker secret denial, replay/lease/idempotency and fail-closed behavior |
| Email / provider integrations | Distinguish source template test, hosted configuration hash, real inbox delivery and token redemption |
| Production release | Audited exact commit, hosted config/migration state, rollback, operator acceptance, post-deploy errors |

Common commands (select rather than falsely claiming all were executed):

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:security
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm supabase test db
```

Use targeted Vitest paths for iterations and required broader suites for merges. Check GitHub Actions job names and conclusions against the **exact** head SHA. Compare the Vercel preview's source SHA with the PR. Inspect failure logs; do not weaken the tests to force green CI.

## Local and hosted database safety

Before any reset, SQL write, migration, trigger or fixture setup, positively prove the **local disposable host/port/project**. Fail closed if identity is ambiguous. A local `supabase db reset` is destructive by design; never assume the current CLI target is safe. Never use live Production identities or customer data as Test fixtures.

RLS evaluation requires a true unprivileged role context. A privileged `service_role` success does not demonstrate owner-only access. SQL/pgTAP fixtures must be isolated and rollback where required; check anonymous access, tenant isolation, staff MFA and function grants.

Remote Test/Production writes require separate approval, backup and deployment verification; a PR merge is not a database deployment.

## Mobile, accessibility and low bandwidth

Test Android-sized viewport, slow connections and image/payload fallback in addition to desktop. Avoid unverified claims of hardware/device coverage; browser viewport emulation is **not** a real Android/iOS release test. Native builds must be verified in Android Studio or Antigravity/Xcode respectively when the change affects those clients.

## Reporting the result

Use unambiguous status for each claim: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**, or **OPERATOR CONFIRMED**. Link commit/PR/test run and scope; record unsupported assumptions and the next safe step. A screenshot without inspection, a hosted config `200` without a real email, or a build without behavior verification cannot certify production acceptance.

See [WORKFLOW](WORKFLOW.md), [CONTRIBUTING](../CONTRIBUTING.md), [deployment guide](operations/deployment-guide.md) and the [current state](CURRENT_STATE.md).
