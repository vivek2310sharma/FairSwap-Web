# FairSwap.in - full Antigravity start guide

> [!NOTE]
> **Historical Starter-Pack Onboarding Notice**:
> This document records the original Antigravity starter-pack onboarding procedure (v4.0, 2026-09-13).
> - **Current Repository Status**: **PHASE 1 IS COMPLETE & ACCEPTED**. All six Phase 1 milestones (1.1 through 1.6), the hosted baseline on FairSwapTest, and the Controlled Production Pilot on `fairswap.in` have been built, verified, and accepted.
> - **Usage Invariant**: This document is preserved solely as a historical record. **Do NOT use these instructions to restart Milestone 1.1 or re-scaffold the project.** For current developer onboarding, branch workflows, and contribution guidelines, see [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`README.md`](./README.md).

Version 4.0 | Prepared 2026-09-13

You already have a folder named `FairSwap` open in Antigravity. This pack supplies your Project Bible, workspace rule, complete Phase 1 roadmap, six milestone contracts and separate chat prompts. It contains NO application code, preapproved implementation plan, dependencies, secrets or fabricated application test results.

The workflow is:

**Save the Project Bible -> activate the rule -> PLAN ONLY -> review/approve the plan -> BUILD one milestone with verification -> review/fix -> HUMAN ACCEPTANCE -> PLAN the next milestone.**

## Step 1. Copy the files into the existing project

Extract the ZIP and copy its CONTENTS directly into `FairSwap`, not into `FairSwap/FairSwap` or a nested starter-pack folder. Include the hidden `.agents` directory. At root, `FAIRSWAP_SPEC.md`, `START_HERE.md`, `.agents`, `docs` and `prompts` should be visible.

For an empty project, use v4 only. Do not also add v2/v3 prompt sets. For a folder containing only an untouched older starter, back up that folder, replace its matching instruction files with v4 and add the new files. Do not delete the entire project.

If the agent has already planned or coded anything, follow `docs/UPGRADING.md`: preserve code, secrets, existing plan/approval history and progress. Merge instructions rather than overwriting implementation records. Do not reset `docs/PROGRESS.md` to this initial template. Refresh the active rule in the IDE and pause an existing build while a materially affected plan is reviewed.

This download does not directly change your computer. Copying/merging the files is your local update step.

## Step 2. Activate one workspace rule

Open Antigravity's agent panel menu (`...`) -> Customizations -> Rules. Open the FairSwap workspace rule and choose Always On. This is a workspace-specific rule, not a global rule for every project.

The current documented location is `.agents/rules`. Supported older installations may use `.agent/rules`. If the copied rule is not listed, create it using + Workspace, copy the contents of `.agents/rules/fairswap.md`, and set Always On through the UI. Let the installed IDE persist its activation metadata. Keep only one active copy and record the actual location during kickoff. Do not create a second contradictory rule or paste the full Project Bible into the short rule.

This pack uses ordinary text prompts, not invented slash commands. Their filenames do not execute anything automatically. Current UI labels can vary; consult the official references in `docs/REFERENCE_SOURCES.md`.

## Step 3. Set a reviewed execution mode

Use Planning mode. Set Artifact Review Policy to Request Review and Terminal Command Auto Execution to Request Review. Keep access to unrelated/non-workspace files disabled. Use one implementation conversation at a time.

An approval pause is expected. Review proposed commands before approving package/browser downloads. System/global tool installs or security-policy changes require separate explanations and approval. Do not disable all safeguards, allow unknown scripts, grant production access, or approve destructive directory operations just to get past a pause.

Native browser tools can review the local page and trusted documentation when available. They supplement repeatable Playwright tests; no Supabase MCP/connector is required for 1.1. Do not expose private browser sessions or credentials.

## Step 4. Send the planning-only kickoff

Start a fresh agent conversation in the FairSwap workspace. Copy and send ONLY:

`prompts/00_KICKOFF_PLAN_ONLY.txt`

The agent should read relevant instructions, inspect the actual OS/shell/tools, propose missing prerequisites, create `docs/plans/1.1-plan.md`, present a matching native Implementation Plan artifact, and STOP.

No app files, installations, Git initialization, Supabase/Docker setup or browser downloads are authorized yet. A missing Node/pnpm runtime needs an appropriate proposed setup step; review its actual OS-specific commands before authorizing installation. No Supabase project, keys, domain, SMS or email provider is needed for 1.1.

## Step 5. Review the proposed 1.1 plan

Check that the plan includes a small local Next.js/TypeScript/Tailwind foundation; original responsive design; a clear development notice; meaningful conceptual architecture/permissions/state planning; real tests; and documentation.

Check the three setup safeguards:

1. Safe root: scaffold in a fresh lowercase temporary directory inside the workspace, transfer only reviewed non-conflicting application files to the existing root, preserve instructions/progress, use package name `fairswap`, and clean up narrowly after root verification. Do not force a generator into the populated root.
2. Tests: Chromium-only desktop/mobile viewport smoke tests for 1.1; browser download separate from privileged OS dependencies; retain review controls.
3. Plan ownership: `docs/plans/1.1-plan.md` and the native artifact have the same scope and revision. Incorporate your comments before implementation. A revised scope needs review, not silent selection of whichever plan is easier.

Reject plans containing live signup, database tables/RLS, uploads, real advertisements/search/chat or staff dashboards during 1.1. These may be discussed conceptually, not implemented. The final app belongs at the existing root, not a permanent nested project.

Use the artifact's review/comment action to request plan changes without starting implementation. A 'Proceed' action may start work in the IDE; do not use it merely to acknowledge reading. Make BUILD authorization explicit with the next prompt once satisfied.

## Step 6. Approve the reviewed plan and build 1.1

Send ONLY:

`prompts/01_BUILD_MILESTONE_1_1.txt`

This authorizes the latest 1.1 revision actually presented for your review, provided the durable plan and artifact agree. Confirm that revision in the agent response. Approve the corresponding native plan review when needed.

The agent may now build within the approved scope, subject to terminal permissions. Approved project dependency/browser downloads are normal; global/system changes and Git actions still require separate authorization. Scaffolding must follow `docs/BOOTSTRAP.md` and preserve the existing files.

The build loop is implement -> execute -> inspect output -> fix -> rerun. It is already present in the rules and prompt; you do not need to paste a reminder for every file. Do not send the next milestone's prompt while this work is running.

## Step 7. Review actual verification

The implementation must produce and execute `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, real production startup, and `pnpm test:e2e` for Chromium desktop/mobile viewports. These scripts do not exist until the agent creates the app.

A successful build is not proof of functional/security correctness. Check real outputs, screenshot inspection status, exact coverage, and recorded failures. For a separate verification-only pass, send:

`prompts/02_VERIFY_MILESTONE_1_1.txt`

That pass may run existing checks and update evidence/progress, not silently edit code or install dependencies. If a tool/network/permission prevents checks, the result remains BLOCKED / NOT RUN. Required checks that never ran cannot be relabelled PASS.

Read `docs/VERIFICATION.md` for evidence requirements. A native Walkthrough is a useful summary, not a replacement for commands and reports.

## Step 8. Open the local site and request corrections

After the app exists and dependencies are installed, open a terminal at `FairSwap` and run the README's startup command, normally:

```text
pnpm dev
```

Open the local address printed by that server. Stop it with Ctrl+C when finished. Do not run a second competing server on the same port while tests run. `pnpm start` tests a production build and follows `pnpm build`; it is not interchangeable with initial development startup.

Review the brand, development notice, desktop/mobile layout and any genuinely working local navigation. No real accounts, listings, search or chat are expected at 1.1. Review `docs/FOUNDATION.md` and actual `docs/PROGRESS.md` results too.

To request fixes, edit the review-notes placeholder in `prompts/03_REQUEST_FIXES_1_1.txt` and send it. The agent fixes only those in-scope issues, reruns checks and stops for another review. Do not accept merely because the agent says it is done.

## Step 9. Accept 1.1, then PLAN 1.2

Only after reviewing the implementation and evidence, send:

`prompts/04_ACCEPT_1_1_PLAN_1_2.txt`

It records your actual acceptance and authorizes PLANNING ONLY for 1.2. The agent should identify local Supabase/Docker prerequisites and propose the account/security plan, then stop. It must not start installing, writing migrations or building authentication yet.

After reviewing that next plan, use `prompts/07_BUILD_APPROVED_MILESTONE_TEMPLATE.txt` with `1.2` and its actual approved plan revision filled in. Do not send placeholders or invent a plan revision. The agent must stop when it finishes the authorized milestone.

For later transitions use `prompts/06_ACCEPT_AND_PLAN_NEXT_TEMPLATE.txt`, then the approved-build template. `prompts/08_VERIFY_MILESTONE_TEMPLATE.txt` provides later verification-only checks. Every transition uses a named milestone, not a blanket 'finish everything'.

## Step 10. Resume without overwriting work

For an interrupted approved 1.1 task, send `prompts/05_RESUME_MILESTONE_1_1.txt`. It recovers the last actual authorization and repository state. If only planning was authorized, it cannot turn that into BUILD permission. Do not run competing agents or replace progress with the starter template.

## Full roadmap

| Phase / milestone | Outcome |
| --- | --- |
| 1.1 | Running foundation, conceptual design and real scaffold tests |
| 1.2 | Local Supabase, confirmed accounts, roles/status and staff MFA |
| 1.3 | Listings, photographs, category/location management and moderation |
| 1.4 | Public discovery, filters, listing/seller pages and favourites |
| 1.5 | Persistent chat, notifications, blocks/reports, support and privacy handling |
| 1.6 | Full checks, failure/recovery, operations and pilot go/no-go |
| Phase 2 (future) | Engagement/search improvements and optional billing for FairSwap services |
| Phase 3 (future) | More locations/languages, professional seller tools and measured scaling |

All phases preserve the classifieds boundary unless you explicitly change the product. A public pilot still requires separate deployment and business/legal/operational approval.

## File guide

| File | Purpose |
| --- | --- |
| `FAIRSWAP_SPEC.md` | Full product/engineering Project Bible, selectively read |
| `.agents/rules/fairswap.md` | Short persistent workspace constraints |
| `docs/ROADMAP.md` | Three phases, six detailed Phase 1 outcomes |
| `docs/WORKFLOW.md` | Plan/build/verify/fix/accept authority and native-artifact synchronization |
| `docs/BOOTSTRAP.md` | Nonempty-root scaffolding, actual OS/tool checks and install permissions |
| `docs/VERIFICATION.md` | Actual commands, results, browser scope and evidence handling |
| `docs/milestones/` | Six reference task contracts, not preapproved build plans |
| `docs/PROGRESS.md` | Real implementation/approval/evidence history; preserve when upgrading |
| `docs/UPGRADING.md` | Safe v3-to-v4 merge guidance |
| `docs/REFERENCE_SOURCES.md` | Primary documentation and implementation-time version checks |
| `prompts/` | Send one appropriate prompt at a time |
| `CHANGELOG.md` | What changed in this pack |
| `PACK_VALIDATION.md` | Checks of the instruction package only, not app tests |
| `MANIFEST.sha256` | Pack file integrity hashes, not runtime/security certification |

Your next step is the planning-only kickoff, not creating a Supabase project or asking the agent to implement the entire Phase 1.
