/** Local browser fixture only. Never imports real environment files or sends backend requests. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {randomUUID} from 'node:crypto';
// Never reuse an unrelated service that happens to own the fixture port.
const port=await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>resolve(port));});});
const fixtureId=randomUUID();
const repo=process.cwd();const fixture=await fs.mkdtemp(path.join(os.tmpdir(),'fairswap-post-ad-v2-'));
const copy=async name=>fs.cp(path.join(repo,name),path.join(fixture,name),{recursive:true});
await copy('src');await copy('public');
for(const f of ['package.json','tsconfig.json','postcss.config.mjs','AGENTS.md'])await copy(f);
await fs.symlink(path.join(repo,'node_modules'),path.join(fixture,'node_modules'),'dir');
// Discard only the freshly copied API tree; all unmatched fixture requests fail closed.
await fs.rm(path.join(fixture,'src/app/api'),{recursive:true});
await fs.mkdir(path.join(fixture,'src/app/api/[...path]'),{recursive:true});
await fs.writeFile(path.join(fixture,'src/app/api/[...path]/route.ts'),'export function GET(){return Response.json({error:"Unmocked fixture API"},{status:503})} export const POST=GET; export const DELETE=GET;');
await fs.writeFile(path.join(fixture,'src/proxy.ts'),`import {NextResponse} from "next/server";export function proxy(){const r=NextResponse.next();r.headers.set('x-fairswap-fixture','${fixtureId}');return r}`);
await fs.writeFile(path.join(fixture,'next.config.mjs'),'export default {devIndicators:false};');
const edit=async(name,fn)=>{const p=path.join(fixture,name);await fs.writeFile(p,fn(await fs.readFile(p,'utf8')));};
// Fonts remain untouched in production. The offline browser fixture uses system fallback.
await edit('src/app/layout.tsx',s=>s.replace('import { Manrope, Noto_Sans_Devanagari } from "next/font/google";','').replace(/const manrope =[\s\S]*?\n\}\);/,'').replace('className={`${manrope.variable} ${notoDevanagari.variable} h-full antialiased`}','className="h-full antialiased"'));
await fs.writeFile(path.join(fixture,'src/components/providers/AuthProvider.tsx'),'"use client"; export function AuthProvider({children}:{children:React.ReactNode}){return children} export function useAuth(){return {user:{id:"11111111-1111-4111-8111-111111111111"},isLoading:false,unreadMessagesCount:0,unreadNotificationsCount:0,refreshUnreadCounts:async()=>{},signOut:async()=>{}}}');
const id='11111111-1111-4111-8111-111111111111',brand='22222222-2222-4222-8222-222222222222',model='33333333-3333-4333-8333-333333333333',city='55555555-5555-4555-8555-555555555555';
const catalogue={version:2,revision:'automated-fixture',listing_category_id:id,selection:{category:'mobiles',subcategory:'mobile-phones',version:2},enabled:true,brands:[{id:brand,name:'Apple',aliases:['iPhone'],sort_order:1}],models:[{id:model,brand_id:brand,name:'iPhone 15',aliases:[],older_group:false,other:false,sort_order:1}]};
// Reuse the approved test-only taxonomy; only the phone specialist is enabled here.
const taxonomy=JSON.parse(await fs.readFile(path.join(repo,'tests/unit/taxonomy-v2-fixture.json'),'utf8'));
for(const node of taxonomy.nodes){
 if(node.parent_id!==null){
  const phone=node.slug==='mobile-phones';
  if(phone)node.id=catalogue.listing_category_id;
  node.status=phone?'live':'coming_soon';
  node.posting_enabled=phone;
 }
}
await fs.writeFile(path.join(fixture,'src/lib/supabase/server.ts'),`import {cookies} from "next/headers";
const catalogue=${JSON.stringify(catalogue)};
const taxonomy=${JSON.stringify(taxonomy)};
export async function createClient(){
 const c=await cookies();
 return {
  auth:{getUser:async()=>({data:{user:c.get('fixture-auth')?.value==='denied'?null:{id:'${id}'}},error:null})},
  rpc:async(name:string)=>{
   if(name==='get_category_catalogue_v2'){
    const failure=c.get('fixture-taxonomy')?.value;
    if(failure==='error')return {data:null,error:{message:'Fixture taxonomy unavailable'}};
    return {data:failure==='malformed'?{...taxonomy,nodes:taxonomy.nodes.slice(1)}:taxonomy,error:null};
   }
   if(name==='posting_v2_catalogue')return {data:catalogue,error:null};
   if(name==='accessories_v1_catalogue')return {data:{version:1,revision:'accessories-v1',enabled:true,listing_category_id:'${id}'},error:null};
   if(name==='tablets_v1_catalogue'||name==='wearables_v1_catalogue')return {data:null,error:null};
   return {data:null,error:{message:'Unmocked fixture RPC'}};
  },
  from:(table:string)=>{const data=table==='posting_category_definitions'?[{listing_category_id:catalogue.listing_category_id,enabled:true}]:table==='tablet_release_v1'?[]:table==='cities'?[{id:'${city}',name:'Bengaluru',state:'Karnataka',is_active:true}]:table==='categories'?[{id:'${id}',name:'Electronics',slug:'electronics',macro_category:'goods',is_active:true,new_listing_enabled:true,sort_order:1}]:[];const q:any={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,maybeSingle:async()=>({data:data[0]??null,error:null}),then:(resolve:any)=>Promise.resolve({data,error:null}).then(resolve)};return q}
 }
}`);
await edit('src/lib/listings/mobiles/server.ts',s=>s.replace(/export function mobilesEnabled\(\) \{[^}]*\}/,'export function mobilesEnabled() { return true; }'));
await edit('src/lib/listings/post-ad-server.ts',s=>s.replace(/export function isGoodsPostAdEnabled\(\) \{[^}]*\}/,'export function isGoodsPostAdEnabled() { return true; }'));
await edit('src/lib/listings/two-wheeler/server.ts',s=>s.replace(/export function isTwoWheelerEnabled\(\) \{[^}]*\}/,'export function isTwoWheelerEnabled(){return false}').replace(/export function isCarsEnabled\(\) \{[^}]*\}/,'export function isCarsEnabled(){return false}'));
await edit('src/lib/listings/property/server.ts',s=>s.replace(/export const isPropertyEnabled=.*?;/,'export const isPropertyEnabled=()=>false;'));
await fs.writeFile(path.join(fixture,'src/app/account/listings/[id]/edit/page.tsx'),'export default function Confirm(){return <h1>Submitted for review</h1>}');
await fs.writeFile(path.join(fixture,'playwright.config.ts'),`import base from ${JSON.stringify(path.join(repo,'tests/browser/post-ad-v2.config.ts'))};export default {...base,testDir:${JSON.stringify(path.join(repo,'tests/browser'))},use:{...base.use,baseURL:'http://127.0.0.1:${port}'}};`);
const log=await fs.open(path.join(fixture,'next.log'),'w');
const server=spawn(process.execPath,[path.join(repo,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{detached:true,cwd:fixture,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',POST_AD_MOBILES_V2_ENABLED:'true',POST_AD_TABLETS_V1_ENABLED:'false',POST_AD_WEARABLES_V1_ENABLED:'false'},stdio:['ignore',log.fd,log.fd]});
try{let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('Fixture server exited; see '+fixture+'/next.log');try{const r=await fetch(`http://127.0.0.1:${port}/account/listings/new`);if(r.ok&&r.headers.get('x-fairswap-fixture')===fixtureId){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Fixture did not start; see '+fixture+'/next.log');
 const test=spawn('corepack',['pnpm','exec','playwright','test','--config',path.join(fixture,'playwright.config.ts'),...process.argv.slice(2)],{cwd:repo,stdio:'inherit'});const code=await new Promise(resolve=>test.on('exit',resolve));if(code)process.exitCode=Number(code)||1;
}finally{try{process.kill(-server.pid,'SIGTERM');}catch{}await Promise.race([new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))]);await log.close();console.log('Isolated fixture (no environment files): '+fixture);}
