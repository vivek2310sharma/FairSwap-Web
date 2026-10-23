// Read-only acceptance runner. Never creates users/listings or prints session material.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { checkoutRelease, verifyDeployment } from './ads01-release-authority.mjs';

const testApi = 'https://wpppxlnbzqynvhpeuavd.supabase.co';
const project = 'wpppxlnbzqynvhpeuavd';
let release = null;
const tabs = [['all','All',null],['active','Active',['active','reserved']],['pending_review','Under review',['pending_review']],
  ['draft','Drafts',['draft']],['rejected','Needs action',['rejected']],['paused','Paused',['paused']],['expired','Expired',['expired']],['sold','Sold',['sold']]];
const results = [];
const requireThat = condition => { if (!condition) throw new Error('Acceptance assertion failed'); };
const run = async (name, action) => {
  try { await action(); results.push({name,status:'PASS'}); }
  catch { results.push({name,status:'FAIL'}); }
};
const blocked = name => results.push({name,status:'BLOCKED'});
const report = () => {
  console.log(JSON.stringify({releaseCandidate:release,target:'FairSwapTest only',results},null,2));
  process.exitCode = results.some(x=>x.status==='FAIL') ? 1 : results.some(x=>x.status==='BLOCKED') ? 2 : 0;
};

async function main() {
  release = checkoutRelease();
  const app = process.env.ADS01_TEST_APP_URL;
  const key = process.env.ADS01_TEST_PUBLISHABLE_KEY;
  const paths = [process.env.ADS01_TEST_SELLER_A_STATE,process.env.ADS01_TEST_SELLER_B_STATE];
  if (!app || !key || paths.some(x=>!x)) { blocked('Supply exact-commit Test preview, public key and two authorized seller storage states'); report(); return; }
  const origin = new URL(app);
  requireThat(origin.protocol==='https:' && origin.hostname.endsWith('.vercel.app') && !origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname==='/');
  // Legacy assertions can veto a run, but never establish release/deployment authority.
  requireThat(!process.env.ADS01_TEST_APP_VERIFIED_SHA || process.env.ADS01_TEST_APP_VERIFIED_SHA===release);
  requireThat(!process.env.ADS01_TEST_APP_VERIFIED_PROJECT || process.env.ADS01_TEST_APP_VERIFIED_PROJECT===project);
  if (!key.startsWith('sb_publishable_')) {
    requireThat(key.startsWith('eyJ') && JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon');
  }
  if (!process.env.ADS01_TEST_VERCEL_TOKEN) {
    blocked('Authenticated Vercel deployment metadata access required; environment attestations are insufficient'); report(); return;
  }
  await verifyDeployment(origin.hostname, release, process.env.ADS01_TEST_VERCEL_TOKEN);
  const sellers = [];
  for (const [index,path] of paths.entries()) {
    const state = JSON.parse(readFileSync(path,'utf8'));
    const name = `sb-${project}-auth-token`;
    const chunks = state.cookies.filter(c=>c.name===name || c.name.startsWith(name+'.'))
      .sort((a,b)=>Number(a.name.split('.').at(-1)||0)-Number(b.name.split('.').at(-1)||0));
    requireThat(chunks.length>0);
    const raw = chunks.map(c=>c.value).join('');
    const session = JSON.parse(raw.startsWith('base64-') ? Buffer.from(raw.slice(7),'base64url').toString() : raw);
    const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url'));
    requireThat(claims.role==='authenticated' && claims.iss===`${testApi}/auth/v1` && claims.exp>Date.now()/1000+1200);
    const client = createClient(testApi,key,{auth:{persistSession:false,autoRefreshToken:false,storageKey:`ads01-readonly-${index}`},
      global:{headers:{Authorization:`Bearer ${session.access_token}`}}});
    const auth = await client.auth.getUser(session.access_token);
    requireThat(!auth.error && auth.data.user?.id===claims.sub);
    sellers.push({client,state,id:auth.data.user.id});
  }
  requireThat(sellers[0].id!==sellers[1].id);
  const counts = async (client,id,statuses) => {
    let query = client.from('listings').select('id',{count:'exact',head:true}).eq('seller_id',id);
    if (statuses) query=query.in('status',statuses);
    const result=await query;
    requireThat(!result.error && Number.isSafeInteger(result.count));
    return result.count;
  };
  const browser=await chromium.launch();
  try {
    let reservedFixture=false, rejectedFixture=false, paginationFixture=false;
    for (const [index,seller] of sellers.entries()) {
      const label=`seller ${index+1}`;
      const expected={};
      for(const [tab,,statuses] of tabs) expected[tab]=await counts(seller.client,seller.id,statuses);
      const foreign=sellers[1-index];
      if(await counts(seller.client,seller.id,['draft','pending_review','paused','rejected','removed'])===0) blocked(`${label}: existing private fixture required`);
      await run(`${label}: foreign private rows and HEAD counts denied`,async()=>{
        const query=await seller.client.from('listings').select('id',{count:'exact'})
          .eq('seller_id',foreign.id).in('status',['draft','pending_review','paused','rejected','removed']).range(0,9);
        requireThat(query.error?.code==='42501' || (!query.error && query.count===0 && query.data.length===0));
        const head=await seller.client.from('listings').select('id',{count:'exact',head:true})
          .eq('seller_id',foreign.id).in('status',['draft','pending_review','paused','rejected','removed']);
        requireThat(head.error?.code==='42501' || (!head.error && head.count===0));
      });
      const context=await browser.newContext({storageState:seller.state,viewport:{width:360,height:800}});
      const page=await context.newPage();
      const url=(tab,pageNumber=1)=>`${origin.origin}/account/listings?status=${tab}&page=${pageNumber}`;
      try {
        for(const [tab,labelText] of tabs) await run(`${label}: ${tab} count and first-page rows`,async()=>{
          await page.goto(url(tab));
          await page.getByRole('heading',{name:'My Listings',exact:true}).waitFor();
          const link=page.locator(`#my-ads-tab-${tab}`);
          requireThat((await link.textContent()).replace(/\s+/g,' ').trim()===`${labelText} ${expected[tab]}`);
          requireThat(await link.getAttribute('aria-current')==='page');
          let query=seller.client.from('listings').select('title,seller_id').eq('seller_id',seller.id);
          const statuses=tabs.find(x=>x[0]===tab)[2]; if(statuses) query=query.in('status',statuses);
          const rows=await query.order('updated_at',{ascending:false}).order('id',{ascending:false}).range(0,9);
          requireThat(!rows.error && rows.data.every(row=>row.seller_id===seller.id));
          requireThat(JSON.stringify(await page.locator('h2').allTextContents())===JSON.stringify(rows.data.map(row=>row.title)));
        });
        await run(`${label}: Active includes Reserved and Needs action includes rejected`,async()=>{
          const active=await counts(seller.client,seller.id,['active']);
          const reserved=await counts(seller.client,seller.id,['reserved']);
          const rejected=await counts(seller.client,seller.id,['rejected']);
          requireThat(expected.active===active+reserved && expected.rejected===rejected);
          reservedFixture ||= reserved>0; rejectedFixture ||= rejected>0;
          if(reserved>0){
            const group=await seller.client.from('listings').select('status').eq('seller_id',seller.id)
              .in('status',['active','reserved']).order('updated_at',{ascending:false}).order('id',{ascending:false}).range(0,999);
            requireThat(!group.error);
            const at=group.data.findIndex(row=>row.status==='reserved');
            if(at<0) blocked(`${label}: Reserved fixture lies outside bounded acceptance scan`);
            else {await page.goto(url('active',Math.floor(at/10)+1));await page.getByText('Reserved',{exact:true}).first().waitFor();}
          }
        });
        if(expected.all>10) await run(`${label}: second ten-item page and exact total`,async()=>{
          paginationFixture=true;
          await page.goto(url('all',2));
          const rows=await seller.client.from('listings').select('title').eq('seller_id',seller.id)
            .order('updated_at',{ascending:false}).order('id',{ascending:false}).range(10,19);
          requireThat(!rows.error);
          requireThat(JSON.stringify(await page.locator('h2').allTextContents())===JSON.stringify(rows.data.map(row=>row.title)));
          const nav=page.getByRole('navigation',{name:'Pagination Navigation'});
          requireThat((await nav.textContent()).replace(/\s+/g,' ').includes(`of ${expected.all} results`));
        });
        for(const width of [320,360,390]) await run(`${label}: ${width}px deep-link and history`,async()=>{
          await page.setViewportSize({width,height:800}); await page.goto(url('sold'));
          await page.waitForFunction(()=>{const el=document.querySelector('#my-ads-tab-sold');if(!el)return false;const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;});
          requireThat(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
          await page.locator('#my-ads-tab-all').click(); await page.waitForURL(/\/account\/listings$/);
          await page.locator('#my-ads-tab-draft').click(); await page.waitForURL(/status=draft$/);
          await page.goBack(); requireThat(new URL(page.url()).search==='');
          await page.goForward(); requireThat(new URL(page.url()).searchParams.get('status')==='draft');
        });
      } finally { await context.close(); }
    }
    if(!reservedFixture) blocked('Authorized existing Reserved fixture required for non-empty grouping acceptance');
    if(!rejectedFixture) blocked('Authorized existing rejected fixture required for non-empty Needs action acceptance');
    if(!paginationFixture) blocked('One authorized seller needs more than ten existing listings');
    await run('Unauthenticated browser redirects to sign-in',async()=>{
      // Retain authorized Preview protection access, but remove all Supabase sessions.
      const context=await browser.newContext({storageState:{
        cookies:sellers[0].state.cookies.filter(cookie=>!cookie.name.startsWith('sb-')),origins:[],
      }});
      try {const page=await context.newPage();await page.goto(`${origin.origin}/account/listings`);requireThat(new URL(page.url()).pathname==='/auth/sign-in');}
      finally {await context.close();}
    });
  } finally {await browser.close();}
  report();
}
main().catch(()=>{results.push({name:'Preflight/session/target check failed; no sensitive details emitted',status:'FAIL'});report();});
