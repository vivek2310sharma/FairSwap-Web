#!/usr/bin/env node
/**
 * Recovery-only Supabase Auth email rollout. Requires a Management API PAT.
 * Never PATCHes OTP expiry, signup, magic-link, SMTP, site URL or JWT settings.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECTS = Object.freeze({
  test: "wpppxlnbzqynvhpeuavd",
  prod: "kriuhwppxgxsyyrbjsau",
});
const PATCH_KEYS = Object.freeze([
  "mailer_templates_recovery_content",
  "mailer_subjects_recovery",
]);
const PROTECTED_KEYS = Object.freeze([
  "mailer_templates_confirmation_content",
  "mailer_templates_magic_link_content",
  "mailer_subjects_confirmation",
  "mailer_subjects_magic_link",
  "mailer_otp_exp",
  "mailer_otp_length",
  "jwt_exp",
  "site_url",
  "smtp_host",
  "smtp_port",
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = path.join(homedir(), ".fairswap", "auth-email-backups");

export function pick(config, keys = PATCH_KEYS) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Invalid Auth config response");
  }
  return Object.fromEntries(keys.map((key) => [key, config[key] ?? null]));
}
const fingerprint = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const same = (a, b) => fingerprint(a) === fingerprint(b);
export const targeted = (config) => pick(config);
const protectedState = (config) => pick(config, PROTECTED_KEYS);

export function candidate(base = ROOT) {
  const toml = readFileSync(path.join(base, "supabase", "config.toml"), "utf8");
  const section = "[auth.email.template.recovery]";
  const offset = toml.indexOf(section);
  if (offset < 0) throw new Error("Missing local recovery template configuration");
  const block = toml.slice(offset + section.length).split(/\n\[/)[0];
  const subject = block.match(/^subject = "([^"\r\n]+)"$/m)?.[1];
  const location = block.match(/^content_path = "([^"\r\n]+)"$/m)?.[1];
  if (!subject || location !== "./supabase/templates/recovery_email.html") {
    throw new Error("Unexpected local recovery subject or content_path");
  }
  const html = readFileSync(path.join(base, "supabase", "templates", "recovery_email.html"), "utf8");
  if (html.split("{{ .TokenHash }}").length !== 2 ||
      !html.includes("{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/auth/reset-password") ||
      html.includes("{{ .Token }}") || html.includes("{{ .ConfirmationURL }}") ||
      !html.includes('id="recovery-email-link"') || !html.includes("10 minutes")) {
    throw new Error("Recovery token/link/expiry contract failed");
  }
  return { mailer_templates_recovery_content: html, mailer_subjects_recovery: subject };
}

export function safeSummary(config) {
  const html = config.mailer_templates_recovery_content;
  return {
    html_present: typeof html === "string" && html.length > 0,
    html_bytes: typeof html === "string" ? Buffer.byteLength(html, "utf8") : 0,
    html_sha256_12: typeof html === "string" ? createHash("sha256").update(html).digest("hex").slice(0, 12) : null,
    has_token_hash: typeof html === "string" && html.includes("{{ .TokenHash }}"),
    has_confirmation_url: typeof html === "string" && html.includes("{{ .ConfirmationURL }}"),
    has_fairswap_callback: typeof html === "string" && html.includes("/auth/callback?token_hash="),
    subject: config.mailer_subjects_recovery ?? null,
    email_token_expiry_seconds: config.mailer_otp_exp ?? null,
    otp_length: config.mailer_otp_length ?? null,
    jwt_expiry_seconds: config.jwt_exp ?? null,
    custom_smtp_configured: typeof config.smtp_host === "string" && config.smtp_host.trim().length > 0,
  };
}

export function assertRestorable(fields) {
  if (typeof fields.mailer_templates_recovery_content !== "string" ||
      fields.mailer_templates_recovery_content.length === 0 ||
      typeof fields.mailer_subjects_recovery !== "string" ||
      fields.mailer_subjects_recovery.length === 0) {
    throw new Error("Cannot safely restore original recovery template/subject; inspect Dashboard");
  }
}

async function requestAuth(ref, token, method = "GET", patch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.supabase.com/v1/projects/" + ref + "/config/auth", {
      method,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        ...(patch ? { "Content-Type": "application/json" } : {}),
      },
      ...(patch ? { body: JSON.stringify(targeted(patch)) } : {}),
    });
    if (!response.ok) throw new Error("Management API " + method + " failed: HTTP " + response.status);
    return method === "GET" ? await response.json() : null;
  } finally {
    clearTimeout(timeout);
  }
}

function backup(ref, fields) {
  mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = ref + "-recovery-" + stamp + "-" + fingerprint(fields).slice(0, 8) + ".json";
  const out = path.join(BACKUP_DIR, filename);
  writeFileSync(out, JSON.stringify({
    version: 1, scope: "recovery-only", project: ref, fields: targeted(fields),
  }, null, 2), { flag: "wx", mode: 0o600 });
  return out;
}

function readBackup(file, ref) {
  if (!file || !path.isAbsolute(file) || !existsSync(file)) throw new Error("Absolute --backup filename required");
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (data?.version !== 1 || data?.scope !== "recovery-only" || data?.project !== ref) {
    throw new Error("Backup schema, scope, or project mismatch");
  }
  const fields = data.fields;
  if (!fields || Object.keys(fields).sort().join(",") !== [...PATCH_KEYS].sort().join(",")) {
    throw new Error("Recovery backup contains unexpected or missing fields");
  }
  assertRestorable(fields);
  return targeted(fields);
}

export async function run(args = process.argv.slice(2), token = process.env.SUPABASE_ACCESS_TOKEN) {
  const [command, ...flags] = args;
  const opt = (key) => {
    const i = flags.indexOf(key);
    return i < 0 ? null : flags[i + 1] ?? null;
  };
  const env = opt("--env"), ref = PROJECTS[env];
  if (!["audit", "apply", "rollback"].includes(command) || !ref) {
    throw new Error("Usage: audit|apply|rollback --env test|prod [--confirm APPLY-TEST|APPLY-PROD|ROLLBACK-TEST|ROLLBACK-PROD] [--backup ABSOLUTE_PATH] [--test-recovery-verified]");
  }
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN required (Management API PAT, not service_role)");
  const current = await requestAuth(ref, token);
  process.stdout.write("Hosted " + env + " recovery email (metadata only):\n" +
    JSON.stringify(safeSummary(current), null, 2) + "\n");
  if (command === "audit") {
    process.stdout.write("Read-only recovery backup: " + backup(ref, targeted(current)) + "\n");
    return;
  }

  const confirm = command.toUpperCase() + "-" + env.toUpperCase();
  if (opt("--confirm") !== confirm) throw new Error("Explicit --confirm " + confirm + " required");
  if (command === "apply" && env === "prod" && !flags.includes("--test-recovery-verified")) {
    throw new Error("Production requires successful real-inbox FairSwapTest reset and --test-recovery-verified");
  }
  let desired;
  if (command === "rollback") {
    desired = readBackup(opt("--backup"), ref);
  } else {
    desired = candidate();
    assertRestorable(targeted(current));
    if (Number(current.mailer_otp_exp) !== 600 || Number(current.mailer_otp_length) !== 6) {
      throw new Error("Hosted OTP policy differs from email copy; refusing write");
    }
    if (!safeSummary(current).custom_smtp_configured) {
      throw new Error("Custom Auth SMTP not detected; refusing hosted recovery template update");
    }
    if (env === "prod") {
      const test = await requestAuth(PROJECTS.test, token);
      if (!same(targeted(test), desired) || Number(test.mailer_otp_exp) !== 600) {
        throw new Error("FairSwapTest recovery template/OTP policy not aligned; refusing Prod");
      }
    }
  }
  if (same(targeted(current), desired)) {
    process.stdout.write("Already matches target: no hosted write performed\n");
    return;
  }
  const rollbackFile = backup(ref, targeted(current));
  process.stdout.write("Pre-write recovery backup: " + rollbackFile + "\n");
  const recheck = await requestAuth(ref, token);
  if (!same(targeted(current), targeted(recheck)) || !same(protectedState(current), protectedState(recheck))) {
    throw new Error("Concurrent hosted Auth config drift; no write performed");
  }
  await requestAuth(ref, token, "PATCH", desired);
  const after = await requestAuth(ref, token);
  if (!same(targeted(after), desired) || !same(protectedState(current), protectedState(after))) {
    throw new Error("Hosted read-after-write mismatch or unrelated config drift; inspect and rollback from " + rollbackFile);
  }
  process.stdout.write("Verified recovery-only " + command + " in " + env +
    "; rollback backup: " + rollbackFile + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write("Recovery email rollout stopped: " + error.message + "\n");
    process.exitCode = 1;
  });
}
