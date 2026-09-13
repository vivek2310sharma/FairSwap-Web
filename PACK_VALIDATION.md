# FairSwap v4 - instruction-pack validation

Validated on 2026-09-13 in the artifact-generation environment. These checks apply to the delivered instruction files, not a built FairSwap website.

## Executed checks

- PASS: All 26 substantive instruction and prompt files present.
- PASS: One workspace rule, below documented 12000-character limit.
- PASS: Master sections 0 through 18 retained.
- PASS: All six milestone reference contracts present.
- PASS: Nine separate copy-paste prompts present.
- PASS: All text files UTF-8 readable, nonempty and newline terminated.
- PASS: Markdown code fences balanced.
- PASS: No application source, executable installer, dependencies or secret files.
- PASS: Initial progress has no fabricated build approvals.
- PASS: Kickoff is planning-only and stops before building.
- PASS: Populated-root preservation and temporary scaffold in kickoff.
- PASS: Browser scope and system-level permissions in kickoff.
- PASS: Native plan and Markdown synchronized with review revisions.
- PASS: Milestone 1.1 excludes real backend and requires credential-free startup.
- PASS: Verification-only cannot silently install/fix source.
- PASS: Human acceptance is separate from later build permission.
- PASS: Upgrade instructions preserve real progress/code.
- PASS: Literal prompt and milestone references resolve.
- PASS: Other literal local references exist or are explicit future outputs.
- PASS: Initial plan files deliberately not pre-created.
- PASS: No recorded HUMAN APPROVED ambiguous legacy state.

- PASS: ZIP CRC check, safe relative entry paths, and exact byte equality between archive entries and delivered files.
- PASS: SHA-256 manifest entries match delivered file bytes.

## What was not run

No Next.js app was scaffolded. No packages or Playwright browsers were installed for the user. No app lint, type, component, browser, production-startup or database/RLS tests were run. No Antigravity UI setting was changed. No user's local FairSwap folder, hosted Supabase project, Git repository or domain was modified.

The starting progress register remains NOT STARTED. App evidence must be generated during the approved milestone in the real workspace. The pack is not a production-readiness or security certification.

## Integrity

The archive contains 28 text files: 26 project instructions/prompts, this report, and `MANIFEST.sha256`. The manifest covers every other file (not itself). Intentional local customizations will change hashes and must not be overwritten merely to match the starter pack.
