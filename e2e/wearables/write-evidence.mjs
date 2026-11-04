// Writes wearables-v1-e2e-test.json + SHA256SUMS_e2e ONLY when every required step was proven by the run.
// Inputs (all produced by this run): preflight.json, steps.json (written by the spec), results.json (Playwright JSON report).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVATION_SHA256, ENVIRONMENT, FOUNDATION_SHA256, RECEIPT_NAME, SCHEMA, SHA40, STEPS, SUMS_NAME, TEST_PROJECT_REF, WEB_STAGING_SHA,
} from "./contract.mjs";

const refuse = (code, detail) => { console.error(`EVIDENCE_REFUSED ${code}: ${detail}`); process.exit(1); };
const read = file => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return refuse("INPUT_MISSING_OR_INVALID", file); } };

/** Pure: builds the receipt or returns {error}. Never invents a value: every field comes from this run. */
export function buildReceipt({ preflight, steps, results, generatedAt }) {
  const stats = results?.stats;
  if (!stats || stats.unexpected !== 0 || stats.flaky !== 0 || stats.skipped !== 0 || !(stats.expected >= STEPS.length)) return { error: "playwright-not-all-passed" };
  const proven = steps?.steps && typeof steps.steps === "object" ? steps.steps : {};
  if (!STEPS.every(step => proven[step] === true) || Object.keys(proven).length !== STEPS.length) return { error: "steps-not-all-true" };
  if (steps.webFlagEnabledInTest !== true) return { error: "test-flag-not-observed" };
  // Test-data cleanup gate (not part of the receipt): evidence only exists if every created listing was retired and verified.
  if (!Array.isArray(results.errors) || results.errors.length !== 0) return { error: "playwright-errors" };
  if (steps.cleanup?.verified !== true) return { error: "cleanup-not-verified" };
  if (preflight?.webFlagEnabledInProduction !== false) return { error: "production-flag-not-off" };
  if (!SHA40.test(preflight.runnerSha ?? "") || preflight.deployedWebSha !== preflight.runnerSha) return { error: "deployed-sha-mismatch" };
  if (!/^\d+$/.test(preflight.runId ?? "") || !/^\d+$/.test(preflight.testActivationRunId ?? "")) return { error: "run-ids" };
  return {
    receipt: {
      schema: SCHEMA,
      result: "PASS",
      runId: preflight.runId,
      environment: ENVIRONMENT,
      projectRef: TEST_PROJECT_REF,
      webStagingSha: WEB_STAGING_SHA,
      runnerSha: preflight.runnerSha,
      deployedWebSha: preflight.deployedWebSha,
      foundationSha256: FOUNDATION_SHA256,
      activationSha256: ACTIVATION_SHA256,
      testActivationRunId: preflight.testActivationRunId,
      webFlagEnabledInTest: true,
      webFlagEnabledInProduction: false,
      steps: Object.fromEntries(STEPS.map(step => [step, true])),
      generatedAt,
    },
  };
}

export function serialise(receipt) {
  const body = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return { body, sums: `${createHash("sha256").update(body).digest("hex")}  ${RECEIPT_NAME}\n` };
}

function main() {
  const dir = process.env.E2E_EVIDENCE_DIR;
  if (!dir) refuse("ENVIRONMENT", "E2E_EVIDENCE_DIR");
  for (const name of [RECEIPT_NAME, SUMS_NAME]) rmSync(join(dir, name), { force: true }); // never leave stale evidence
  if (!existsSync(join(dir, "results.json"))) refuse("INPUT_MISSING", "results.json");
  const built = buildReceipt({ preflight: read(join(dir, "preflight.json")), steps: read(join(dir, "steps.json")), results: read(join(dir, "results.json")), generatedAt: new Date().toISOString() });
  if (built.error) refuse("NOT_ALL_REQUIRED_CHECKS_PASSED", built.error);
  const { body, sums } = serialise(built.receipt);
  writeFileSync(join(dir, RECEIPT_NAME), body);
  writeFileSync(join(dir, SUMS_NAME), sums);
  console.log(`EVIDENCE_WRITTEN ${RECEIPT_NAME} ${sums.split(" ")[0]}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
