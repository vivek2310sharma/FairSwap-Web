import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import ids from './categories.json';
import {join} from 'node:path';
import {expect,test} from '@playwright/test';
import sharp from 'sharp';
import {loadEnv,signIn,anonApi,anonClient,upgradeToAal2,type Actor} from '../wearables/helpers';
import {retireListings,scanSearchPages} from '../wearables/cleanup.mjs';
import {selectedGoodsSubmission,type GoodsDefinition,type GoodsSubmission} from '../../src/lib/listings/ordinary-goods/contract';

const slug=process.env.V3_SLUG!;
const categoryId = (ids as Record<string,string>)[slug];
if(!Object.hasOwn(ids,slug))throw Error('V3_REVIEWED_CATEGORY_REQUIRED');
let env:ReturnType<typeof loadEnv>,seller:Actor,buyer:Actor,moderator:Actor,anon:Awaited<ReturnType<typeof anonApi>>,sb:ReturnType<typeof anonClient>;
const fixtureDir = process.env.E2E_V3_FIXTURE_DIR ?? new URL('./fixtures', import.meta.url).pathname;
type Listing = {id:string;seller_id:string;status:string;title:string;revision:number;slug:string|null};
type Sample = {session:string;media:string;flagged:boolean;payload:ReturnType<ReturnType<typeof selectedGoodsSubmission>['parse']>;id?:string};
type State = {steps:Record<string,true>;cleanup?:{verified:boolean;requested:number;retired:number;alreadyInactive:number}};
let definition:GoodsDefinition,place:Pick<GoodsSubmission,'pin_code'|'city_id'|'locality_id'>;
const samples:Sample[]=[];const registered={ids:[] as string[],titles:[] as string[]};
const state:State={steps:{}};
const save=()=>writeFileSync(join(env.evidenceDir,'v3-steps.json'),JSON.stringify(state));
const mark=(...names:string[])=>{for(const n of names)state.steps[n]=true;save();};
const base=`/api/post-ad/goods/${slug}`;
const own=async(id:string)=>{const r=await seller.client.from('listings').select('id,seller_id,status,title,revision,slug').eq('id',id).single();expect(r.error).toBeNull();return r.data!;};
const workflow=async(id:string)=>{const r=await seller.client.rpc('get_seller_moderation_workflow_status',{listing_id:id});expect(r.error).toBeNull();return r.data;};
const search=async(client:Actor['client'],page=1)=>{const r=await client.rpc('search_public_listings',{query:null,category_slug:slug,city_id:null,locality_id:null,condition:null,price_min:null,price_max:null,sort:'newest',page,per_page:12});expect(r.error).toBeNull();return r.data;};
const hidden=async(id:string)=>{for(const c of [buyer.client,sb]){const r=await c.from('listings').select('id').eq('id',id);expect(r.error).toBeNull();expect(r.data).toEqual([]);}};
const review=async(a:Actor,l:Pick<Sample,'id'>)=>{const row=await own(l.id!);return a.client.rpc('moderate_listing_reviewed',{listing_id:l.id,action:'approve',reason:'Synthetic V3 hosted Test guard check',expected_revision:row.revision,expected_status:row.status});};

test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{
 env=loadEnv();
 if(!env.anonKey.startsWith('sb_publishable_')){const claims=JSON.parse(Buffer.from(env.anonKey.split('.')[1]??'', 'base64url').toString());expect(claims.role).toBe('anon');}
 [seller,buyer,moderator]=await Promise.all([signIn(env,'seller',env.seller),signIn(env,'buyer',env.buyer),signIn(env,'moderator',env.moderator)]);
 expect(new Set([seller.userId,buyer.userId,moderator.userId]).size).toBe(3);
 await upgradeToAal2(moderator,env.moderator.totpSecret);
 anon=await anonApi(env);sb=anonClient(env);
 const d=await seller.client.rpc('ordinary_goods_v3',{slug});expect(d.error).toBeNull();definition=d.data;
 expect(definition.category_id).toBe(categoryId);expect(definition.revision).toBe(1);
 const loc=await (await seller.api().get('/api/location/pincode/560034')).json();expect(loc.localities.length).toBeGreaterThan(0);
 place={pin_code:'560034',city_id:loc.city_id,locality_id:loc.localities[0].id};
});

test.afterAll(async()=>{
 test.setTimeout(300000);
 try{
  const result=await retireListings({sellerId:seller?.userId,ids:registered.ids,titles:registered.titles},{
   readOwn:async q=>{const map=new Map<string,Listing>();for(const [key,values]of [['id',q.ids],['title',q.titles]] as const){if(!values.length)continue;const r=await seller.client.from('listings').select('id,seller_id,status,title,revision,slug').eq('seller_id',seller.userId).in(key,values);expect(r.error).toBeNull();for(const row of r.data??[])map.set(row.id,row);}return [...map.values()];},
   ensureModeratorAal2:async()=>{if(await moderator.aal()!=='aal2')await upgradeToAal2(moderator,env.moderator.totpSecret);},
   remove:async row=>({error:(await moderator.client.rpc('moderate_listing_reviewed',{listing_id:row.id,action:'remove',reason:'Synthetic V3 hosted Test cleanup',expected_revision:row.revision,expected_status:row.status})).error}),
   discoverable:async rows=>{const wanted=new Set(rows.map(r=>r.id));const leaked=new Set<string>();for(const c of [buyer.client,sb]){const r=await c.from('listings').select('id').in('id',[...wanted]);expect(r.error).toBeNull();for(const x of r.data??[])leaked.add(x.id);for(const id of await scanSearchPages(p=>search(c,p),wanted))leaked.add(id);}for(const r of rows){if(r.slug){const response=await anon.get(`/listings/${r.slug}`);if(response.status()===200&&(await response.text()).includes(r.title))leaked.add(r.id);}}return [...leaked];},sleep:ms=>new Promise(r=>setTimeout(r,ms))});
  state.cleanup={verified:true,requested:registered.ids.length,retired:result.retired.length,alreadyInactive:result.alreadyInactive.length};save();
 }finally{await Promise.all([seller?.api().dispose(),buyer?.api().dispose(),moderator?.api().dispose(),anon?.dispose()]);}
});

test('real Test identities, seller-owned upload and authorization boundaries',async()=>{
 expect((await anon.post(`${base}/sessions`,{data:{session_id:randomUUID()}})).status()).not.toBe(200);
 // Cross-account ownership isolation: buyer can start their own session, but cannot access seller session or media
 const buyerSession=randomUUID();
 const buyerOwnRes=await buyer.api().post(`${base}/sessions`,{data:{session_id:buyerSession}});
 expect(buyerOwnRes.status()).toBe(200);
 expect((await buyerOwnRes.json()).session.owner_id).toBe(buyer.userId);
 for(const flagged of [false,true]){
  const session=randomUUID(),media=randomUUID();const res=await seller.api().post(`${base}/sessions`,{data:{session_id:session}});expect(res.status()).toBe(200);expect((await res.json()).session.owner_id).toBe(seller.userId);
  const fixture = JSON.parse(readFileSync(join(fixtureDir,slug+'.json'),'utf8')) as {title:string;description:string;answers:Record<string,string|number|boolean>};
  const image=flagged?await sharp(Buffer.from('<svg width="800" height="400"><rect width="800" height="400" fill="white"/><text x="20" y="100" font-size="42">Pay advance before viewing</text><text x="20" y="180" font-size="42">Share UPI PIN and OTP</text></svg>')).png().toBuffer():readFileSync(join(fixtureDir,slug+'.png'));
  const url=`${base}/sessions/${session}/media`;
  expect((await anon.get(url)).status()).not.toBe(200);
  expect((await buyer.api().get(url)).status()).not.toBe(200);
  expect((await buyer.api().post(url,{multipart:{media_id:randomUUID(),file:{name:'probe.png',mimeType:'image/png',buffer:image}}})).status()).not.toBe(200);
  expect((await seller.api().post(url,{multipart:{media_id:media,file:{name:'synthetic.png',mimeType:'image/png',buffer:image}}})).status()).toBe(200);
  const snapshot=await(await seller.api().get(url)).json();const ready=snapshot.media.find((m:{id:string;state:string;url:string})=>m.id===media);expect(ready.state).toBe('ready');
  const bytes=await fetch(ready.url);expect(bytes.status).toBe(200);expect((await sharp(Buffer.from(await bytes.arrayBuffer())).metadata()).format).toBe('webp');
  samples.push({session,media,flagged,payload:selectedGoodsSubmission(definition).parse({slug,category_id:categoryId,revision:1,session_id:session,title:`${fixture.title} ${randomUUID().replace(/[0-9-]/g,'x').slice(0,12)}`,description:fixture.description,condition:'good',price_type:'fixed',price_paise:12500,...place,answers:{...fixture.answers,safety_confirmed:true,power_safe:true,defects:''},media_ids:[media]})});
 }
 mark('sessions_upload','ownership_authorization');
});

test('real prepare freezes payload; submit and retry preserve one listing; incomplete checks cannot publish',async()=>{
 for(const l of samples){
  const prepared=await seller.client.rpc('ordinary_goods_prepare_v3',{payload:l.payload});expect(prepared.error).toBeNull();
  expect((await seller.client.rpc('ordinary_goods_prepare_v3',{payload:{...l.payload,description:'A different frozen description'}})).error).not.toBeNull();
  for(const a of [buyer.api(),anon])expect((await a.post(`${base}/submit`,{data:l.payload})).status()).not.toBe(200);
  registered.titles.push(l.payload.title);
  const res=await seller.api().post(`${base}/submit`,{data:l.payload});expect(res.status()).toBe(200);l.id=((await res.json()) as {listing_id:string}).listing_id;registered.ids.push(l.id);
  expect((await own(l.id)).seller_id).toBe(seller.userId);
  if(l.flagged){
   expect(['running','retrying']).toContain((await workflow(l.id)).workflow_state);await hidden(l.id);
   expect((await review(moderator,l)).error).not.toBeNull();await hidden(l.id);mark('incomplete_nonpublic');
  }
  const retry=await seller.api().post(`${base}/submit`,{data:l.payload});expect(retry.status()).toBe(200);expect((await retry.json()).listing_id).toBe(l.id);
  for(const a of [seller,buyer]){const r=await a.client.from('listings').update({status:'active'}).eq('id',l.id).select('id');expect(r.error||r.data?.length===0).toBeTruthy();expect((await review(a,l)).error).not.toBeNull();}
 }
 mark('frozen_retry');
});

test('genuine clean automatic approval, held fraud fixture, buyer discovery and no staff bypass',async()=>{
 test.setTimeout(600000);
 const clean=samples[0],held=samples[1];
 await expect.poll(async()=>{const s=await workflow(clean.id!);return s.workflow_state==='published'&&s.provenance==='automatic';},{timeout:300000,intervals:[5000]}).toBe(true);
 expect((await own(clean.id!)).status).toBe('active');mark('clean_auto_publication');
 // Require actual processed flagged evidence, never treat an indefinitely queued scan as a flag.
 await expect.poll(async()=>(await workflow(held.id!)).workflow_state,{timeout:180000,intervals:[5000]}).toBe('flagged');
 expect((await own(held.id!)).status).toBe('pending_review');await hidden(held.id!);
 if(await moderator.aal()!=='aal2')await upgradeToAal2(moderator,env.moderator.totpSecret);expect(await moderator.aal()).toBe('aal2');expect((await review(moderator,held)).error).not.toBeNull();await hidden(held.id!);mark('held_nonpublic');
 for(const c of [buyer.client,sb]){const result=await scanSearchPages(p=>search(c,p),new Set([clean.id!,held.id!]));expect(result.has(clean.id!)).toBe(true);expect(result.has(held.id!)).toBe(false);}
 const row=await own(clean.id!);const page=await anon.get(`/listings/${row.slug}`);expect(page.status()).toBe(200);expect(await page.text()).toContain(clean.payload.title);mark('buyer_visibility');
});
