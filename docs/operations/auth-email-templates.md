# Authentication email templates: issues #126 and #111

## Scope

FairSwap's **Supabase Auth** owns signup confirmation and email sign-in OTP delivery. It uses Resend SMTP in production; these emails do **not** pass through the listing notification outbox. This change updates only the local Supabase Auth confirmation and magic-link/OTP templates and their matching subject lines. Signup, OTP verification, password recovery, staff MFA, and callback handlers are unchanged.

| Email | Versioned source | Supabase Dashboard template | Subject |
| --- | --- | --- | --- |
| Signup confirmation (#126) | `supabase/templates/confirm_email.html` | Authentication > Email Templates > Confirm signup | `Confirm your FairSwap email address` |
| Sign-in one-time code (#111) | `supabase/templates/magic_link.html` | Authentication > Email Templates > Magic link / OTP | `Your FairSwap sign-in code` |

Both HTML files independently use the same accessible, table-based FairSwap shell with system fonts and the Web brand's emerald palette. They contain no remote image/font requests. The signup CTA retains the existing `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/account` verification contract (HTML-escaped ampersands), and OTP continues to include only `{{ .Token }}`. Never replace the OTP template with a clickable magic link: `/auth/sign-in` expects a 6-digit code.

## Expiration policy and risk

`supabase/config.toml` changes `[auth.email] otp_expiry` from **3600** to **600 seconds** (10 minutes), with `otp_length = 6` unchanged. All email copy referencing expiration must say 10 minutes. This setting is **shared** by Supabase Auth email OTPs and verification links, including signup confirmation and password recovery. The separate `jwt_expiry = 3600` session lifetime is intentionally not modified. Ten minutes is a security/UX trade-off; test email-delivery latency, signup confirmation, and password recovery before approving hosted rollout. Supabase Auth hosted Test/Production settings are **not** changed by committing this file.

## Local preview and verification

1. `node tools/preview-auth-emails.mjs` generates *fake-token* standalone previews in your system temp directory. Open them at desktop and narrow mobile widths. Generated preview files do not belong in Git.
2. `corepack pnpm vitest run tests/unit/auth-email-templates.test.ts` tests tokens, callback, expiration, markup, and branding contracts.
3. Run `corepack pnpm typecheck`, `corepack pnpm lint`, and the relevant existing signup/OTP/callback tests.
4. With a **disposable/local** Supabase stack, send one signup confirmation and one email sign-in code to controlled test inboxes. Confirm HTML, subject, link redemption, OTP redemption, expiry, resend rules, and no unexpected account creation.

## Hosted audit and managed rollout

**Free-plan Auth SMTP prerequisite:** FairSwap's Supabase organization is on the Free plan and both hosted projects were created after 3 June 2026. Per Supabase's June 2026 policy, a new Free project using the Supabase default mail provider cannot customize Auth templates. **Production** is documented as using custom Resend SMTP, but **FairSwapTest Auth SMTP** is not verified in repository documentation. The audit command reports whether the Management API exposes a configured custom SMTP host (as a boolean only); the apply command refuses a write when custom Auth SMTP is not detected. Check **Authentication > SMTP Settings** for FairSwapTest if this guard fails. The separate listing-email Edge Function's Resend configuration does *not* prove Supabase Auth custom SMTP is enabled. See [Supabase's June 2026 policy](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

Supabase's **Management API** supports read/write access to hosted Auth email templates. The repository provides a strict, version-controlled helper (`tools/sync-supabase-auth-emails.mjs`) that first retrieves and analyzes **existing hosted HTML**. It reports template presence, hashes, whether signup and OTP token placeholders are present, configured subjects, OTP duration, and JWT lifetime, without logging actual HTML or secrets.

Use a **Supabase Management API personal access token** held in your local environment as `SUPABASE_ACCESS_TOKEN` (or a properly protected secret store). Never paste it into an issue, PR, chat, repository, terminal recording, or GitHub logs. A Supabase `service_role`, anon, or publishable key is **not** a Management API token. Access needs the appropriate Auth config read/write scopes. The connected Supabase database/Edge Function interface does not itself edit hosted Auth template settings.

```sh
# Pre-change read-only audits: always run both before rollout.
node tools/sync-supabase-auth-emails.mjs audit --env test
node tools/sync-supabase-auth-emails.mjs audit --env prod

# First update FairSwapTest; copies are taken before write and then verified.
node tools/sync-supabase-auth-emails.mjs apply --env test --confirm APPLY-TEST

# After confirming real signup, email OTP and recovery email delivery
# and redemption on FairSwapTest, authorize production.
node tools/sync-supabase-auth-emails.mjs apply --env prod --confirm APPLY-PROD --test-mails-verified

# Verify that both hosted projects exactly match version-controlled templates.
node tools/sync-supabase-auth-emails.mjs audit --env test
node tools/sync-supabase-auth-emails.mjs audit --env prod

# Emergency rollback: provide the exact absolute backup path printed earlier.
node tools/sync-supabase-auth-emails.mjs rollback --env test --backup /ABSOLUTE/BACKUP.json --confirm ROLLBACK-TEST
node tools/sync-supabase-auth-emails.mjs rollback --env prod --backup /ABSOLUTE/BACKUP.json --confirm ROLLBACK-PROD --test-mails-verified
```

**Antigravity on Windows 11:** Run these `node` commands in the project workspace terminal using PowerShell. Have the operator supply `SUPABASE_ACCESS_TOKEN` through a **secret environment variable** (never echo or paste it in a prompt). Rollback paths are absolute Windows paths such as `C:\\Users\\<account>\\.fairswap\\auth-email-backups\\<backup>.json`; quote the argument. The utility is cross-platform and stores backups in the executing user's home directory.

Backups contain **only five approved Auth config fields**: the two existing HTML templates, two subject lines, and shared email OTP expiration. The helper never saves a full Supabase Auth config, which may include sensitive SMTP or OAuth secrets. Backups are saved with restricted permissions under `~/.fairswap/auth-email-backups` and are never committed to Git. The helper refuses to write when existing templates/subjects/expiry cannot be restored, when another admin changed the config during preflight, or when production is ahead of FairSwapTest. Read-after-write GET verification confirms remote persistence, but **does not replace sending actual emails and checking inbox rendering**.

**Important limitations:** No hosted Auth settings change merely by merging the GitHub PR. Live HTML cannot be audited through the presently connected Supabase MCP tools; use the Management API helper or the authenticated dashboard. A GitHub CI pass verifies repository behavior, not delivery by Supabase SMTP.

## Hosted rollout (explicit approval required)

This repository's local config does not automatically update hosted Supabase Auth template HTML, subject lines, or `Email OTP Expiration`. Use the following order; do not apply this solely because the PR merges.

1. Before changes, record the existing **FairSwapTest** template HTML, subjects, and OTP expiration in a restricted change record (never record real credentials or OTPs). Check the hosted project's Site URL, allowed redirects, and custom SMTP readiness.
2. With approval, paste the exact `confirm_email.html` HTML into **FairSwapTest > Authentication > Email Templates > Confirm signup**, set its subject from the table, and save.
3. With approval, paste `magic_link.html` into **FairSwapTest > Authentication > Email Templates > Magic link / OTP**, set its subject, and save. Configure **Authentication > Providers > Email > Email OTP Expiration** to **600 seconds**, accounting for any Dashboard naming differences. Do not alter JWT expiration.
4. Trigger both emails using controlled test accounts. Verify actual inbox appearance (Gmail, Outlook, mobile), expiry after 10 minutes, sign-in from both password and OTP, callback redirect, signup confirmation, and password recovery. Check no real secrets or OTPs appear in logs. Confirm OTP delivery is reasonably prompt for the 10-minute window.
5. Record evidence and resolve any issue before production. After explicit production approval, repeat a controlled **FairSwapProd** rollout and monitoring; do not silently assume template/subject synchronization.

**Rollback:** Restore the previously captured environment-specific HTML, subjects, and OTP expiration together; then send controlled test emails to verify restored behavior. Do not modify `auth.users`, sessions, RLS, or database schema for this change.

## Rollout and Verification Record (2026-10-14)

- **Completed by:** Principal Engineer & Release Engineer
- **Release PR:** [#141](https://github.com/vivek2310sharma/FairSwap-Web/pull/141) (merged into `main` at commit `4d0cb4c`)
- **Issues closed:** [#126](https://github.com/vivek2310sharma/FairSwap-Web/issues/126), [#111](https://github.com/vivek2310sharma/FairSwap-Web/issues/111)
- **Environments verified:**
  1. **FairSwapTest (`wpppxlnbzqynvhpeuavd`):**
     - Custom Auth SMTP verified active (Port 465).
     - Pre-change backup saved: `~/.fairswap/auth-email-backups/wpppxlnbzqynvhpeuavd-2026-10-14T11-57-02-466Z-a35ef08e.json`.
     - Deployed subjects: `Confirm your FairSwap email address`, `Your FairSwap sign-in code`.
     - Deployed shared OTP/link expiry: `600 seconds` (10 minutes).
     - Confirmed read-after-write hash match (`aa91bf48277c` for signup, `4793115e8062` for OTP).
     - Verified authentication flows: 6-digit OTP delivery/redemption, callback token_hash confirmation, password login, password recovery, expiration, and rate-limiting.
  2. **FairSwapProd (`kriuhwppxgxsyyrbjsau`):**
     - Custom Auth SMTP verified active (Port 465, Resend).
     - Pre-change backup saved: `~/.fairswap/auth-email-backups/kriuhwppxgxsyyrbjsau-2026-10-14T12-09-04-825Z-c4040fb8.json`.
     - Deployed subjects: `Confirm your FairSwap email address`, `Your FairSwap sign-in code`.
     - Deployed shared OTP/link expiry: `600 seconds` (10 minutes).
     - Confirmed read-after-write hash match (`aa91bf48277c` for signup, `4793115e8062` for OTP).
     - Verified live auth invariants on `https://fairswap.in`: Google-provider retirement preserved, staff MFA untouched, session/JWT lifetime (3600s) preserved, zero drift.

**Reference limitation:** #111 includes a DBA.dk PDF attachment. The FairSwap design was independently authored adhering to FairSwap's brand design system (emerald palette, 6-digit styled OTP box, accessible table markup).
