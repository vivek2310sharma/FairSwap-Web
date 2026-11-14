import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';
import{immutableRef,verifySource}from'./verify-ci-source.mjs';
test('CI requires full immutable refs, matching HEAD and reviewed content',()=>{
 for(const ref of[undefined,'','main','staging','refs/heads/main','abc123'])assert.throws(()=>immutableRef(ref),/IMMUTABLE_SHA/);
 const root=mkdtempSync(join(tmpdir(),'wearables-ci-'));try{
  writeFileSync(join(root,'runner'),'reviewed');const ref='a'.repeat(40),manifest={version:1,files:{runner:createHash('sha256').update('reviewed').digest('hex')}};
  assert.equal(verifySource(root,manifest,ref,ref).verified,true);assert.throws(()=>verifySource(root,manifest,ref,'b'.repeat(40)),/COMMIT_MISMATCH/);
  writeFileSync(join(root,'runner'),'old runner');assert.throws(()=>verifySource(root,manifest,ref,ref),/BYTES_MISMATCH/);
 }finally{rmSync(root,{recursive:true});}
});
test('Web CI never passes V1.1 JSON to legacy hardcoded 607-row runners',()=>{
 const yaml=readFileSync(new URL('../../.github/workflows/ci.yml',import.meta.url),'utf8');
 assert.match(yaml,/ref: 4122670aee37dcd859b54d117f9d701ed6758e02/);
 const legacy=yaml.slice(yaml.indexOf('      - name: Require Wearables V1 catalogue'),yaml.indexOf('      - name: Validate immutable Wearables V1.1'));
 assert.match(legacy,/--web="\$PWD\/tests\/wearables-v1\/web-fixture"/);assert.doesNotMatch(legacy,/--web="\$GITHUB_WORKSPACE"/);
 assert.match(yaml,/vars.WEARABLES_V11_BACKEND_SHA/);assert.ok(yaml.indexOf('verify-ci-source.mjs "$BACKEND"')<yaml.indexOf('node "$BACKEND/scripts/ci/test-wearables-v1.mjs" --catalogue-update'));
 assert.match(yaml,/--catalogue-update --pglite-module="\$PG" --web="\$GITHUB_WORKSPACE"/);
});
