# Safely upgrading the FairSwap starter to v4

This pack does not edit the local project automatically. Copy/merge instructions deliberately. Never reset actual project progress to make it match an untouched template.

## Empty FairSwap folder

Extract the v4 archive and copy its CONTENTS to the existing root, including `.agents`. Activate one workspace rule, configure review-based execution, then use the planning-only kickoff. Do not add the old pack too.

## Only untouched v3 instructions exist

Make a backup of the current project folder before replacing files. Replace matching instruction/specification/prompt files with v4 and add the new shared procedures and future milestone contracts. Preserve unrelated files. Because no implementation history exists, the initial v4 progress register is appropriate only after confirming the old one is truly untouched.

The six original prompt filenames are retained. New generic prompts cover later gated work. Existing active rule metadata created by the IDE may differ from the plain source file; update its content through the UI without inadvertently removing activation settings. Keep a single active rule, including on legacy `.agent/rules` installations.

## Planning or code already exists

1. Pause active implementation. Back up the folder or use an existing approved version-control workflow; do not ask the agent to initialize Git/commit without explicit permission.
2. Preserve ALL source, package files, lockfiles, local secrets, migrations, tests, plan revisions, evidence and progress/approvals. This archive contains instructions, not a replacement app.
3. Merge the updated Project Bible's execution/setup clauses and short workspace rule. Do not blindly overwrite a locally amended product decision. Flag real conflicts for human review.
4. Keep `docs/PROGRESS.md` and existing `docs/plans` history. Add a dated note that v4 procedures were adopted and which reviewed plan is affected. Do not fabricate a passing test or previous acceptance.
5. Add BOOTSTRAP, WORKFLOW, verification updates, roadmap and milestone references. If a future scope file was already customized/approved, review differences rather than replacing it with a generic reference.
6. Update copy/paste prompts and verify their paths match the active rule and plans. No file existence grants work permission.
7. If no application exists yet, amend the pending 1.1 plan to include temporary scaffolding, Chromium prerequisites and native/Markdown synchronization, then request build approval. If the app already exists, DO NOT scaffold it again; apply relevant verification/workflow corrections only through a reviewed plan.
8. Refresh the rule in Antigravity, start/resume one conversation, inspect current state and explicitly name the authorized action. Keep later milestones blocked until human approval.

## Specific safeguards added in v4

- Do not force create-next-app into the populated root or blindly confirm prompts. Preserve files using a reviewed temporary scaffold/transfer when scaffolding is actually needed.
- Chromium-only viewport smoke tests for 1.1; browser downloads distinguished from system-library/global changes.
- Repository plan and native Implementation Plan artifact share a revision and scope. Resolve drift before building.
- BUILD approval and HUMAN ACCEPTANCE are distinct records. No silent advancement.
- Detailed future contracts are reference material, not code stubs and not authorization.

## After copying

Open the guide and rule to confirm v4. Review the pack manifest if useful; hashes apply to the delivered files and naturally change as you customize them. Do not treat a manifest mismatch after intentional edits as an application failure. Do not replace implementation files just to match the starter hashes.
