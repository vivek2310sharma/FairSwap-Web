# FairSwap - verification protocol

This procedure defines required evidence; it does not report executed application tests. Read only the sections applicable to the authorized milestone.

## Every coherent build batch

Implement -> execute the relevant checks -> inspect actual output/exit status -> fix -> rerun. Several related files may form one batch. Test-driven red-to-green work is fine; unexplained red tests are not readiness.

Keep normal terminal approvals. Record the real error, not merely that an agent summary says 'failed'. Preserve process exit status in the actual shell; logging through a pipeline must not replace a failed test's status with the logger's zero exit.

Run new tests, not just write them. A build alone does not verify behavior, ownership, RLS or storage. Unit-test mocks can isolate logic but cannot substitute for required real local integration.

## 1.1 prerequisites and browser scope

Detect actual OS/shell/native versus WSL/container environment. Project packages and Playwright Chromium binary downloads require reviewed build scope and terminal approval. OS libraries, global tools and machine-security changes require separate explicit permission. See `docs/BOOTSTRAP.md`.

Use Chromium only for the initial desktop/mobile VIEWPORT smoke checks. This does not certify Safari/WebKit, Firefox, real hardware, all assistive technologies or a security audit. A future release support matrix can expand coverage through a reviewed plan.

A command pending approval is not a failed test. An unavailable browser/dependency is BLOCKED / NOT RUN. Do not disable policy controls, automatically invoke privileged installers, or remove browser assertions to claim completion.

## 1.1 final checks

| Check | Required evidence |
| --- | --- |
| `pnpm lint` | Actual final-file result/exit status |
| `pnpm typecheck` | Actual type-check result; no ignored errors |
| `pnpm test:unit` | Meaningful executed component tests, counts and outcome |
| `pnpm build` | Successful build of the actual root project |
| `pnpm start` | Built app serves the expected page; ready process/HTTP evidence, not a fictional exit code |
| `pnpm test:e2e` | Actual root app tested in Chromium desktop/mobile viewport projects |
| Visual review | Capture paths, dimensions, observed results; distinguish captured from inspected |
| Source/scope review | Preserved rules/spec/progress, lowercase package/root app, no future features/secrets |
| Cleanup review | Exact newly created temp path cleaned only with permission, or location reported |
| Diff check | Review actual changes; `git diff --check` when Git exists |

A long-running web server has startup/readiness evidence and an intentional shutdown, not a normal immediate 'exit 0'. Configure a test-owned local server/port, verify the expected app, avoid stale builds/unrelated servers, and stop only processes this run created. Prefer browser tests against the fresh production build for the final pass; development-server checks alone do not demonstrate production startup.

The implementation must supply these scripts or approved/documented equivalents. They do not exist in the starter pack yet. Do not execute nonexistent scripts and claim the platform was tested. Verify that no Supabase credentials or Docker are needed by the scaffold.

## 1.2-1.5 integration and security

Before database tests identify the disposable LOCAL target without printing credentials. Apply migrations in order, generate types from applied schema, test clean reset and upgrades as appropriate, and execute pgTAP/real-role integration tests. A new migration is not verified merely because its SQL parses or a secret client can access everything.

Required negative cases cover anonymous/private access; cross-owner writes; protected columns; self-granted roles; missing staff MFA; stale-token suspension; invalid status transitions and re-review; storage ownership and unsafe media; hidden content and cached image paths; outsider conversations/subscriptions; block/idempotency/notification behavior; case-specific staff access; reporter privacy; append-only audits; and safe account deletion with shared history.

Browser-test real local confirmed registration, seller submission, staff review, discovery/favourites, separate buyer/seller sessions, reports/support and sold status as each is implemented. Use synthetic fixtures in isolated local tests, never a hosted production reset or real messages as a shortcut.

## 1.6 release assessment

Repeat end-to-end and security regressions on final code and stated targets. Record real recovery exercises for database records AND image bytes, failure injection, browser/device coverage, keyboard/accessibility observations, measured performance conditions and unresolved launch blockers. A written backup procedure is not an executed restore.

Do not declare production readiness from a successful build. A local code-ready result and a blocked public launch can both be true. Public deployment and external checks require separate authorization.

## Durable evidence

Record date/time, milestone/plan revision, working-tree/commit identity, exact command and directory, target/environment/browser, real exit status or service readiness, PASS/FAIL/BLOCKED/NOT RUN, relevant test counts, short outcome and sanitized evidence path.

Keep bulky logs, videos, screenshots, traces and reports gitignored; never include secrets, session tokens or private content in reports. For synthetic local screenshots note their fixture status. If IDE restrictions block an ignored evidence path, request narrow permitted access or human inspection; do not disable protections globally.

Use the native Walkthrough for presentation and `docs/PROGRESS.md` for durable results. Capturing a screenshot is not inspecting it; a nice artifact is not executable proof. Required unrun checks keep the milestone incomplete. Passing automatic checks makes it ready for human review, not automatically accepted.

## Verification-only pass

The supplied VERIFY prompts permit running existing checks and updating evidence/progress, not editing product code, installing tools or weakening tests. Report needed fixes so the user can authorize them. Generated build/report files and documented isolated test fixtures are expected by verification; source changes are not.
