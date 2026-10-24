import {beforeEach,expect,it,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {submitListingAction} from '@/app/account/listings/actions';
import {loadSubmissionState} from '@/lib/listings/submission-server';

const m=vi.hoisted(()=>({client:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:m.client}));
vi.mock('@/lib/listings/test-runtime',()=>({
  isVerifiedPostAdTestEnvironment:()=>false,
  isVerifiedSubmissionTestEnvironment:()=>false,
  isVerifiedProductionFamilySubmissionRouteEnvironment:()=>true,
  isVerifiedProductionFamilyLaunchEnvironment:(_env:unknown,family:string)=>family==='cars',
}));
vi.mock('@/lib/listings/property/server',()=>({isPropertyEnabled:()=>false,savePropertyDraft:vi.fn()}));
vi.mock('@/lib/listings/two-wheeler/server',()=>({saveVehicleDraft:vi.fn()}));
vi.mock('@/lib/listings/post-ad-server',()=>({validatePostAdSelection:vi.fn()}));
vi.mock('@/lib/maintenance/seller-writes',()=>({
  isSellerWriteMaintenanceEnabled:()=>false,SELLER_WRITE_MAINTENANCE_MESSAGE:'Maintenance',
}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/lib/logger',()=>({logger:{info:vi.fn(),warn:vi.fn(),error:vi.fn()}}));

const listingId='9af48c20-d04d-4422-bf90-50ba5cb56fad';
const valid={family:'cars',enabled:true,policy_key:'production-reviewed-v1'};
beforeEach(()=>vi.clearAllMocks());

function owner(eligibility:unknown={data:valid,error:null},submit:unknown={data:{result:'submitted'},error:null}){
  const rpc=vi.fn(async(name:string)=>{
    if(name==='has_current_policy_acceptance')return {data:true,error:null};
    if(name==='get_seller_production_submission_status')return eligibility;
    if(name==='seller_submit_family_listing')return submit;
    throw Error('Unexpected RPC '+name);
  });
  const from=vi.fn(()=>{throw Error('Production family must never fall back to Goods');});
  const c={rpc,from,auth:{getUser:vi.fn(async()=>({data:{user:{id:'owner'}}}))}};
  m.client.mockResolvedValue(c);
  return c;
}

it('calls the production RPC with a persisted eligible family and saved revision',async()=>{
  const c=owner();
  expect(await submitListingAction(listingId,12)).toEqual({
    success:true,listingId,message:'Ad submitted for review.',
  });
  expect(c.rpc).toHaveBeenCalledWith('get_seller_production_submission_status',{listing_id:listingId});
  expect(c.rpc).toHaveBeenCalledWith('seller_submit_family_listing',{listing_id:listingId,expected_revision:12});
  expect(c.rpc.mock.calls.filter(([name])=>name==='seller_submit_listing')).toHaveLength(0);
  expect(c.from).not.toHaveBeenCalled();
});

it('does not submit a family the reviewed Web environment has not enabled',async()=>{
  const c=owner({data:{...valid,family:'property'},error:null});
  expect(await loadSubmissionState(c as unknown as SupabaseClient<Database>,listingId)).toEqual({
    ...valid,family:'property',enabled:false,
  });
  expect(await submitListingAction(listingId,12)).toEqual({
    error:'Submission is not enabled for this saved category. Your draft remains available.',
  });
  expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_family_listing',expect.anything());
});

it.each([
  {data:null,error:null},
  {data:{...valid,unexpected:'not a production contract'},error:null},
  {data:{...valid,enabled:'true'},error:null},
  {data:null,error:{code:'42501',message:'Non-owner'}},
])('cannot submit when owner production eligibility is invalid',async eligibility=>{
  const c=owner(eligibility);
  expect(await submitListingAction(listingId,12)).toEqual({
    error:'Saved submission eligibility could not be verified. Please reload.',
  });
  expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_family_listing',expect.anything());
});

it.each([undefined,0,-1,1.5])('rejects missing or invalid %s revision before production mutation',async rev=>{
  const c=owner();
  expect(await submitListingAction(listingId,rev)).toEqual({
    error:'Save and reload this draft before submitting.',
  });
  expect(c.rpc).not.toHaveBeenCalledWith('seller_submit_family_listing',expect.anything());
});

it('returns production backend stale-token denial unchanged',async()=>{
  const message='Saved content or photos changed; reload before submitting';
  const c=owner(undefined,{data:null,error:{code:'PT409',message}});
  expect(await submitListingAction(listingId,12)).toEqual({error:message});
});
