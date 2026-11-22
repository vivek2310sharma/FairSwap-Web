import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
export const STEPS = ['sessions_upload','ownership_identity','frozen_retry','incomplete_nonpublic','held_nonpublic','clean_auto_publication','buyer_visibility'];
export function build(pre,state,report) {
  if (!['v2-books','v2-tables-chairs'].includes(pre?.slug) || pre.projectRef!=='wpppxlnbzqynvhpeuavd'
    || !/^[a-f0-9]{40}$/.test(pre.deployedWebSha??'') || pre.deployedWebSha!==pre.runnerSha
    || !/^[1-9][0-9]*$/.test(pre.runId??'') || !/^[1-9][0-9]*$/.test(pre.testActivationRunId??'')
    || !Number.isSafeInteger(pre.runAttempt) || pre.runAttempt<1 || !Number.isSafeInteger(pre.deploymentId)
    || report?.stats?.expected!==3 || report.stats.unexpected!==0 || report.stats.skipped!==0 || report.stats.flaky!==0
    || !Array.isArray(report.errors) || report.errors.length || !STEPS.every(s=>state?.steps?.[s]===true)
    || Object.keys(state.steps).length!==STEPS.length || state.cleanup?.verified!==true || state.cleanup.requested!==2
    || state.cleanup.retired+state.cleanup.alreadyInactive!==2) throw Error('V3_EVIDENCE_INCOMPLETE');
  return {schema:'v3-hosted-e2e/1',result:'PASS',...pre,steps:state.steps,cleanup:state.cleanup,generatedAt:new Date().toISOString()};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const dir=process.env.E2E_EVIDENCE_DIR; const name='v3-hosted-e2e.json';
 for(const f of [name,'SHA256SUMS_v3'])rmSync(join(dir,f),{force:true});
 const read=f=>JSON.parse(readFileSync(join(dir,f),'utf8'));
 const receipt=build(read('preflight.json'),read('v3-steps.json'),read('results.json'));
 const body=JSON.stringify(receipt,null,2)+'\n';writeFileSync(join(dir,name),body);
 writeFileSync(join(dir,'SHA256SUMS_v3'),createHash('sha256').update(body).digest('hex')+'  '+name+'\n');
}
