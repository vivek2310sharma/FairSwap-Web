# FairSwap — active Antigravity workspace rules

This is the active FairSwap-Web project rule. It replaces the original starter-pack's numbered milestone instructions. Activate **one** copy of this rule as a workspace rule in Antigravity; do not create competing global copies.

## Current sources of truth

- Read [README](../../README.md), [CURRENT_STATE](../../docs/CURRENT_STATE.md), [CONTRIBUTING](../../CONTRIBUTING.md), [WORKFLOW](../../docs/WORKFLOW.md), and only the feature/security/operations documents relevant to the current request.
- **Do not restart Milestone 1.1, scaffold the project, use old `prompts/` scripts, or apply obsolete `Phase 1` / `Phase 2` stop gates.** Historical specs and evidence are reference material; the latest human instruction and reviewed issue scope determine authorized work.
- Inspect Git status, head revision, linked worktrees, affected files and deployed environment before edits. Preserve local work; never reset, force-push or delete untracked files simply to make the tree appear clean.

## Product boundary — India first

- FairSwap.in is a trust-first peer-to-peer **classifieds** platform for India. Buyers/sellers negotiate and exchange items directly. Do not fabricate item checkout, escrow, buyer-to-seller UPI transactions or courier protection.
- Prioritize trust vs. OLX India: minimize fake buyer links, advance-payment/UPI scams, impersonation, unverified sellers, and delivery-fee scams. Use clear, accessible English/Hindi wording where implemented, with mobile-first low-bandwidth UI.
- This repo owns the **Web** application. Coordinate shared API contracts with native Android/iOS projects but do not claim a mobile build was verified through Web tests.

## Architecture and security

- Use Next.js App Router, strict TypeScript, Tailwind and Supabase PostgreSQL/Auth/Storage/Edge. Use existing abstractions; avoid speculative packages or extra services.
- Enforce Zod validation at untrusted boundaries and real Supabase RLS/privileges at the database. User requests must use request-scoped SSR clients; never privileged clients as an RLS workaround.
- Never trust mutable user metadata for authorization. Preserve owner checks, staff AAL2/TOTP, private media, blocked content and Vault-authenticated moderation dispatch.
- Keep secrets, production backups, OTPs, tokenized reset links and private customer data out of source, logs, comments, prompts and screenshots. Browser keys must be public/publishable; never embed `service_role`/`sb_secret_` in clients.
- Test-only non-delivery capture is **Test only**, never an implicit Production feature. Do not emit real user notifications from synthetic testing.

## Work plan, verification and releases

- For multi-file features, enumerate affected files, API/DB changes, risks, rollback and tests. Keep tasks scoped and auditable. A plan or successful build does not authorize remote deployment.
- Use short-lived feature branches/worktrees from `staging` for ordinary development; `main` is live Production. Do not merge all staging changes to main if Test-only features are present. Reconcile main-originated security fixes back to staging.
- Implement small verified batches. Run relevant lint, typecheck, unit/security, browser and disposable pgTAP tests; inspect actual failures. Never silently skip a critical assertion or fabricate passing tests.
- Any hosted Supabase Auth config, migration, Edge deployment, secret, DNS or Production action requires explicitly approved separate release work, read-only preflight, backups where applicable, write-after-read verification and rollback readiness.
- PR acceptance and feature deployment are distinct from real-world user acceptance. Record evidence and close issues only when the specified environment test succeeds.
- Apply permissions appropriate to the actual Windows PowerShell/Antigravity environment. Do not approve machine-wide installs or destructive operations based solely on agent convenience.

## Handoff

Provide a concise summary: files and commits changed, checks actually run, environment, risks, pending decisions, rollback, and links. Keep [CURRENT_STATE](../../docs/CURRENT_STATE.md) and relevant docs up to date. Historical [PROGRESS](../../docs/PROGRESS.md) stays intact as dated evidence, not today's authority.
