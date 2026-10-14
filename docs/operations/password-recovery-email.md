# FairSwap password-recovery email branding — issue #142

## Objective and existing behavior

The hosted password-recovery email still uses the old simple design. The code in supabase/templates/recovery_email.html now matches the responsive emerald email shell used by signup (#126) and sign-in OTP (#111). The subject remains "Reset your FairSwap Password".

The verification link MUST remain:
    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password
Use HTML-escaped &amp; in the actual href. Include exactly one TokenHash placeholder. Never switch to a plain OTP code, ConfirmationURL link or different callback route. The existing app handles the callback.

Global email verification expiry is already 600 seconds (10 minutes) on both hosted projects. This change only updates the recovery email HTML; the text mentions 10 minutes. Do not change the expiry, JWT, SMTP, site URL, other templates, database, RLS or application auth handlers.

## Source verification

Run from the checked-out source commit:

    node tools/preview-auth-emails.mjs
    corepack pnpm vitest run tests/unit/auth-email-templates.test.ts tests/auth/callback.test.ts
    node --test tools/sync-supabase-recovery-email.test.mjs
    corepack pnpm lint
    corepack pnpm typecheck

Preview all three HTML templates at narrow/mobile and desktop widths with fake tokens only. Confirm the recovery CTA text, URI contract, mobile layout, and security guidance. Do not copy real reset links into test reports.

## Recovery-only Management API deployment

Use tools/sync-supabase-recovery-email.mjs, which supports read-only audit, targeted apply, and rollback. It PATCHes ONLY:
- mailer_templates_recovery_content
- mailer_subjects_recovery

The script will refuse application unless the original recovery template and subject are restorable, custom Auth SMTP is configured, existing email-token expiry is 600 seconds, and no concurrent hosted drift is detected. It compares protected Auth fields before and after PATCH. Production requires FairSwapTest to match the recovery target, plus the explicit --test-recovery-verified flag.

Use a securely supplied SUPABASE_ACCESS_TOKEN (Supabase Management API access token/PAT, NOT a service_role JWT). Antigravity on Windows can reuse an already-authenticated, protected Management API token without printing it. Never run "supabase projects api-keys" to display keys, and do not log plaintext credentials or tokenized reset URLs.

**Never run supabase config push** for this scoped task: the checked-in config has localhost Auth URLs, and that broader operation may change unrelated hosted settings.

Projects:
- FairSwapTest: wpppxlnbzqynvhpeuavd
- FairSwapProd: kriuhwppxgxsyyrbjsau

### Audit both environments before writing

    node tools/sync-supabase-recovery-email.mjs audit --env test
    node tools/sync-supabase-recovery-email.mjs audit --env prod

Audit reports token/subject/HTML hash metadata, not the actual HTML. Backups are written outside Git under ~/.fairswap/auth-email-backups as recovery-only snapshots of two fields. Privately inspect the original hosted HTML to compare its token variables, callback, subject and appearance. Stop if the original template cannot be safely restored.

### Roll out to Test only

    node tools/sync-supabase-recovery-email.mjs apply --env test --confirm APPLY-TEST

Confirm stored HTML hash and subject using a fresh Management API GET, verify protected fields unchanged, then use an existing operator-controlled confirmed FairSwapTest user. Request an actual recovery email, check it visually on desktop/mobile, open the link, complete the password reset and sign in with the new password. Confirm expiration/redirect behavior; keep secrets out of records.

**A successful API PATCH or 200 recovery request is NOT evidence of actual email delivery/redemption.**

### Release and roll out to Production

Before Production, inspect origin/main versus origin/staging. They are diverged; do not merge all staging into main. Prepare a separate focused release PR FROM origin/main containing only the issue #142 recovery HTML, tests, preview, deployment utility and runbook. Require CI. Do not include unrelated Post Ad, database or email-outbox changes.

After successful FairSwapTest real-email acceptance and approved focused release:

    node tools/sync-supabase-recovery-email.mjs apply --env prod --confirm APPLY-PROD --test-recovery-verified

Re-audit both projects. Complete a real password-reset workflow on FairSwapProd with an authorized operator-owned account, and inspect actual desktop/mobile email rendering.

### Rollback

Using the environment's EXACT original recovery-only backup file:

    node tools/sync-supabase-recovery-email.mjs rollback --env test --backup "C:\ABSOLUTE\test-recovery-backup.json" --confirm ROLLBACK-TEST
    node tools/sync-supabase-recovery-email.mjs rollback --env prod --backup "C:\ABSOLUTE\prod-recovery-backup.json" --confirm ROLLBACK-PROD

Only recovery HTML and recovery subject are restored. Never revert signup, OTP or the shared 600-second token policy as part of this issue. Verify hashes and repeat controlled recovery testing after rollback.

## Acceptance record

Record date/time, source revision, before/after HTML checksum prefixes, subject, 600-second server setting, secure backup paths, real email arrival and rendered appearance, successful recovery URL redemption, completed password reset and subsequent successful sign-in. Redact all OTPs, passwords, reset links and privileged keys.

Close #142 only after both FairSwapTest and FairSwapProd pass a real recovery email and link redemption.

Management API reference:
https://supabase.com/docs/reference/api/v1-get-auth-service-config
https://supabase.com/docs/reference/api/v1-update-auth-service-config
