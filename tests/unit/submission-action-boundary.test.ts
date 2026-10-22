import {beforeEach, expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {submitListingAction} from '@/app/account/listings/actions';
import {loadSubmissionState} from '@/lib/listings/submission-server';

const m=vi.hoisted(()=>({client:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:m.client}));
vi.mock('@/lib/listings/test-runtime',()=>({isVerifiedPostAdTestEnvironment:()=>true,isVerifiedSubmissionTestEnvironment:()=>true,isVerifiedProductionFamilySubmissionRouteEnvironment:()=>false}));
vi.mock('@/lib/listings/property/server',()=>({isPropertyEnabled:()=>false,savePropertyDraft:vi.fn()}));
vi.mock('@/lib/listings/two-wheeler/server',()=>({saveVehicleDraft:vi.fn()}));
vi.mock('@/lib/listings/post-ad-server',()=>({validatePostAdSelection:vi.fn()}));
vi.mock('@/lib/maintenance/seller-writes',()=>({isSellerWriteMaintenanceEnabled:()=>false,SELLER_WRITE_MAINTENANCE_MESSAGE:'Maintenance'}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/logger',()=>({logger:{info:vi.fn(),warn:vi.fn(),error:vi.fn()}}));

const id='9af48c20-d04d-4422-bf90-50ba5cb56fad';
const generic='Saved submission eligibility could not be verified. Please reload.';
const valid={family:'two-wheelers',enabled:true,policy_key:'test-submission-v1'};
beforeEach(()=>{vi.clearAllMocks();});
function client(eligibility:unknown={data:valid,error:null},submission:unknown={data:{result:'submitted'},error:null},expired=false){
 const rpc=vi.fn(async(name:string)=>{
  if(name==='has_current_policy_acceptance')return {data:true,error:null};
  if(name==='get_seller_submission_status'){
   if(eligibility instanceof Error)throw eligibility;
   return eligibility;
  }
  if(name==='seller_submit_listing')return submission;
  throw Error('Unexpected RPC');
 });
 const from=vi.fn(()=>{throw Error('Unexpected legacy/read fallback');});
 const c={rpc,from,auth:{getUser:vi.fn(async()=>({data:{user:expired?null:{id:'controlled-ordinary-account'}},error:expired?{message:'Expired'}:null}))}};
 m.client.mockResolvedValue(c);
 return c;
}

it.each([
 ['ownership denied',{data:null,error:{code:'42501',message:'Owned listing required'}}],
 ['malformed data',{data:{...valid,enabled:'true'},error:null}],
 ['missing data',{data:null,error:null}],
 ['unexpected eligibility field',{data:{...valid,extra:true},error:null}],
 ['returned transport error',{data:null,error:{code:'FETCH_ERROR',message:'Transport failure'}}],
 ['expired eligibility authentication',{data:null,error:{code:'PGRST303',message:'JWT expired'}}],
])('%s is masked by the real loader and action, with no mutation',async(_label,read)=>{
 const c=client(read);
 await expect(loadSubmissionState(c as unknown as SupabaseClient<Database>,id)).rejects.toThrow(generic);
 expect(await submitListingAction(id,17)).toEqual({error:generic});
 expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_listing',expect.anything());
 expect(c.from).not.toHaveBeenCalled();
});
it('a thrown transport Error is propagated by the action, not relabelled ownership denial',async()=>{
 const c=client(Error('Controlled transport exception'));
 await expect(loadSubmissionState(c as unknown as SupabaseClient<Database>,id)).rejects.toThrow('Controlled transport exception');
 expect(await submitListingAction(id,17)).toEqual({error:'Controlled transport exception'});
 expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_listing',expect.anything());
});
it('expired authentication is rejected by the real policy guard before eligibility/mutation',async()=>{
 const c=client(undefined,undefined,true);
 expect(await submitListingAction(id,17)).toEqual({error:'Please sign in to continue.',requiresPolicyReview:false,redirectTo:'/auth/sign-in?next=%2Faccount%2Flistings'});
 expect(c.rpc).not.toHaveBeenCalled();
});
it('passes the caller saved revision unchanged and exposes the stale RPC application message',async()=>{
 const stale='Saved content or photos changed. Save and reload before submitting; no automatic retry.';
 const c=client(undefined,{data:null,error:{code:'PT409',message:stale}});
 expect(await submitListingAction(id,17)).toEqual({error:stale});
 expect(c.rpc).toHaveBeenCalledWith('seller_submit_listing',{listing_id:id,expected_revision:17});
 expect(c.rpc.mock.calls.filter(([name])=>name==='seller_submit_listing')).toHaveLength(1);
});
it.each([undefined,0,1.5])('invalid saved revision %s stops before mutation',async revision=>{
 const c=client();
 expect(await submitListingAction(id,revision)).toEqual({error:'Save and reload this draft before submitting.'});
 expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_listing',expect.anything());
});
it('valid eligibility is returned by the real loader',async()=>{
 const c=client();expect(await loadSubmissionState(c as unknown as SupabaseClient<Database>,id)).toEqual(valid);
});
it.each([['submitted','Listing submitted for review.'],['already_pending','Already awaiting review.']])('interprets actual %s result through the action return object',async(result,message)=>{
 client(undefined,{data:{result},error:null});
 expect(await submitListingAction(id,17)).toEqual({success:true,listingId:id,message});
});
