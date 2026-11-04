// Fail-closed preflight for the Wearables V1 Test E2E. Runs before Playwright; writes preflight.json.
// 1. The checked-out runner commit must descend from the tested staging commit and differ ONLY in runner files.
// 2. The runner commit must have a READY, non-Production deployment; its immutable URL is the E2E target.
// 3. Production Wearables must be OFF, observed through one anonymous, credential-free GET (no Production credentials).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_RUNNER_FILES, PRODUCTION_FLAG_OFF_MESSAGE, PRODUCTION_ORIGIN, RUNNER_PATHS, SHA40, WEB_STAGING_SHA,
} from "./contract.mjs";

export function fail(code, detail = "") {
  console.error(`PREFLIGHT_FAILED ${code}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

/** Pure: validates the changed-file list against the Backend runner-isolation rule. */
export function validateRunnerDiff(lines) {
  const entries = lines.filter(Boolean).map(line => line.split("\t"));
  if (entries.length === 0 || entries.length > MAX_RUNNER_FILES) return "file-count";
  for (const [status, ...paths] of entries) {
    if (!/^[AMD]$/.test(status) || paths.length !== 1) return `status:${status}`;
    if (paths[0].includes("..") || !RUNNER_PATHS.some(re => re.test(paths[0]))) return `path:${paths[0]}`;
  }
  return null;
}

async function getJson(url, token) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" } });
  if (!res.ok) fail("GITHUB_API", `${res.status} ${new URL(url).pathname}`);
  return res.json();
}

async function findDeployment(repo, sha, token) {
  const deadline = Date.now() + 10 * 60_000;
  for (;;) {
    const deployments = await getJson(`https://api.github.com/repos/${repo}/deployments?sha=${sha}&per_page=100`, token);
    for (const d of deployments) {
      if (d.sha !== sha || /prod/i.test(`${d.environment} ${d.original_environment ?? ""}`) || d.production_environment === true) continue;
      const statuses = await getJson(`https://api.github.com/repos/${repo}/deployments/${d.id}/statuses?per_page=10`, token);
      const ok = statuses[0]?.state === "success" ? statuses[0] : null; // newest first
      const url = ok?.environment_url ?? ok?.target_url ?? "";
      if (ok && /^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(url)) return { id: d.id, url: url.replace(/\/$/, ""), sha: d.sha };
    }
    if (Date.now() > deadline) fail("RUNNER_DEPLOYMENT_NOT_READY", sha);
    console.log("Waiting for the runner commit's non-Production deployment to become READY...");
    await new Promise(resolve => setTimeout(resolve, 30_000));
  }
}

async function productionFlagIsOff() {
  const res = await fetch(`${PRODUCTION_ORIGIN}/api/post-ad/wearables/sessions`, { redirect: "manual", headers: { Accept: "application/json" } });
  let body = null;
  try { body = await res.json(); } catch { /* not JSON: cannot prove OFF */ }
  // The route checks the flag before authentication: OFF -> exact "coming soon" message. Anything else is not proof.
  return res.status === 400 && body?.error === PRODUCTION_FLAG_OFF_MESSAGE;
}

async function main() {
  const { GITHUB_SHA: sha, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: runId, TEST_ACTIVATION_RUN_ID: activation, E2E_EVIDENCE_DIR: dir } = process.env;
  if (!SHA40.test(sha ?? "") || !repo || !token || !/^\d+$/.test(runId ?? "") || !/^\d+$/.test(activation ?? "") || !dir) fail("ENVIRONMENT_UNAVAILABLE", "run context or test_activation_run_id missing");
  if (git("rev-parse", "HEAD").trim() !== sha || sha === WEB_STAGING_SHA) fail("RUNNER_SHA", "runner must be a later commit than the tested staging commit");
  try { git("merge-base", "--is-ancestor", WEB_STAGING_SHA, sha); } catch { fail("RUNNER_NOT_DESCENDANT", "fetch-depth 0 is required and the runner must descend from the staging pin"); }
  const bad = validateRunnerDiff(git("diff", "--no-renames", "--name-status", `${WEB_STAGING_SHA}..${sha}`).split("\n"));
  if (bad) fail("RUNNER_COMMIT_NOT_ISOLATED", bad);
  const deployment = await findDeployment(repo, sha, token);
  if (!await productionFlagIsOff()) fail("PRODUCTION_FLAG_NOT_PROVEN_OFF", "anonymous probe did not return the flag-off response");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "preflight.json"), `${JSON.stringify({ runnerSha: sha, deployedWebSha: deployment.sha, deploymentId: deployment.id, baseUrl: deployment.url, webFlagEnabledInProduction: false, testActivationRunId: activation, runId }, null, 2)}\n`);
  console.log(`PREFLIGHT_OK runner=${sha} deployment=${deployment.id}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
