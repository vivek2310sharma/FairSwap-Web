// Fail-closed preflight for the Wearables V1 Test E2E. Runs before Playwright; writes preflight.json.
// 1. The checked-out runner commit must descend from the tested staging commit and differ ONLY in runner files.
// 2. The runner commit must have a READY, non-Production deployment; its immutable URL is the E2E target.
// 3. Production Wearables must be OFF: exact anonymous flag-off response or reviewed deployed source absence.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_RUNNER_FILES, PRODUCTION_ABSENCE, PRODUCTION_FLAG_OFF_MESSAGE, PRODUCTION_ORIGIN, RUNNER_PATHS, SHA40, WEB_STAGING_SHA,
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

/** A 404 is evidence only for the independently reviewed READY Production source. */
export async function productionFlagIsOff(repo, token, request = fetch) {
  const probe = url => request(`${url}/api/post-ad/wearables/sessions`, {
    method: "GET", cache: "no-store", redirect: "manual", credentials: "omit", signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  const api = async path => {
    const res = await request(`https://api.github.com/repos/${repo}/${path}`, {
      redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!res.ok) throw new Error("Production provenance unavailable");
    return res.json();
  };
  try {
    const res = await probe(PRODUCTION_ORIGIN);
    if (res.status === 400) {
      const body = await res.json();
      return body?.error === PRODUCTION_FLAG_OFF_MESSAGE ? { kind: "flag-off-400" } : null;
    }
    if (res.status !== 404 || repo !== "vivek2310sharma/FairSwap-Web" || !token) return null;
    // Check the newest Production deployment, never search past a failed/pending or changed release.
    // Vercel's successful GitHub status is checked again at runtime against the reviewed READY pin.
    const deployments = await api("deployments?environment=Production&per_page=100");
    const deployment = deployments[0];
    if (deployment?.sha !== PRODUCTION_ABSENCE.sha || deployment.environment !== "Production" ||
        deployment.creator?.login !== "vercel[bot]" || !Number.isSafeInteger(deployment.id)) return null;
    const statuses = await api(`deployments/${deployment.id}/statuses?per_page=10`);
    const status = statuses[0];
    if (status?.state !== "success" || status.creator?.login !== "vercel[bot]" ||
        status.environment_url !== PRODUCTION_ABSENCE.url) return null;
    const commit = await api(`git/commits/${deployment.sha}`);
    if (commit.sha !== deployment.sha || !SHA40.test(commit.tree?.sha ?? "")) return null;
    const tree = await api(`git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.sha !== commit.tree.sha || tree.truncated !== false || !Array.isArray(tree.tree) ||
        !tree.tree.some(entry => entry.path === "src/app/api/post-ad") ||
        tree.tree.some(entry => typeof entry.path !== "string" ||
          /^(?:src\/)?(?:app|pages)\/api\/post-ad\/wearables(?:[/.]|$)/.test(entry.path))) return null;
    return { kind: "verified-route-absence", sha: deployment.sha,
      deploymentId: PRODUCTION_ABSENCE.deploymentId, url: PRODUCTION_ABSENCE.url,
      githubDeploymentId: deployment.id, sourceTreeSha: tree.sha };
  } catch {
    // Includes malformed JSON, authentication/API failures, redirects, timeouts and network errors.
    return null;
  }
}

async function main() {
  const { GITHUB_SHA: sha, GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_RUN_ID: runId, TEST_ACTIVATION_RUN_ID: activation, E2E_EVIDENCE_DIR: dir } = process.env;
  if (!SHA40.test(sha ?? "") || !repo || !token || !/^\d+$/.test(runId ?? "") || !/^\d+$/.test(activation ?? "") || !dir) fail("ENVIRONMENT_UNAVAILABLE", "run context or test_activation_run_id missing");
  if (git("rev-parse", "HEAD").trim() !== sha || sha === WEB_STAGING_SHA) fail("RUNNER_SHA", "runner must be a later commit than the tested staging commit");
  try { git("merge-base", "--is-ancestor", WEB_STAGING_SHA, sha); } catch { fail("RUNNER_NOT_DESCENDANT", "fetch-depth 0 is required and the runner must descend from the staging pin"); }
  const bad = validateRunnerDiff(git("diff", "--no-renames", "--name-status", `${WEB_STAGING_SHA}..${sha}`).split("\n"));
  if (bad) fail("RUNNER_COMMIT_NOT_ISOLATED", bad);
  const deployment = await findDeployment(repo, sha, token);
  const productionProof = await productionFlagIsOff(repo, token);
  if (!productionProof) fail("PRODUCTION_FLAG_NOT_PROVEN_OFF", "neither exact flag-off response nor verified Production route absence");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "preflight.json"), `${JSON.stringify({ runnerSha: sha, deployedWebSha: deployment.sha, deploymentId: deployment.id, baseUrl: deployment.url, webFlagEnabledInProduction: false, productionProof, testActivationRunId: activation, runId }, null, 2)}\n`);
  console.log(`PREFLIGHT_OK runner=${sha} deployment=${deployment.id}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
