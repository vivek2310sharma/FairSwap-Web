import assert from "node:assert/strict";
import { test } from "node:test";
import { candidate, pick, safeSummary, assertRestorable, targeted } from "./sync-supabase-recovery-email.mjs";

test("recovery patch includes exactly two approved Supabase Auth fields", () => {
  const fields = candidate();
  assert.deepEqual(Object.keys(fields).sort(), [
    "mailer_subjects_recovery", "mailer_templates_recovery_content",
  ].sort());
  assert.equal(fields.mailer_subjects_recovery, "Reset your FairSwap Password");
  assert.equal(fields.mailer_templates_recovery_content.split("{{ .TokenHash }}").length, 2);
  assert.match(fields.mailer_templates_recovery_content, /&amp;type=recovery&amp;next=\/auth\/reset-password/);
  assert.match(fields.mailer_templates_recovery_content, /10 minutes/);
  assert.doesNotMatch(fields.mailer_templates_recovery_content, /{{ .Token }}/);
});

test("backup whitelist excludes secrets and unrelated auth templates", () => {
  const allowed = pick({
    mailer_templates_recovery_content: "<p>{{ .TokenHash }}</p>",
    mailer_subjects_recovery: "Password reset",
    mailer_templates_magic_link_content: "must-not-be-in-backup",
    smtp_pass: "also-not-in-backup",
    service_role: "another-secret",
    jwt_secret: "never-copy",
  });
  assert.deepEqual(Object.keys(allowed).sort(), [
    "mailer_subjects_recovery", "mailer_templates_recovery_content",
  ].sort());
  assert.doesNotMatch(JSON.stringify(allowed), /must-not-be-in-backup|also-not-in-backup|another-secret|never-copy/);
  assert.deepEqual(targeted(allowed), allowed);
});

test("safe audit summary never exposes tokenized HTML or SMTP credentials", () => {
  const details = safeSummary({
    mailer_templates_recovery_content: "<p>{{ .TokenHash }}</p>",
    mailer_subjects_recovery: "Reset your FairSwap Password",
    mailer_otp_exp: 600,
    mailer_otp_length: 6,
    jwt_exp: 3600,
    smtp_host: "smtp-should-stay-private.example",
    smtp_pass: "secret",
  });
  assert.equal(details.has_token_hash, true);
  assert.equal(details.email_token_expiry_seconds, 600);
  assert.equal(details.custom_smtp_configured, true);
  assert.doesNotMatch(JSON.stringify(details), /smtp-should-stay-private|smtp_pass|secret|\{\{ \.TokenHash \}\}/);
});

test("rollback is refused without both original recovery fields", () => {
  assert.throws(() => assertRestorable({ mailer_templates_recovery_content: null, mailer_subjects_recovery: "Old" }));
  assert.throws(() => assertRestorable({ mailer_templates_recovery_content: "html", mailer_subjects_recovery: "" }));
  assert.doesNotThrow(() => assertRestorable({ mailer_templates_recovery_content: "<p>old</p>", mailer_subjects_recovery: "Old subject" }));
});
