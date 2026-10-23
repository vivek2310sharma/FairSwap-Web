import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const sha='e1737d965b55e8be599cf89b848e28007f2f0628';
const base={ADS01_TEST_APP_URL:'https://authorized-test-preview.vercel.app/',
  ADS01_TEST_APP_VERIFIED_SHA:sha,ADS01_TEST_APP_VERIFIED_PROJECT:'wpppxlnbzqynvhpeuavd',
  ADS01_TEST_PUBLISHABLE_KEY:'sb_publishable_fixture',
  ADS01_TEST_SELLER_A_STATE:'private-session-file-A-do-not-print',
  ADS01_TEST_SELLER_B_STATE:'private-session-file-B-do-not-print'};

function invoke(overrides:Record<string,string|undefined>,configured=true){
  const env={...process.env};
  for(const key of Object.keys(env))if(key.startsWith('ADS01_TEST_'))delete env[key];
  const child=spawnSync(process.execPath,['tools/verify-ads01-test-acceptance.mjs'],{
    cwd:process.cwd(),encoding:'utf8',env:{...env,...(configured?base:{}),...overrides},timeout:15000,
  });
  expect(child.error).toBeUndefined();
  expect(child.stderr).toBe('');
  expect(child.stdout).not.toContain('private-session-file');
  expect(child.stdout).not.toContain('sb_secret_never_emit');
  return {status:child.status,report:JSON.parse(child.stdout)};
}

it('blocks missing authorized Test access without network or browser activity',()=>{
  const r=invoke({},false);expect(r.status).toBe(2);expect(r.report.results[0].status).toBe('BLOCKED');
});
it.each([
  {ADS01_TEST_APP_URL:'https://fairswap.in/'},
  {ADS01_TEST_APP_URL:'http://authorized-test-preview.vercel.app/'},
  {ADS01_TEST_APP_VERIFIED_PROJECT:'kriuhwppxgxsyyrbjsau'},
  {ADS01_TEST_APP_VERIFIED_SHA:'wrong-commit'},
  {ADS01_TEST_PUBLISHABLE_KEY:'sb_secret_never_emit'},
])('fails closed before reading sessions for invalid target/authority %j',overrides=>{
  const r=invoke(overrides);expect(r.status).toBe(1);expect(r.report.results[0].status).toBe('FAIL');
});
