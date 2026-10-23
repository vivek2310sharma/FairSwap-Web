import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const projectId = 'prj_mapIxQi99X2TDre2UuCVf4VsAjvn';
const teamId = 'team_Fk8MZq6cxDXPS4ViXloT6AZW';
const assert = condition => { if (!condition) throw new Error('Release authority check failed'); };

export function checkoutRelease() {
  // Do not let inherited Git overrides select an operator-supplied repository/index.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  const git = args => execFileSync('git', ['-c', `safe.directory=${root.replace(/[\\/]$/, '')}`, ...args],
    { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const sha = git(['rev-parse', '--verify', 'HEAD^{commit}']);
  assert(/^[a-f0-9]{40}$/.test(sha));
  // Local verification tooling may be patched; application/build inputs must match HEAD.
  git(['diff', '--exit-code', 'HEAD', '--', 'src', 'public', 'package.json', 'pnpm-lock.yaml', 'next.config.ts']);
  return sha;
}

export function validateDeployment(deployment, hostname, sha) {
  assert(/^[a-f0-9]{40}$/.test(sha));
  assert(deployment?.projectId === projectId && deployment?.team?.id === teamId);
  assert(deployment.readyState === 'READY' && deployment.target === null);
  // Only the immutable deployment hostname is accepted, never a movable branch alias.
  assert(deployment.url === hostname && /^dpl_[A-Za-z0-9]+$/.test(deployment.id));
  assert(deployment.meta?.githubCommitSha === sha);
  assert(deployment.meta?.githubOrg === 'vivek2310sharma' && deployment.meta?.githubRepo === 'FairSwap-Web');
  assert(deployment.gitSource?.type === 'github' && deployment.gitSource?.sha === sha);
}

export async function verifyDeployment(hostname, sha, token) {
  assert(typeof token === 'string' && token.length > 0);
  const url = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}`);
  url.searchParams.set('teamId', teamId);
  url.searchParams.set('withGitRepoInfo', 'true');
  const response = await fetch(url, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` }, redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  assert(response.ok);
  validateDeployment(await response.json(), hostname, sha);
}
