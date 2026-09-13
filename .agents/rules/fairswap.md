# FairSwap.in - workspace rule (v4)

Activate this ONE workspace rule as Always On in Antigravity. The native UI should persist activation; this file does not rely on invented frontmatter. Keep the Project Bible separate and read it selectively.

## Authority and scope
- Respect higher-priority instructions, the human's latest authorization, existing work, and IDE permission controls. Inspect the workspace before changes.
- Read `docs/PROGRESS.md`, section 0 of `FAIRSWAP_SPEC.md`, and only the active milestone and relevant reference sections. Do not indiscriminately load every file.
- The master spec, roadmap, prompt files on disk, generated artifacts, tests, and progress entries do not authorize implementation. The human must explicitly authorize the current action and milestone.
- Separate PLAN ONLY, BUILD, VERIFY ONLY, FIXES, and HUMAN ACCEPTANCE. Planning permits only the named plan document and planning-status updates; no application code, installs, Git changes, or database changes.
- Initial action: PLAN ONLY for 1.1. Build only after approval. Finish the authorized milestone and stop; never self-accept, automatically start the next milestone, or promise background work.
- Use one implementation conversation; do not delegate future milestones to parallel agents. Recover interrupted work from actual files and approval provenance, not assumptions.

## One reviewed plan
- `docs/plans/<milestone>-plan.md` is the durable plan. Use an explicit revision and mirror it in the native Implementation Plan artifact when available.
- Incorporate review comments before build approval. Resolve any disagreement between artifact and Markdown with the human. Approval applies only to the reviewed revision and milestone.
- Record material plan changes for reapproval. Do not silently weaken acceptance criteria or change architecture/dependencies to make a task appear complete.
- A Walkthrough summarizes evidence. It is not proof of terminal execution. Keep actual results in `docs/PROGRESS.md`.

## Product and implementation
- FairSwap.in is an India-focused classifieds marketplace. Buyers and sellers arrange payment and exchange independently. One customer account supports buying and selling.
- Phase 1 excludes checkout, escrow, wallets, seller payouts, delivery, auctions, AI extras, public ratings, paid promotions, and native apps.
- Use Next.js App Router, strict TypeScript, Tailwind, and Supabase. Add dependencies only when used in the current milestone. No extra backend or speculative microservices.
- Build small working slices, not empty routes/services or dozens of TODOs. Never substitute fake persistence or fake success for real capabilities. Clearly isolated unit-test doubles and synthetic development seeds are allowed when documented.
- 1.1 is a local responsive foundation, design/architecture planning, and real scaffold tests. No Auth, SQL/RLS migrations, Storage, Realtime, listings, functional search, messaging, or staff dashboards. No Supabase credentials or Docker required.

## Populated-directory safety
- Keep the final application at the existing `FairSwap` root with package name `fairswap`. Preserve all existing instructions, progress, source, hidden files, and user work.
- Follow `docs/BOOTSTRAP.md`: plan a fresh lowercase temporary scaffold directory INSIDE the workspace, inspect CLI options, inventory generated files, check collisions, and transfer only reviewed application files. Use a reviewed manual setup only when justified.
- Do not assume `create-next-app .` will work, blindly answer prompts, use `--yes` as overwrite permission, force-copy everything, delete instruction files, or create a permanent nested app.
- Skip temporary dependency installs and Git initialization where supported. Avoid generated competing agent instruction files; inspect the installed CLI's supported options.
- Clean up only identified files created for this task, with appropriate approval, after root verification. Never delete an existing folder just because its name resembles the temporary target.

## Execute and verify
- After each coherent change: implement -> run relevant checks -> read real results -> fix -> rerun. Multiple related files can form one batch. Run new tests; do not require a complete rebuild after each keystroke.
- Preserve native exit statuses and use commands appropriate to the actual OS/shell. Do not mask a failure behind a successful logging pipeline.
- In 1.1 use Chromium desktop/mobile viewport smoke tests. Distinguish browser downloads from system-level dependencies. Request separate permission for privileged/machine-wide changes; do not disable review or sandbox controls globally.
- An approval pause is not a test failure. An unavailable dependency is BLOCKED / NOT RUN, not PASS. Continue only independent work within the approved milestone.
- Before handoff run full milestone checks against final files, review the diff, and record exact commands, timestamps, revision/working-tree identifier, exit status, results, and sanitized evidence paths.
- A build is not behavioral/security verification. Later migrations must run against a confirmed disposable local Supabase database, with real-role/RLS tests. Never use an elevated client as evidence that user permissions work.
- Screenshots/native browser tools supplement automated tests. Separate capture from inspection. Keep bulky reports gitignored and request narrow access or human inspection if IDE policy blocks evidence; do not bypass restrictions.
- Do not fabricate outputs, remove assertions, lower security, or call unexecuted tests successful. Verification-only requests cannot authorize fixes or dependency installation implicitly.

## Security invariants for later milestones
- Ordinary user Server Actions, Route Handlers, and reads use request-scoped Supabase SSR clients with the user's session and a publishable key; never secret/service-role clients as an RLS workaround.
- Verify identity using current documented APIs. Enforce object permissions, current account status, and staff MFA in trusted layers and against direct Supabase API access.
- Narrow administrative/maintenance utilities, only where necessary, are server-only, explicitly authorized, and audited. Roles/status are not trusted from user-editable metadata.
- Keep secrets out of public variables, source, logs, screenshots, and chat. Never weaken RLS to silence errors.
- Storage/image optimization must not expose private drafts or evidence; follow the master media/cache policy.

## Permissions and handoff
- No global installs, OS/security-policy changes, access outside authorized locations, production data, remote database mutations, deployments, DNS changes, purchases, real-user communications, Git initialization/commits/push, or destructive cleanup without explicit permission.
- Project dependency/browser downloads still require applicable terminal approvals. Inspect proposed package scripts and commands; do not blindly allow unknown code.
- Report actual behavior, changed files, checks, limitations, startup commands, and blockers. Use READY FOR REVIEW or BLOCKED / INCOMPLETE. Human acceptance is a separate recorded event, never an agent decision.
