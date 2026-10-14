import assert from "node:assert/strict";
import { test } from "node:test";
import { candidate, pick, summary } from "./sync-supabase-auth-emails.mjs";

test("hosted Auth payload uses exactly the approved two templates and two subjects", () => {
  const payload = candidate();
  assert.deepEqual(Object.keys(payload).sort(), [
    "mailer_otp_exp",
    "mailer_subjects_confirmation",
    "mailer_subjects_magic_link",
    "mailer_templates_confirmation_content",
    "mailer_templates_magic_link_content",
  ].sort());
  assert.equal(payload.mailer_otp_exp, 600);
  assert.match(payload.mailer_templates_confirmation_content, /type=signup&amp;next=\/account/);
  assert.equal(payload.mailer_templates_confirmation_content.split("{{ .TokenHash }}").length, 2);
  assert.equal(payload.mailer_templates_magic_link_content.split("{{ .Token }}").length, 2);
  assert.doesNotMatch(payload.mailer_templates_magic_link_content, /\{\{ \.TokenHash \}\}/);
});

test("hosted Auth read-only snapshot whitelists and redacts secret settings", () => {
  const snapshot = pick({
    smtp_pass: "secret-must-not-leak",
    external_google_secret: "another-secret",
    mailer_otp_exp: 3600,
    jwt_exp: 3600,
    mailer_templates_confirmation_content: "<p>{{ .TokenHash }}</p>",
    mailer_templates_magic_link_content: "<p>{{ .Token }}</p>",
    mailer_subjects_confirmation: "Signup",
    mailer_subjects_magic_link: "OTP",
  });
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /secret-must-not-leak|another-secret|smtp_pass|external_google_secret/);
  assert.equal(snapshot.mailer_otp_exp, 3600);
  assert.equal(summary(snapshot).signup.hasTokenHash, true);
  assert.equal(summary(snapshot).otp.hasOTP, true);
  assert.equal(summary(snapshot).jwt_expiry_seconds, 3600);
});
