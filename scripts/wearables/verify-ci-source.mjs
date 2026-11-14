import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function immutableRef(ref){if(typeof ref!=='string'||!/^[a-f0-9]{40}$/.test(ref))throw Error('WEARABLES_CI_IMMUTABLE_SHA_REQUIRED');return ref;}
export function verifySource(root,manifest,ref,head){
 immutableRef(ref);
 if(head!==ref||manifest.version!==1||!manifest.files||!Object.keys(manifest.files).length)throw Error('WEARABLES_CI_SOURCE_COMMIT_MISMATCH');
 for(const [name,expected]of Object.entries(manifest.files)){
  const path=resolve(root,name),rel=relative(resolve(root),path);
  if(rel.startsWith('..')||rel.startsWith('/')||!/^[a-f0-9]{64}$/.test(expected))throw Error('WEARABLES_CI_INVALID_CONTRACT');
  if(createHash('sha256').update(readFileSync(path)).digest('hex')!==expected)throw Error(`WEARABLES_CI_SOURCE_BYTES_MISMATCH: ${name}`);
 }
 return{verified:true,commit:ref,files:Object.keys(manifest.files).length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]==='--ref-only')immutableRef(args[1]);
 else{const[root,contract,ref]=args;const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();console.log(JSON.stringify(verifySource(root,JSON.parse(readFileSync(contract)),ref,head)));}
}
