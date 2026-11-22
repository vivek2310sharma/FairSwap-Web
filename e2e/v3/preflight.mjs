import {readFileSync as readCategories} from 'node:fs';
const categories=JSON.parse(readCategories(new URL('./categories.json',import.meta.url),'utf8'));
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const e=process.env;
if(e.GITHUB_REPOSITORY!=='vivek2310sharma/FairSwap-Web'||e.GITHUB_REF!=='refs/heads/staging'||e.GITHUB_EVENT_NAME!=='workflow_dispatch'
 ||!Object.hasOwn(categories,e.V3_SLUG??'')||!/^https:\/\/wpppxlnbzqynvhpeuavd\.supabase\.co\/?$/.test(e.E2E_SUPABASE_URL??'')
 ||!e.GITHUB_TOKEN||!e.E2E_EVIDENCE_DIR||!/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??'')||!/^[1-9][0-9]*$/.test(e.TEST_ACTIVATION_RUN_ID??'')
 ||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==e.GITHUB_SHA)throw Error('V3_TEST_CONTEXT_REQUIRED');
const get=async path=>{const r=await fetch('https://api.github.com/repos/'+e.GITHUB_REPOSITORY+'/'+path,{headers:{Authorization:'Bearer '+e.GITHUB_TOKEN,Accept:'application/vnd.github+json'}});if(!r.ok)throw Error('V3_DEPLOYMENT_UNAVAILABLE');return r.json();};
const deployments=await get('deployments?environment=Preview&per_page=1');const d=deployments[0];
if(d?.sha!==e.GITHUB_SHA||d.environment!=='Preview'||d.production_environment===true||![e.GITHUB_SHA,'staging'].includes(d.ref))throw Error('V3_EXACT_TEST_DEPLOYMENT_REQUIRED');
const statuses=await get(`deployments/${d.id}/statuses?per_page=1`);const s=statuses[0];
const baseUrl=s?.environment_url??s?.target_url;
if(s?.state!=='success'||!/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(baseUrl??''))throw Error('V3_READY_DEPLOYMENT_REQUIRED');
mkdirSync(e.E2E_EVIDENCE_DIR,{recursive:true});
writeFileSync(join(e.E2E_EVIDENCE_DIR,'preflight.json'),JSON.stringify({slug:e.V3_SLUG,projectRef:'wpppxlnbzqynvhpeuavd',runnerSha:e.GITHUB_SHA,deployedWebSha:e.GITHUB_SHA,deploymentId:d.id,baseUrl,runId:e.GITHUB_RUN_ID,runAttempt:Number(e.GITHUB_RUN_ATTEMPT),testActivationRunId:e.TEST_ACTIVATION_RUN_ID}));
