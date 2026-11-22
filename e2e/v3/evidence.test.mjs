import test from 'node:test';import assert from 'node:assert/strict';import {build,STEPS} from './evidence.mjs';
const pre={slug:'v2-books',projectRef:'wpppxlnbzqynvhpeuavd',runnerSha:'a'.repeat(40),deployedWebSha:'a'.repeat(40),runId:'12',runAttempt:1,deploymentId:4,testActivationRunId:'15'};
const state={steps:Object.fromEntries(STEPS.map(s=>[s,true])),cleanup:{verified:true,requested:2,retired:2,alreadyInactive:0}};
const report={stats:{expected:3,unexpected:0,skipped:0,flaky:0},errors:[]};
test('only complete, non-skipped real-run inputs can produce evidence',()=>{
 assert.equal(build(pre,state,report).result,'PASS');
 assert.equal(build(pre,state,report).schema,'v3-hosted-e2e/2');
 for(const change of [{skipped:1},{flaky:1},{unexpected:1},{expected:0}])assert.throws(()=>build(pre,state,{...report,stats:{...report.stats,...change}}));
 for(const change of [{slug:'v2-cars'},{projectRef:'production'},{deployedWebSha:'b'.repeat(40)},{runAttempt:0}])assert.throws(()=>build({...pre,...change},state,report));
 assert.throws(()=>build(pre,{...state,cleanup:{verified:false}},report));
 for(const step of STEPS){const steps={...state.steps};delete steps[step];assert.throws(()=>build(pre,{...state,steps},report));}
});
