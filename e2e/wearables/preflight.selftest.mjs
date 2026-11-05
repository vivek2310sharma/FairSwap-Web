// Focused, offline contract tests. Run: node --test e2e/wearables/preflight.selftest.mjs
// Named *.selftest.mjs so neither Playwright nor Vitest collects it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTIVATION_SHA256, MAX_RUNNER_FILES, PRODUCTION_ABSENCE, PRODUCTION_FLAG_OFF_MESSAGE, PRODUCTION_ORIGIN, RUNNER_PATHS, STEPS, WEB_STAGING_SHA } from "./contract.mjs";
import { productionFlagIsOff, validateRunnerDiff } from "./preflight.mjs";
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

test("adds exactly 12 anchored literal Tablets V2 paths to the three reviewed runner/CI patterns", () => {
  assert.equal(tablets.length, 12);
  assert.equal(new Set(tablets).size, 12);
  assert.equal(RUNNER_PATHS.length, 15);
  assert.equal(RUNNER_PATHS[0].source, "^\\.github\\/workflows\\/wearables-e2e-test\\.yml$");
  assert.equal(RUNNER_PATHS[1].source, "^e2e\\/wearables\\/[A-Za-z0-9._/-]+$");
  assert.deepEqual(RUNNER_PATHS.slice(3).map(re => re.source), tablets.map(path =>
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

const repo = "vivek2310sharma/FairSwap-Web";
const treeSha = "b".repeat(40);
function productionFixture(change = {}) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (change.networkError) throw new Error("network failure");
    if (url.startsWith("https://api.github.com/")) {
      if (change.apiStatus) return new Response("denied", { status: change.apiStatus });
      let value;
      if (url.includes("/statuses?")) value = change.statuses ?? [{ state: "success", creator: { login: "vercel[bot]" }, environment_url: PRODUCTION_ABSENCE.url, ...change.status }];
      else if (url.includes("/deployments?")) value = change.deployments ?? [{ id: 123, sha: PRODUCTION_ABSENCE.sha, environment: "Production", creator: { login: "vercel[bot]" }, ...change.deployment }];
      else if (url.includes("/git/commits/")) value = { sha: PRODUCTION_ABSENCE.sha, tree: { sha: treeSha }, ...change.commit };
      else if (url.includes("/git/trees/")) value = { sha: treeSha, truncated: false, tree: [{ path: "src/app/api/post-ad" }], ...change.tree };
      else throw new Error(`Unexpected request ${url}`);
      return new Response(JSON.stringify(value));
    }
    return new Response(change.body ?? (change.probeStatus === 204 ? null : "not found"), { status: change.probeStatus ?? 404 });
  };
  return { request, calls };
}

test("accepts the existing exact flag-off 400 without requesting provenance", async () => {
  const fixture = productionFixture({ probeStatus: 400, body: JSON.stringify({ error: PRODUCTION_FLAG_OFF_MESSAGE }) });
  assert.deepEqual(await productionFlagIsOff(repo, "fixture-token", fixture.request), { kind: "flag-off-400" });
  assert.equal(fixture.calls.length, 1);
});

test("pins the independently verified current Production identity", () => {
  assert.deepEqual(PRODUCTION_ABSENCE, {
    sha: "4554dd52a36df3ccd9856f4a9f89dc195c180833",
    deploymentId: "dpl_E9EunfNE7sgnYd9Qwd3bYz3Pj5kQ",
    url: "https://fairswap-8qzjyf906-fairswap.vercel.app",
  });
});

test("rejects the previous Production pin and mixed old/new deployment provenance", async () => {
  const previous = {
    sha: "9a291aeec7c64e4de2cd55d9b21686adedcc3dcd",
    deploymentId: "dpl_679vqxcCtkfCVQQa8kS7eZxU7HiT",
    url: "https://fairswap-5i5r6669p-fairswap.vercel.app",
  };
  for (const change of [
    { deployment: { sha: previous.sha }, status: { environment_url: previous.url }, commit: { sha: previous.sha } },
    { deployment: { sha: previous.sha } },
    { status: { environment_url: previous.url } },
    { commit: { sha: previous.sha } },
    // Never search past a stale newest deployment to find the reviewed pin.
    { deployments: [
      { id: 456, sha: previous.sha, environment: "Production", creator: { login: "vercel[bot]" } },
      { id: 123, sha: PRODUCTION_ABSENCE.sha, environment: "Production", creator: { login: "vercel[bot]" } },
    ] },
  ]) {
    const fixture = productionFixture(change);
    assert.equal(await productionFlagIsOff(repo, "fixture-token", fixture.request), null, JSON.stringify(change));
  }
});

test("accepts only a 404 backed by reviewed READY Production deployment and complete source", async () => {
  const fixture = productionFixture();
  const proof = await productionFlagIsOff(repo, "fixture-token", fixture.request);
  assert.equal(proof.kind, "verified-route-absence");
  assert.equal(proof.sha, PRODUCTION_ABSENCE.sha);
  assert.equal(proof.deploymentId, PRODUCTION_ABSENCE.deploymentId);
  assert.equal(proof.url, PRODUCTION_ABSENCE.url);
  assert.equal(proof.sourceTreeSha, treeSha);
  assert.equal(fixture.calls.length, 5);
  for (const { url, options } of fixture.calls) {
    if (!url.startsWith("https://api.github.com/")) {
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.credentials, "omit");
      assert.equal(options.redirect, "manual");
      assert.ok(url.startsWith(PRODUCTION_ORIGIN) || url.startsWith(PRODUCTION_ABSENCE.url));
    }
  }
});

test("rejects non-proof HTTP responses, malformed JSON and network failures", async () => {
  for (const probeStatus of [200, 204, 301, 302, 307, 308, 401, 403, 405, 429, 500, 502, 503]) {
    const fixture = productionFixture({ probeStatus });
    assert.equal(await productionFlagIsOff(repo, "fixture-token", fixture.request), null, String(probeStatus));
  }
  for (const body of ["not JSON", "{}", JSON.stringify({ error: "Unauthorized" }), JSON.stringify({ error: `${PRODUCTION_FLAG_OFF_MESSAGE} ` })]) {
    assert.equal(await productionFlagIsOff(repo, "fixture-token", productionFixture({ probeStatus: 400, body }).request), null);
  }
  assert.equal(await productionFlagIsOff(repo, "fixture-token", productionFixture({ networkError: true }).request), null);
});

test("rejects unverified 404s, stale/failed deployments and incomplete or conflicting source", async () => {
  for (const change of [
    { deployments: [] },
    { deployments: [{ id: 456, sha: "a".repeat(40), environment: "Production", creator: { login: "vercel[bot]" } },
      { id: 123, sha: PRODUCTION_ABSENCE.sha, environment: "Production", creator: { login: "vercel[bot]" } }] },
    { statuses: [{ state: "failure" }, { state: "success", creator: { login: "vercel[bot]" }, environment_url: PRODUCTION_ABSENCE.url }] },
    { deployment: { sha: "a".repeat(40) } },
    { deployment: { environment: "Preview" } }, { deployment: { creator: { login: "other" } } },
    { status: { state: "pending" } }, { status: { state: "failure" } },
    { status: { creator: { login: "other" } } }, { status: { environment_url: "https://other.vercel.app" } },
    { commit: { sha: "a".repeat(40) } }, { commit: { tree: {} } },
    { tree: { sha: "a".repeat(40) } }, { tree: { truncated: true } }, { tree: { tree: [] } },
    ...["src/app/api/post-ad/wearables/sessions/route.ts", "app/api/post-ad/wearables/route.ts", "src/pages/api/post-ad/wearables.ts", "pages/api/post-ad/wearables/sessions.ts"].map(path =>
      ({ tree: { tree: [{ path: "src/app/api/post-ad" }, { path }] } })),
    ...[301, 401, 403, 500].map(apiStatus => ({ apiStatus })),
  ]) assert.equal(await productionFlagIsOff(repo, "fixture-token", productionFixture(change).request), null, JSON.stringify(change));
  assert.equal(await productionFlagIsOff(repo, "", productionFixture().request), null);
  assert.equal(await productionFlagIsOff("other/repo", "fixture-token", productionFixture().request), null);
});

test("allows only the exact reviewed CI path for the PG17 correction", () => {
  assert.equal(validateRunnerDiff(["M\t.github/workflows/ci.yml"]), null);
  for (const path of [".github/workflows/ciXyml", ".github/workflows/ci.yml.bak", "prefix/.github/workflows/ci.yml", ".github/workflows/other.yml"]) {
    assert.equal(validateRunnerDiff([`M\t${path}`]), `path:${path}`);
  }
});

test("PG17 temporary config isolates project and all ports; drift fails closed", () => {
  const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const match = workflow.match(/          python3 - <<'PYCONFIG'\n([\s\S]*?)          PYCONFIG/);
  assert.ok(match, "PG17 isolated config generator must be present");
  const script = match[1].replace(/^          /gm, "");
  const source = readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8");
  const root = mkdtempSync(join(tmpdir(), "pg17-config-test-"));
  try {
    mkdirSync(join(root, "supabase"));
    mkdirSync(join(root, "isolated", "supabase"), { recursive: true });
    const env = { ...process.env, PG17_REHEARSAL_DIR: join(root, "isolated"), GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "2" };
    const run = () => execFileSync("python3", ["-c", script], { cwd: root, env, stdio: "pipe" });
    writeFileSync(join(root, "supabase/config.toml"), source);
    run();
    const isolatedPath = join(root, "isolated/supabase/config.toml");
    const isolated = readFileSync(isolatedPath, "utf8");
    assert.equal(isolated, source
      .replace('project_id = "fairswap-local"', 'project_id = "fairswap-pg17-123-2"')
      .replace("major_version = 15", "major_version = 17")
      .replace("port = 54321", "port = 55321")
      .replace("port = 54322", "port = 55322")
      .replace("shadow_port = 54320", "shadow_port = 55320")
      .replace("port = 54324", "port = 55324")
      .replace("smtp_port = 54325", "smtp_port = 55325")
      .replace("pop3_port = 54326", "pop3_port = 55326"));
    assert.equal(readFileSync(join(root, "supabase/config.toml"), "utf8"), source);
    for (const drift of [source.replace("major_version = 15", "major_version = 16"), source.replace("port = 54322", "port = 64322"), source.replace('project_id = "fairswap-local"', 'project_id="unexpected"')]) {
      writeFileSync(join(root, "supabase/config.toml"), drift);
      assert.throws(run, /Unexpected Supabase config/);
    }
    assert.equal(readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8"), source);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
