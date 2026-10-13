import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {hasSavedSubmissionFamily} from '@/lib/listings/saved-submission-family';
import {verifySellerMediaMutationGuard} from '@/lib/media/api-contract';
import {POST_AD_TEST_PROJECT} from '@/lib/listings/test-runtime';

const id='11111111-1111-4111-8111-111111111111';
const owner='22222222-2222-4222-8222-222222222222';
const user={id:owner} as User;
const tables=['listing_vehicle_contexts','listing_car_contexts','listing_property_contexts'];
const flags=['POST_AD_GOODS_TEST_ENABLED','POST_AD_TWO_WHEELER_TEST_ENABLED','POST_AD_CARS_TEST_ENABLED','POST_AD_PROPERTY_TEST_ENABLED','POST_AD_SUBMISSION_TEST_ENABLED'];
beforeEach(()=>{
 for(const name of [...flags,'NEXT_PUBLIC_SUPABASE_URL','STAGING_SUPABASE_URL','SUPABASE_URL','MAINTENANCE_SELLER_WRITES'])vi.stubEnv(name,'');
});
afterEach(()=>vi.unstubAllEnvs());
function integrated(submission='true'){
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',`https://${POST_AD_TEST_PROJECT}.supabase.co`);
 for(const name of flags)vi.stubEnv(name,'true');
 vi.stubEnv('POST_AD_SUBMISSION_TEST_ENABLED',submission);
}
type Options={status?:string;family?:string;absent?:boolean;failure?:unknown;throwRead?:boolean;account?:string|null;policy?:boolean|null;policyError?:unknown;seller?:string;missingTable?:string};
function client(o:Options={}){
 const from=vi.fn((table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>{
  if(table==='user_accounts')return {data:o.account===null?null:{account_status:o.account??'active'},error:null};
  if(table==='listings')return {data:{id,seller_id:o.seller??owner,status:o.status??'draft',revision:7,cover_photo_id:null},error:null};
  if(tables.includes(table)){
   if(o.throwRead)throw Error('Controlled context transport exception');
   return {data:table===o.family?{listing_id:id}:null,error:o.failure??((o.absent||o.missingTable===table)?{code:'42P01',message:'relation does not exist'}:null)};
  }
  throw Error('Unexpected table');
 }})})}));
 const rpc=vi.fn(async()=>({data:o.policy===undefined?true:o.policy,error:o.policyError??null}));
 const c={from,rpc} as unknown as SupabaseClient<Database>;
 return {c,from,rpc,contextReads:()=>from.mock.calls.filter(([table])=>tables.includes(table))};
}
async function code(result:Awaited<ReturnType<typeof verifySellerMediaMutationGuard>>){
 if(result.allowed)return 'ALLOWED';
 return (await result.response.json()).code;
}
it('legacy/default-OFF Goods reaches existing media checks without absent family reads',async()=>{
 const m=client({absent:true});
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('ALLOWED');
 expect(m.contextReads()).toHaveLength(0);
 expect(m.rpc).toHaveBeenCalledWith('has_current_policy_acceptance');
});
it('the actual helper skips family objects on the supported legacy schema',async()=>{
 const m=client({absent:true});expect(await hasSavedSubmissionFamily(m.c,id)).toBe(false);expect(m.from).not.toHaveBeenCalled();
});
it.each(['draft','pending_review','active','rejected','reserved','paused'])('integrated Goods keeps its existing %s media status',async status=>{
 integrated();const m=client({status});const result=await verifySellerMediaMutationGuard(m.c,user,id);
 expect(result).toMatchObject({allowed:true,newFamily:false});expect(m.contextReads()).toHaveLength(3);
});
it.each(tables)('integrated %s draft retains its allowed draft path',async family=>{
 integrated();const m=client({family});expect(await verifySellerMediaMutationGuard(m.c,user,id)).toMatchObject({allowed:true,newFamily:true});
 expect(await hasSavedSubmissionFamily(m.c,id)).toBe(true);
});
it.each(tables.flatMap(family=>['true','false'].map(submission=>({family,submission}))))('pending $family remains locked with submission=$submission',async({family,submission})=>{
 integrated(submission);const m=client({family,status:'pending_review'});
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('LISTING_MEDIA_NOT_EDITABLE');expect(m.contextReads()).toHaveLength(3);
});
it('all assignment/integration switches OFF still protect installed pending records',async()=>{
 integrated('false');for(const name of flags)vi.stubEnv(name,'false');vi.stubEnv('NODE_ENV','production');
 const m=client({family:tables[0],status:'pending_review'});
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('LISTING_MEDIA_NOT_EDITABLE');
});
it.each([{code:'42501',message:'Permission denied'},{code:'FETCH_ERROR',message:'Transport failure'},{code:'42703',message:'Unexpected schema'}])('returned required context failure $code fails closed',async failure=>{
 integrated('false');const m=client({failure});await expect(hasSavedSubmissionFamily(m.c,id)).rejects.toThrow();
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');
});
it('thrown required context transport failure fails closed',async()=>{
 integrated();const m=client({throwRead:true});await expect(hasSavedSubmissionFamily(m.c,id)).rejects.toThrow('Controlled context transport exception');
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');
});
it.each(tables)('unsupported installed partial schema missing %s fails closed even with a family match',async missingTable=>{
 integrated();const m=client({missingTable,family:tables.find(t=>t!==missingTable)});
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');
});
it('conflicting backend configuration is explicit failure, not guessed Goods',async()=>{
 integrated();vi.stubEnv('SUPABASE_URL','https://unsupported.example');const m=client();
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');expect(m.contextReads()).toHaveLength(0);
});
it.each([`https://${POST_AD_TEST_PROJECT}.supabase.co/`,`http://${POST_AD_TEST_PROJECT}.supabase.co`])('unsupported installed-backend URL %s cannot be mistaken for legacy',async url=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',url);const m=client();
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');expect(m.contextReads()).toHaveLength(0);
});
it('unsupported family activation outside the installed backend fails explicitly',async()=>{
 vi.stubEnv('POST_AD_CARS_TEST_ENABLED','true');const m=client();
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('MEDIA_SERVICE_UNAVAILABLE');expect(m.contextReads()).toHaveLength(0);
});
it.each([
 [{account:null},'ACCOUNT_RESTRICTED'],
 [{account:'suspended'},'ACCOUNT_RESTRICTED'],
 [{seller:'another-owner'},'LISTING_NOT_FOUND'],
 [{policy:false},'POLICY_ACCEPTANCE_REQUIRED'],
 [{policyError:{message:'Policy read unavailable'}},'MEDIA_SERVICE_UNAVAILABLE'],
] as const)('existing early guard $1 precedes family checks',async(options,expected)=>{
 integrated();const m=client(options);expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe(expected);expect(m.contextReads()).toHaveLength(0);
});
it('maintenance rejects before account, policy or family operations',async()=>{
 integrated();vi.stubEnv('MAINTENANCE_SELLER_WRITES','true');const m=client();
 expect(await code(await verifySellerMediaMutationGuard(m.c,user,id))).toBe('SELLER_WRITES_DISABLED');expect(m.from).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();
});
