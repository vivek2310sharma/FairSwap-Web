# FairSwap Web changelog and release references

**Current record — 14 October 2026.** This is a human-readable summary; Git history, merged PRs, schema migration history and the [current-state document](docs/CURRENT_STATE.md) are authoritative for actual code and deployment evidence.

## Shipped or accepted changes

- **2026-10-14 — Auth email branding:** signup confirmation (#126), six-digit email sign-in OTP (#111) and password-recovery (#142) templates shipped; Production operator confirmed an end-to-end recovery email/reset/sign-in test. Release evidence: [auth templates](docs/operations/auth-email-templates.md) and [recovery acceptance](docs/operations/password-recovery-email.md).
- **2026-10-14 — Staging security reconciliation:** [PR #146](https://github.com/vivek2310sharma/FairSwap-Web/pull/146) brought the already-deployed Vault-protected moderation worker and main's release evidence into staging; it preserved Test-only S1 capture and other staged work. Post-merge CI passed.
- **2026-10-13–14 — Moderation dispatch hardening:** [PR #140](https://github.com/vivek2310sharma/FairSwap-Web/pull/140) includes private Vault verification. Hosted Test and Production worker source matching main was independently checked during later staging reconciliation.

## Current working model

Keep `main` for accepted Production and `staging` for integration/Test work. The original sequential milestone gates are retired. See [CONTRIBUTING](CONTRIBUTING.md), [roadmap](docs/ROADMAP.md), and [workflow](docs/WORKFLOW.md).

---

## Archived starter-pack change log (historical only)

### Original Antigravity starter-pack history

## v4.0 - 2026-09-13

Supersedes v3 instructions for a new project. The underlying Next.js/Supabase classifieds product scope remains intact.

### Changed

- Made nonempty/capitalized project-root scaffolding a first-class planned operation, not a fallback after a failing command.
- Added controlled temporary-scaffold inventory, collision-safe transfer, final package naming, root verification, and narrowly scoped cleanup.
- Removed any reliance on a universal directory confirmation prompt or `--yes` as overwrite permission.
- Distinguished browser binary downloads from OS dependency installation. Chromium-only desktop/mobile viewport tests are the 1.1 baseline, with honest coverage limits.
- Defined durable Markdown plan ownership, native artifact mirroring, plan revisions, drift resolution, and separate human build approval/acceptance.
- Updated every 1.1 prompt with appropriate permissions, evidence requirements and stop boundaries.
- Clarified VERIFY ONLY cannot silently install/fix source, and ordinary tool discovery must not download executables during PLAN ONLY.
- Added guidance for preserving existing code/progress and avoiding duplicate active workspace rules.

### Added

- Detailed gated reference contracts for milestones 1.2-1.6 (not approved implementation plans).
- Shared WORKFLOW and BOOTSTRAP procedures.
- Generic later-milestone plan/build/verify prompts requiring explicit IDs and revisions.
- Safe-upgrade instructions, package-integrity manifest and instruction-pack validation report.

### Unchanged

- Phase 1 is a classifieds platform, not a product-payment marketplace.
- Only 1.1 planning is the first action; no automatic continuation.
- 1.1 builds/runs without Supabase credentials or Docker.
- Later SSR/RLS/MFA/storage/privacy requirements remain mandatory.
- No application source, dependencies, deployment, hosted services, production credentials or claimed app-test outcomes are delivered by this instruction pack.

