// Point 1 minimal offline regression check. No credentials, network or Supabase usage.
import assert from "node:assert/strict";
import { test } from "node:test";
import { run as authTemplates } from "./sync-supabase-auth-emails.mjs";
import { run as recoveryTemplate } from "./sync-supabase-recovery-email.mjs";

const legacyWriters = [
  ["auth templates", authTemplates],
  ["recovery template", recoveryTemplate],
];

test("both Web Auth writers reject Test/Production apply and rollback before network access", async () => {
  const previousFetch = globalThis.fetch;
  let outboundCalls = 0;
  globalThis.fetch = async () => {
    outboundCalls += 1;
    throw new Error("Unexpected network request from a frozen writer");
  };
  try {
    for (const [label, run] of legacyWriters) {
      for (const env of ["test", "prod"]) {
        for (const command of ["apply", "rollback"]) {
          await assert.rejects(
            () => run([command, "--env", env, "--confirm", command.toUpperCase() + "-" + env.toUpperCase()], "local-fake-token-not-a-credential"),
            /FROZEN: legacy Web Supabase Auth apply\/rollback is disabled/,
            label + ": " + command + " " + env,
          );
        }
      }
    }
    assert.equal(outboundCalls, 0, "frozen legacy write entrypoints must never fetch hosted config");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Web read-only Auth audit mode is not frozen, but still requires a PAT", async () => {
  for (const [label, run] of legacyWriters) {
    for (const env of ["test", "prod"]) {
      await assert.rejects(
        () => run(["audit", "--env", env], ""),
        /SUPABASE_ACCESS_TOKEN/,
        label + ": audit " + env,
      );
    }
  }
});
