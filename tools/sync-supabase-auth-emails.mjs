#!/usr/bin/env node
/**
 * Safe hosted Supabase Auth email rollout. Needs a Supabase Management API PAT,
 * never a service_role key. No passwords, SMTP config or JWT settings are patched.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projects = Object.freeze({
  test: "wpppxlnbzqynvhpeuavd", // FairSwapTest
  prod: "kriuhwppxgxsyyrbjsau", // FairSwapProd
});
const writeKeys = [
  "mailer_templates_confirmation_content",
  "mailer_templates_magic_link_content",
  "mailer_subjects_confirmation",
  "mailer_subjects_magic_link",
  "mailer_otp_exp",
];
const readKeys = [...writeKeys, "mailer_otp_length", "jwt_exp"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupDir = path.join(homedir(), ".fairswap", "auth-email-backups");

export function pick(config, keys = readKeys) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Invalid Supabase Auth config response");
  }
  return Object.fromEntries(keys.map((key) => [key, config[key] ?? null]));
}
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const comparable = (value) => pick(value, writeKeys);
const equal = (a, b) => hash(comparable(a)) === hash(comparable(b));

export function candidate(base = root) {
  const toml = readFileSync(path.join(base, "supabase/config.toml"), "utf8");
  function subject(section) {
    const start = "[auth.email.template." + section + "]";
    const offset = toml.indexOf(start);
    if (offset < 0) throw new Error("Missing local section " + start);
    const block = toml.slice(offset + start.length).split(/\n\[/)[0];
    const value = block.match(/^subject = "([^"]+)"$/m);
    if (!value) throw new Error("Missing email subject in " + start);
    return value[1];
  }
  const expiry = toml.match(/^otp_expiry = (\d+)$/m);
  const length = toml.match(/^otp_length = (\d+)$/m);
  if (!expiry || !length || Number(length[1]) !== 6 || Number(expiry[1]) !== 600) {
    throw new Error("Expected 6-digit OTP and 600-second expiry");
  }
  const confirmation = readFileSync(path.join(base, "supabase/templates/confirm_email.html"), "utf8");
  const otp = readFileSync(path.join(base, "supabase/templates/magic_link.html"), "utf8");
  if (confirmation.split("{{ .TokenHash }}").length !== 2 ||
      !confirmation.includes("/auth/callback?token_hash={{ .TokenHash }}&amp;type=signup&amp;next=/account") ||
      otp.split("{{ .Token }}").length !== 2 ||
      otp.includes("{{ .TokenHash }}") ||
      !confirmation.includes("10 minutes") || !otp.includes("10 minutes")) {
    throw new Error("Email placeholders/callback/expiry are inconsistent: stopped");
  }
  return {
    mailer_templates_confirmation_content: confirmation,
    mailer_templates_magic_link_content: otp,
    mailer_subjects_confirmation: subject("confirmation"),
    mailer_subjects_magic_link: subject("magic_link"),
    mailer_otp_exp: 600,
  };
}

export function summary(config) {
  function markup(value) {
    return {
      exists: typeof value === "string" && value.length > 0,
      length: typeof value === "string" ? value.length : 0,
      sha256_12: typeof value === "string" ? createHash("sha256").update(value).digest("hex").slice(0, 12) : null,
      hasTokenHash: typeof value === "string" && value.includes("{{ .TokenHash }}"),
      hasOTP: typeof value === "string" && value.includes("{{ .Token }}"),
      hasCallback: typeof value === "string" && value.includes("/auth/callback?token_hash="),
    };
  }
  return {
    signup: markup(config.mailer_templates_confirmation_content),
    otp: markup(config.mailer_templates_magic_link_content),
    subjects: {
      signup: config.mailer_subjects_confirmation,
      otp: config.mailer_subjects_magic_link,
    },
    otp_expiry_seconds: config.mailer_otp_exp,
    otp_length: config.mailer_otp_length,
    jwt_expiry_seconds: config.jwt_exp,
  };
}

async function authConfig(ref, token, method = "GET", patch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.supabase.com/v1/projects/" + ref + "/config/auth", {
      method,
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        ...(patch ? { "Content-Type": "application/json" } : {}),
      },
      ...(patch ? { body: JSON.stringify(patch) } : {}),
    });
    if (!response.ok) throw new Error("Management API " + method + " failed: HTTP " + response.status);
    return method === "GET" ? await response.json() : null;
  } finally {
    clearTimeout(timeout);
  }
}

function storeBackup(ref, fields) {
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const filename = ref + "-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + hash(fields).slice(0, 8) + ".json";
  const destination = path.join(backupDir, filename);
  // Save only the explicitly selected fields, never the complete Auth response.
  writeFileSync(destination, JSON.stringify({ version: 1, project: ref, fields }, null, 2), { flag: "wx", mode: 0o600 });
  return destination;
}
function recoverable(fields) {
  for (const key of writeKeys) {
    if (key === "mailer_otp_exp") {
      if (!Number.isInteger(fields[key]) || fields[key] < 60) throw new Error("Missing original OTP expiry: cannot guarantee rollback");
    } else if (typeof fields[key] !== "string" || !fields[key].length) {
      throw new Error("Missing original " + key + ": cannot guarantee rollback");
    }
  }
}

export async function run(args = process.argv.slice(2), token = process.env.SUPABASE_ACCESS_TOKEN) {
  const [command, ...options] = args;
  const option = (flag) => {
    const i = options.indexOf(flag);
    return i < 0 ? null : (options[i + 1] ?? null);
  };
  const env = option("--env"), ref = projects[env];
  if (!ref || !["audit", "apply", "rollback"].includes(command)) {
    throw new Error("Usage: audit|apply|rollback --env test|prod [--confirm APPLY-TEST|APPLY-PROD|ROLLBACK-TEST|ROLLBACK-PROD] [--backup /absolute/path] [--test-mails-verified]");
  }
  // Point 1 owner-approved retirement: never PATCH hosted Supabase Auth from Web.
  // This guard precedes token reads and Management API requests; --confirm cannot override it.
  if (command !== "audit") {
    throw new Error("FROZEN: legacy Web Supabase Auth apply/rollback is disabled. Use the separately approved Backend-only release process after access cutover.");
  }
  if (!token) throw new Error("Set SUPABASE_ACCESS_TOKEN securely (Supabase Management API PAT required)");
  const hostedSettings = await authConfig(ref, token);
  const smtpConfigured = typeof hostedSettings.smtp_host === "string" && hostedSettings.smtp_host.trim().length > 0;
  const current = pick(hostedSettings);
  const desiredFromRepo = command === "rollback" ? null : candidate();
  process.stdout.write("Existing " + env + " hosted HTML analysis (metadata only):\n" + JSON.stringify(summary(current), null, 2) + "\n");
  process.stdout.write("Custom SMTP host configured (no hostname exposed): " + smtpConfigured + "\n");
  if (desiredFromRepo) process.stdout.write("Matches repository target: " + equal(current, desiredFromRepo) + "\n");

  if (command === "audit") {
    process.stdout.write("Read-only audit and existing HTML backup: " + storeBackup(ref, current) + "\n");
    return;
  }
  const authorization = command.toUpperCase() + "-" + env.toUpperCase();
  if (option("--confirm") !== authorization) throw new Error("Explicit --confirm " + authorization + " required");
  if (env === "prod" && command === "apply" && !options.includes("--test-mails-verified")) {
    throw new Error("Production requires --test-mails-verified after controlled FairSwapTest signup, OTP and recovery email checks");
  }
  let desired = desiredFromRepo;
  if (command === "rollback") {
    const file = option("--backup");
    if (!file || !path.isAbsolute(file) || !existsSync(file)) throw new Error("Specify existing absolute --backup path");
    const snapshot = JSON.parse(readFileSync(file, "utf8"));
    if (snapshot.version !== 1 || snapshot.project !== ref) throw new Error("Backup belongs to a different project");
    desired = comparable(snapshot.fields);
    recoverable(desired);
  } else {
    if (!smtpConfigured) throw new Error("Custom Auth SMTP not detected. New Free-tier projects cannot edit Auth templates using default SMTP");
    recoverable(current);
    if (env === "prod") {
      const test = pick(await authConfig(projects.test, token));
      if (!equal(test, desiredFromRepo)) throw new Error("FairSwapTest hosted config does not match repository. Refusing production update");
    }
  }
  if (equal(current, desired)) {
    process.stdout.write("Already up to date, no write performed.\n");
    return;
  }
  const rollbackFile = storeBackup(ref, current);
  process.stdout.write("Pre-write backup: " + rollbackFile + "\n");
  const recheck = pick(await authConfig(ref, token));
  if (!equal(current, recheck)) throw new Error("Live Auth template drift detected; no write performed");
  await authConfig(ref, token, "PATCH", comparable(desired));
  const verified = pick(await authConfig(ref, token));
  if (!equal(verified, desired)) {
    throw new Error("Read-after-write mismatch; inspect and rollback with backup " + rollbackFile);
  }
  process.stdout.write(command + " complete and verified for " + env + ". Backup: " + rollbackFile + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    // Management API responses, HTML, and the token are intentionally never printed.
    process.stderr.write("Auth email rollout stopped: " + error.message + "\n");
    process.exitCode = 1;
  });
}
