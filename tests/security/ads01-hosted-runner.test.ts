import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const base={ADS01_TEST_APP_URL:'https://authorized-test-preview.vercel.app/',
  ADS01_TEST_APP_VERIFIED_PROJECT:'wpppxlnbzqynvhpeuavd',
  ADS01_TEST_PUBLISHABLE_KEY:'sb_publishable_fixture',
  ADS01_TEST_SELLER_A_STATE:'private-session-file-A-do-not-print',
  ADS01_TEST_SELLER_B_STATE:'private-session-file-B-do-not-print'};

const knownWarning='⚠️  Node.js 20 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 22 or later. For more information, visit: https://github.com/orgs/supabase/discussions/45715';
function assertStderr(stderr:string){
  // Allow exactly the pinned SDK warning once, including its platform newline.
  expect(['',knownWarning+'\n',knownWarning+'\r\n']).toContain(stderr);
}
function invoke(overrides:Record<string,string|undefined>,configured=true){
  const env={...process.env};
  for(const key of Object.keys(env))if(key.startsWith('ADS01_TEST_'))delete env[key];
  const child=spawnSync(process.execPath,['tools/verify-ads01-test-acceptance.mjs'],{
    cwd:process.cwd(),encoding:'utf8',env:{...env,...(configured?base:{}),...overrides},timeout:15000,
  });
  expect(child.error).toBeUndefined();
  assertStderr(child.stderr);
  const output=child.stdout+child.stderr;
  expect(output).not.toContain('private-session-file');
  expect(output).not.toContain('sb_secret_never_emit');
  expect(output).not.toContain('vercel-token-never-emit');
  return {status:child.status,report:JSON.parse(child.stdout)};
}

it('blocks missing authorized Test access without network or browser activity',()=>{
  const r=invoke({},false);expect(r.status).toBe(2);expect(r.report.results[0].status).toBe('BLOCKED');
});

it('does not treat operator attestations as independent deployment evidence',()=>{
  const candidate=invoke({},false).report.releaseCandidate;
  expect(candidate).toMatch(/^[a-f0-9]{40}$/);
  const r=invoke({ADS01_TEST_APP_VERIFIED_SHA:candidate});
  expect(r.status).toBe(2);expect(r.report.results[0].status).toBe('BLOCKED');
});
it('accepts only the exact pinned SDK warning and rejects additional stderr',()=>{
  assertStderr('');assertStderr(knownWarning+'\n');assertStderr(knownWarning+'\r\n');
  for(const stderr of ['unexpected error\n',knownWarning+'\nprivate-session-file\n',knownWarning+'\nsb_secret_never_emit',knownWarning+'\n'+knownWarning+'\n']){
    expect(()=>assertStderr(stderr)).toThrow();
  }
});
it.each([
  {ADS01_TEST_APP_URL:'https://fairswap.in/'},
  {ADS01_TEST_APP_URL:'http://authorized-test-preview.vercel.app/'},
  {ADS01_TEST_APP_VERIFIED_PROJECT:'kriuhwppxgxsyyrbjsau'},
  {ADS01_TEST_APP_VERIFIED_SHA:'wrong-commit',ADS01_TEST_VERCEL_TOKEN:'vercel-token-never-emit'},
  {ADS01_TEST_PUBLISHABLE_KEY:'sb_secret_never_emit'},
])('fails closed before reading sessions for invalid target/authority %j',overrides=>{
  const r=invoke(overrides);expect(r.status).toBe(1);expect(r.report.results[0].status).toBe('FAIL');
});
