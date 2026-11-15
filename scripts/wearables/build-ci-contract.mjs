// Reproduce consumed Web fixtures and cross-repository CI content pins.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{resolve,dirname}from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const web=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),backend=resolve(process.argv.find(a=>a.startsWith('--backend='))?.slice(10)??resolve(web,'../FairSwap-Backend')),check=process.argv.includes('--check');
const sum=d=>createHash('sha256').update(d).digest('hex'),out={},fixture='tests/wearables-v11/web-fixture';
const paths=['src/lib/listings/wearables/catalogue.generated.json','scripts/wearables/name-key.mjs'];
for(const p of paths)out[resolve(backend,fixture,p)]=readFileSync(resolve(web,p));
out[resolve(backend,fixture,'package.json')]=readFileSync(resolve(backend,'tests/wearables-v1/web-fixture/package.json'));
out[resolve(backend,'supabase/forward-migrations/wearables-v11/web-ci-contract.json')]=JSON.stringify({version:1,webBase:'c0f2d7fcdb9614a5d762df46b8121ce596267594',revision:JSON.parse(readFileSync(resolve(web,paths[0]))).revision,files:Object.fromEntries(paths.map(p=>[p,sum(readFileSync(resolve(web,p)))]))},null,2)+'\n';
const files=['scripts/ci/test-wearables-v1.mjs','scripts/ci/test-wearables-tablets-v1.mjs','scripts/ci/posting-v2-fixture.mjs','scripts/release/wearables-v11-release.mjs','supabase/forward-migrations/wearables-v11/catalogue-manifest.json','supabase/forward-migrations/wearables-v11/supabase/migrations/20261111195641_wearables_v11_catalogue.sql','tests/wearables-v1/web-fixture/src/lib/listings/wearables/catalogue.generated.json',...paths.map(p=>fixture+'/'+p)];
out[resolve(web,'scripts/wearables/backend-ci-contract.json')]=JSON.stringify({version:1,backendBase:'4122670aee37dcd859b54d117f9d701ed6758e02',files:Object.fromEntries(files.map(p=>[p,sum(out[resolve(backend,p)]??readFileSync(resolve(backend,p)))]))},null,2)+'\n';
for(const[path,data]of Object.entries(out)){if(check){if(!readFileSync(path).equals(Buffer.from(data)))throw Error('STALE: '+path);}else{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}}
console.log(`CI source contracts ${check?'verified':'generated'}`);
