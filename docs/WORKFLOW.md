# FairSwap - sequential milestone operating contract

> [!NOTE]
> **Historical Milestone Workflow Notice**:
> This document records the original sequential milestone execution contract used during the development of Phase 1 (Milestones 1.1 through 1.6).
> - **Current Status**: **PHASE 1 MILESTONES ARE FULLY ACCEPTED**. Phase 2 remains NOT STARTED and NOT AUTHORIZED.
> - **Current Workflow**: Routine ongoing development, branch naming, pull requests, and production release procedures now follow the established Git workflow defined in [`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`docs/operations/deployment-guide.md`](./operations/deployment-guide.md).

## The complete cycle

PLAN -> HUMAN BUILD APPROVAL -> BUILD WITH VERIFICATION -> VERIFY/REVIEW -> FIXES IF NEEDED -> HUMAN ACCEPTANCE -> PLAN NEXT.

The six Phase 1 milestones are the eventual release plan. Only the current explicit request authorizes work. A successful test, an artifact button, or a prompt file sitting in the repository cannot authorize a different milestone.

## Sources of truth

| Record | Responsibility |
| --- | --- |
| `FAIRSWAP_SPEC.md` | Product requirements, anti-goals, architecture and security constraints |
| Active workspace rule | How the agent must work; scope and safety rules |
| `docs/milestones/<id>-<name>.md` | Milestone deliverables and acceptance contract, not an implementation approval |
| `docs/plans/<id>-plan.md` | Durable proposed/reviewed implementation plan with revision |
| Native Implementation Plan artifact | Review presentation of that same plan/revision |
| Human's actual message/review | Authorization to plan/build/fix or acceptance of completed work |
| `docs/PROGRESS.md` | Factual history of authorizations, work, checks and blockers |
| Native Walkthrough | Summary of implemented changes and links to actual evidence |

If product requirements conflict with a plan, flag the conflict. If the artifact and repository plan disagree, synchronize and request review before implementation. Agent-generated text cannot override higher-priority instructions or invent human authorization.

## Plan format

Create the plan only when planning is authorized. Include milestone ID, revision (r1 initially), status PROPOSED, reviewed baseline, in-scope/out-of-scope work, prerequisites, dependencies and permissions, intended files, small batches, verification commands, acceptance criteria, risks, and rollback/recovery notes for risky changes.

Keep plans compact enough to review, but concrete. Do not repeat the entire Project Bible. Each batch should have a testable result; a large milestone can propose sub-batches without authorizing future milestones.

Mirror scope, acceptance criteria, and revision in the native artifact. Native line comments are feedback, not automatic approval of an unreviewed updated scope. Copy agreed decisions into the durable plan. Do not start writing code while still asking for plan review.

After approval record the real human message/action and plan revision in progress. Mark build authorization separately from later acceptance. Do not forge a quote, timestamp, or approval event. A substantive addition/change to scope, dependencies, required privilege, architecture, or acceptance needs a new review; routine repairs within the approved scope only need an evidence update.

## Action permissions

| Action requested | Allowed writes | Not authorized |
| --- | --- | --- |
| PLAN ONLY | Named milestone plan; planning-status notes in progress | App code, installs, scaffold, Git/database changes |
| BUILD named milestone | Reviewed scope, associated tests/docs/evidence | Other milestones, deployments, unapproved privileged actions |
| VERIFY ONLY | Sanitized evidence and progress | Product fixes, new dependencies, test weakening |
| FIXES named milestone | Specified review fixes and directly relevant tests/docs | Scope expansion, next milestone |
| ACCEPT milestone | Record actual human acceptance | Automatic next build |
| PLAN NEXT | Next plan and planning notes | Next implementation |
| RESUME | Remaining work in the last explicitly approved action/scope | New scope based solely on a progress label |

Tests during verification may generate build outputs and isolated local test fixtures as documented; that is different from editing product source. Database resets/tests require a verified disposable local target. No remote change becomes authorized through a generic test command.

## Progress states

Use separate planning and implementation states:

- NOT STARTED.
- PLANNING / PLAN READY FOR REVIEW.
- BUILD AUTHORIZED / IN PROGRESS.
- BLOCKED / INCOMPLETE.
- READY FOR REVIEW (required checks passed; human review pending).
- HUMAN ACCEPTED (actual acceptance recorded).

Do not mark a future milestone in progress because its reference file exists. A previously accepted milestone can acquire a regression: record it and repair under current authorized scope rather than hiding it or rewriting history.

## Evidence and handoff

Before handoff review final files/diff and rerun relevant acceptance checks against that state. Record commands, outputs, exit status, test counts where relevant, environment, revision, browser coverage, and limitations. An HTML report or screenshot without execution provenance is not sufficient.

Provide a native Walkthrough when available and a durable summary in progress. State exactly what the app now does, what it does not do, which commands actually ran, how the user starts it, and what remains blocked. Do not claim the marketplace or production launch is complete after a scaffold build.

## Fixes, interruption, and later milestones

The user can send a FIXES prompt when review reveals problems, followed by verification and another review. Use one implementation agent at a time. An interruption must leave the current batch and pending checks in progress; resume by inspecting current files rather than overwriting with a fresh scaffold.

Only send an acceptance prompt after actually reviewing the result. The supplied 1.1 acceptance prompt permits planning 1.2 only; it does not authorize installation, migrations, or Auth implementation. Generic later-milestone prompts require explicit filled milestone IDs and the same gates.

Milestone 1.6 can produce a go/no-go assessment for a pilot. Human acceptance of code is still not deployment permission. Actual staging/production changes, legal/business decisions, provider setup and launch remain separately authorized actions.
