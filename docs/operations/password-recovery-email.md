# FairSwap password-recovery email branding — issue #142

> [!IMPORTANT]
> **COMPLETED:** Issue #142 passed Test and Production acceptance on 2026-10-14. The audit/apply/rollback commands below are for **future separately authorized changes and incidents**, not an outstanding rollout. See the signed-off acceptance record at the end of this document.


## Objective and existing behavior

Before issue #142, the hosted password-recovery email used the old simple design. On 14 October 2026, the new responsive emerald email shell was deployed to FairSwapTest and FairSwapProd; the operator confirmed actual Production inbox delivery, reset-link redemption, password change and subsequent sign-in. The checked-in template matches the brand used by signup (#126) and sign-in OTP (#111). The subject remains "Reset your FairSwap Password".

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

## Completed release and acceptance record - 2026-10-14

**Issue:** [#142](https://github.com/vivek2310sharma/FairSwap-Web/issues/142). **Release:** [PR #143](https://github.com/vivek2310sharma/FairSwap-Web/pull/143) to staging, then focused [PR #144](https://github.com/vivek2310sharma/FairSwap-Web/pull/144) to main at commit `1b01745dda7c0a7da3c833584a6b9408bf674735`. GitHub CI passed; Vercel production deployed successfully.

**Scope:** Supabase Auth recovery HTML and recovery subject only. Other email templates, token expiry, SMTP, site URL, and JWT settings were not intentionally changed.

| Verification (Antigravity authenticated Management API report) | FairSwapTest | FairSwapProd |
| --- | --- | --- |
| Project ref | `wpppxlnbzqynvhpeuavd` | `kriuhwppxgxsyyrbjsau` |
| Hosted recovery HTML SHA256 prefix | `0dbcb028d5a6` | `0dbcb028d5a6` |
| Subject | `Reset your FairSwap Password` | `Reset your FairSwap Password` |
| Shared email verification expiry | 600 seconds | 600 seconds |
| JWT expiry | 3600 seconds | 3600 seconds |
| Configuration integrity | Read-after-write match; protected fields unchanged | Read-after-write match; protected fields unchanged |

**Real-inbox acceptance (operator-confirmed):**

- FairSwapTest: successful live password-recovery email and reset flow confirmed before production rollout.
- FairSwapProd: successful live test confirmed on 2026-10-14, covering all five checks: receipt of redesigned branded email; correct subject and 10-minute wording; successful reset-link navigation; password change; sign-out and successful sign-in with new password.

**Evidence boundary:** Live inbox/password tests are operator attestations, not tests independently performed by ChatGPT. Hosted configuration checks are from Antigravity's authenticated audit; no credentials, account identifiers, OTPs or active recovery URLs were saved here.

**Recovery-only rollback backups** remain outside Git in protected `~/.fairswap/auth-email-backups/` on the operator's machine. FairSwapTest original: `wpppxlnbzqynvhpeuavd-recovery-2026-10-14T13-41-54-780Z-5acbcd58.json`. FairSwapProd original: `kriuhwppxgxsyyrbjsau-recovery-2026-10-14T13-41-55-681Z-25e63f83.json`; Production pre-write: `kriuhwppxgxsyyrbjsau-recovery-2026-10-14T14-07-12-179Z-25e63f83.json`. Backup contents must never be committed.

**Result:** #142 acceptance criteria met in both environments. This record does not assert that unrelated signup or OTP flows were retested.
