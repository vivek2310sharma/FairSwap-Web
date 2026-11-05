// Focused, offline contract tests. Run: node --test e2e/wearables/preflight.selftest.mjs
// Named *.selftest.mjs so neither Playwright nor Vitest collects it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIVATION_SHA256, MAX_RUNNER_FILES, RUNNER_PATHS, STEPS, WEB_STAGING_SHA } from "./contract.mjs";
import { validateRunnerDiff } from "./preflight.mjs";
import { buildReceipt } from "./write-evidence.mjs";

// Independent expected list: git show --name-only 5348f261e0683b049d256030bd0498d9365b1d0f.
const tablets = [
  "docs/operations/TABLETS_POST_AD_V2.md",
  "src/app/api/post-ad/tablets/submit/route.ts",
  "src/components/listings/TabletForm.tsx",
  "src/components/listings/posting/SearchCombobox.tsx",
  "src/components/listings/posting/tablet-wizard.ts",
  "src/lib/listings/tablets/contract.ts",
  "src/lib/listings/tablets/public.ts",
  "tests/browser/tablets-v1.spec.ts",
  "tests/unit/tablet-public-details.test.tsx",
  "tests/unit/tablet-submit-boundary.test.ts",
  "tests/unit/tablets-v1.test.ts",
  "tools/tablets-v1/verify.mjs",
];
const runners = [
  ".github/workflows/wearables-e2e-test.yml",
  "e2e/wearables/cleanup.mjs",
  "e2e/wearables/cleanup.selftest.mjs",
  "e2e/wearables/contract.mjs",
  "e2e/wearables/helpers.ts",
  "e2e/wearables/playwright.config.ts",
  "e2e/wearables/preflight.mjs",
  "e2e/wearables/wearables-v1.journey.ts",
  "e2e/wearables/write-evidence.mjs",
];

test("retains the original tested Web SHA and uses the successful Test activation hash", () => {
  assert.equal(WEB_STAGING_SHA, "e37e28df1d387a02bcbea19487dfe0f82d198f74");
  assert.equal(ACTIVATION_SHA256, "ec102db34e4414a713aed950b756ea617888209515031c5a615306d30e08ac54");
});

test("adds exactly 12 anchored literal Tablets V2 paths to the two existing runner patterns", () => {
  assert.equal(tablets.length, 12);
  assert.equal(new Set(tablets).size, 12);
  assert.equal(RUNNER_PATHS.length, 14);
  assert.equal(RUNNER_PATHS[0].source, "^\\.github\\/workflows\\/wearables-e2e-test\\.yml$");
  assert.equal(RUNNER_PATHS[1].source, "^e2e\\/wearables\\/[A-Za-z0-9._/-]+$");
  assert.deepEqual(RUNNER_PATHS.slice(2).map(re => re.source), tablets.map(path =>
    `^${path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`));
});

test("accepts the exact staging diff and the focused fix within runner paths", () => {
  const lines = [...runners.map(path => `A\t${path}`), ...tablets.map(path => `M\t${path}`)];
  assert.equal(validateRunnerDiff(lines), null);
  assert.equal(validateRunnerDiff([...lines, "A\te2e/wearables/preflight.selftest.mjs"]), null);
  for (const status of ["A", "M", "D"]) {
    assert.equal(validateRunnerDiff(tablets.map(path => `${status}\t${path}`)), null);
  }
});

test("rejects nearby names, prefixes, suffixes and unescaped-dot lookalikes for every tablet path", () => {
  for (const path of tablets) {
    for (const bad of [`prefix/${path}`, `${path}.bak`, `${path}/extra`, path.replace(".", "X")]) {
      assert.equal(validateRunnerDiff([`M\t${bad}`]), `path:${bad}`);
    }
  }
});

test("rejects unrelated app, auth, RLS, moderation and workflow paths even in an otherwise valid diff", () => {
  for (const path of [
    "src/components/listings/TabletListingDetails.tsx",
    "src/lib/listings/tablets/server.ts",
    "src/app/api/post-ad/wearables/submit/route.ts",
    "src/lib/supabase/server.ts",
    "src/proxy.ts",
    "src/lib/moderation/rules.ts",
    "supabase/migrations/20261105000000_change.sql",
    ".github/workflows/ci.yml",
    "package.json",
    ".env.example",
  ]) assert.equal(validateRunnerDiff([...tablets.map(p => `M\t${p}`), `M\t${path}`]), `path:${path}`);
});

test("preserves traversal, status, rename and malformed-entry rejection", () => {
  for (const path of ["e2e/wearables/../auth.ts", "e2e/wearables/a..ts", "../src/components/listings/TabletForm.tsx"]) {
    assert.equal(validateRunnerDiff([`M\t${path}`]), `path:${path}`);
  }
  for (const status of ["R100", "C100", "T", "U", "MM"]) {
    assert.equal(validateRunnerDiff([`${status}\t${tablets[0]}`]), `status:${status}`);
  }
  assert.equal(validateRunnerDiff([`M\t${tablets[0]}\textra`]), "status:M");
  assert.equal(validateRunnerDiff(["M"]), "status:M");
});

test("preserves the original nonempty, 100-file cap", () => {
  assert.equal(MAX_RUNNER_FILES, 100);
  assert.equal(validateRunnerDiff([]), "file-count");
  assert.equal(validateRunnerDiff([""]), "file-count");
  const lines = Array.from({ length: 100 }, (_, i) => `A\te2e/wearables/check-${i}.mjs`);
  assert.equal(validateRunnerDiff(lines), null);
  assert.equal(validateRunnerDiff([...lines, "A\te2e/wearables/extra.mjs"]), "file-count");
});

test("receipt emits the new activation and original Web pin while preserving Production OFF and cleanup gates", () => {
  const runner = "a".repeat(40);
  const input = {
    preflight: { runnerSha: runner, deployedWebSha: runner, webFlagEnabledInProduction: false, testActivationRunId: "42043201801", runId: "9001" },
    steps: { steps: Object.fromEntries(STEPS.map(step => [step, true])), webFlagEnabledInTest: true, cleanup: { verified: true } },
    results: { stats: { expected: 8, unexpected: 0, flaky: 0, skipped: 0 }, errors: [] },
    generatedAt: "2026-11-05T00:00:00.000Z",
  };
  const { receipt } = buildReceipt(input);
  assert.equal(receipt.activationSha256, ACTIVATION_SHA256);
  assert.equal(receipt.webStagingSha, WEB_STAGING_SHA);
  assert.equal(receipt.testActivationRunId, "42043201801");
  assert.equal(buildReceipt({ ...input, preflight: { ...input.preflight, webFlagEnabledInProduction: true } }).error, "production-flag-not-off");
  assert.equal(buildReceipt({ ...input, steps: { ...input.steps, cleanup: { verified: false } } }).error, "cleanup-not-verified");
});
