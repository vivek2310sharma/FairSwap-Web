import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import {isVerifiedPostAdTestEnvironment,isVerifiedCarsTestEnvironment,isVerifiedPropertyTestEnvironment,isVerifiedTwoWheelerTestEnvironment} from './test-runtime';
import {loadSavedCategoryContext} from './saved-category-context';
import {isSellerWriteMaintenanceEnabled} from '@/lib/maintenance/seller-writes';
import {loadSubmissionState} from './submission-server';
import {propertyV1,validatePropertyDraft} from './property/contract';
import {evaluateReadiness,supportsSavedContract,type ReadinessInput,type ReadinessResult} from './submission-readiness';

type Result={data:unknown;error:unknown};
interface Query extends PromiseLike<Result>{select(columns:string):Query;eq(column:string,value:unknown):Query;order(column:string):Query;maybeSingle():PromiseLike<Result>}
interface Reads {from(table:string):Query}
const record=z.record(z.unknown());
const outcome=(r:Result,predicate:(value:unknown)=>boolean):'pass'|'fail'|'not_verified'=>r.error||r.data===null?'not_verified':predicate(r.data)?'pass':'fail';
const listingColumns='id,seller_id,category_id,status,revision,updated_at,title,description,city_id,locality_id,condition,price_type,price_paise,category_attributes,cover_photo_id';

/** Only request-scoped owner reads. No mutation RPC, service client, or caller-
 * supplied approval policy. Default-OFF returns before any gated read. */
export async function loadOwnerReadiness(client:SupabaseClient<Database>,id:string):Promise<ReadinessResult|null>{
  if(!isVerifiedPostAdTestEnvironment(process.env))return null;
  const failed=()=>evaluateReadiness(null);
  if(!z.string().uuid().safeParse(id).success)return failed();
  try{
    const user=await client.auth.getUser();
    if(user.error||!user.data.user)return failed();
    const reads=client as unknown as Reads;
    const row=await reads.from('listings').select(listingColumns).eq('id',id).eq('seller_id',user.data.user.id).maybeSingle();
    const l=record.safeParse(row.data);
    if(row.error||!l.success||l.data.id!==id||l.data.seller_id!==user.data.user.id)return failed();
    const saved=await loadSavedCategoryContext(client,id);
    let family:ReadinessInput['family']='unresolved';
    let reference:ReadinessInput['reference']=null,context:ReadinessInput['context']=null,model:ReadinessInput['model']=null;
    let savedContract:ReadinessInput['savedContract'];
    let privateDraft:ReadinessInput['observations']['privateDraft']='not_applicable';
    if(saved.status==='ready'&&saved.context.category.id===l.data.category_id){
      const category=saved.context.category;
      family=category.macro_category==='goods'?'goods':category.macro_category===null?'legacy':'unresolved';
      if(family==='goods'||family==='legacy')reference={categoryId:category.id,versionId:null,path:[category.name],fields:saved.context.attributes.map(a=>a.name),attributes:saved.context.attributes,snapshotId:null,contractKey:`existing-${family}`};
      const enabled=[['property',isVerifiedPropertyTestEnvironment(process.env),'listing_property_contexts','property_category_contracts','property_contract_versions'],['two-wheelers',isVerifiedTwoWheelerTestEnvironment(process.env),'listing_vehicle_contexts','vehicle_category_contracts','vehicle_contract_versions'],['cars',isVerifiedCarsTestEnvironment(process.env),'listing_car_contexts','car_category_contracts','car_contract_versions']] as const;
      if(category.macro_category!=='goods'&&category.macro_category!==null)for(const [candidate,on,contexts,contracts,versions] of enabled){
        if(!on||category.macro_category===(candidate==='property'?'vehicles':'property'))continue;
        const result=await reads.from(contexts).select(candidate==='property'?'listing_id,category_id,version_id,financial,society_name':'listing_id,category_id,version_id,mode,brand_id,model_id,brand_text,model_text,classification_review_required').eq('listing_id',id).maybeSingle();
        if(result.error)break;
        const c=record.safeParse(result.data);if(!c.success)continue;
        family=candidate;
        savedContract={versionId:c.data.version_id as string,contractKey:null};
        const [binding,version]=await Promise.all([
          reads.from(contracts).select(candidate==='property'?'category_id,version_id,source_path,fields,definition':'category_id,version_id,source_path,fields').eq('category_id',category.id).eq('version_id',c.data.version_id).maybeSingle(),
          reads.from(versions).select(candidate==='property'?'id,contract_key,definition':'id,contract_key,snapshot_id,definition').eq('id',c.data.version_id).maybeSingle(),
        ]);
        const b=record.safeParse(binding.data),v=record.safeParse(version.data);
        if(!version.error&&v.success&&v.data.id===c.data.version_id&&typeof v.data.contract_key==='string')savedContract.contractKey=v.data.contract_key;
        if(binding.error||version.error||!b.success||!v.success||b.data.category_id!==category.id||b.data.version_id!==c.data.version_id||v.data.id!==c.data.version_id)break;
        reference={categoryId:category.id,versionId:c.data.version_id as string,path:b.data.source_path as string[],fields:b.data.fields as string[],attributes:[],snapshotId:candidate==='property'?null:v.data.snapshot_id as string,contractKey:v.data.contract_key as string,versionDefinition:v.data.definition,...(candidate==='property'?{categoryDefinition:b.data.definition}:{})};
        // Do not copy society_name into the evaluator/reviewer data.
        const {society_name:privateSociety,...safeContext}=c.data;
        context=safeContext as ReadinessInput['context'];
        if(candidate==='property'){
          const path=propertyV1.paths.find(p=>JSON.stringify(p.path)===JSON.stringify(b.data.source_path));
          privateDraft=path&&supportsSavedContract(candidate,reference)?validatePropertyDraft(l.data.category_attributes,c.data.financial,privateSociety,path).error?'fail':'pass':'not_verified';
        }else if(c.data.model_id){
          const r=await reads.from(candidate==='cars'?'car_catalogue_rows':'vehicle_catalogue_rows').select('snapshot_id,model_id,raw,selection_enabled').eq('snapshot_id',v.data.snapshot_id).eq('model_id',c.data.model_id).maybeSingle();
          const m=record.safeParse(r.data),raw=m.success?record.safeParse(m.data.raw):null;
          if(!r.error&&m.success&&raw?.success&&m.data.model_id===c.data.model_id&&m.data.snapshot_id===v.data.snapshot_id)model={id:c.data.model_id as string,brand_id:c.data.brand_id as string,brand:raw.data.brand as string,model:raw.data.model as string,snapshotId:m.data.snapshot_id as string,selectionEnabled:m.data.selection_enabled as boolean,raw:raw.data as NonNullable<ReadinessInput['model']>['raw']};
        }
        break;
      }
    }
    const [account,policy,privateLocation,media]=await Promise.all([
      reads.from('user_accounts').select('account_status').eq('user_id',user.data.user.id).maybeSingle(),
      client.rpc('has_current_policy_acceptance'),
      client.rpc('get_seller_listing_location_private',{p_listing_id:id}),
      reads.from('listing_media').select('id,listing_id,processing_status,display_order').eq('listing_id',id).order('display_order'),
    ]);
    const loc=z.array(z.object({listing_id:z.string().uuid(),pin_code:z.string().nullable()}).passthrough()).safeParse(privateLocation.data);
    const pin=!privateLocation.error&&loc.success&&loc.data.length===1&&loc.data[0].listing_id===id?loc.data[0].pin_code:null;
    let location:ReadinessInput['observations']['location']='not_verified';
    if(pin&&/^\d{6}$/.test(pin)){
      if(!l.data.locality_id)location=l.data.city_id?'pass':'fail';
      else{
        const [mapping,locality]=await Promise.all([reads.from('postal_pincode_localities').select('id').eq('pincode',pin).eq('locality_id',l.data.locality_id).maybeSingle(),reads.from('localities').select('city_id').eq('id',l.data.locality_id).maybeSingle()]);
        location=mapping.error||locality.error?'not_verified':!mapping.data?'fail':outcome(locality,d=>record.parse(d).city_id===l.data.city_id);
      }
    }
    const registration=(l.data.category_attributes as Record<string,unknown>)?.registration_state as {state?:string;state_id?:string}|undefined;
    let registrationResult:ReadinessInput['observations']['registration']='not_applicable';
    if(registration?.state==='provided'){
      const state=await reads.from('vehicle_registration_states').select('id').eq('id',registration.state_id).maybeSingle();
      registrationResult=state.error?'not_verified':state.data?'pass':'fail';
    }
    const end=await reads.from('listings').select('id,category_id,status,revision,updated_at').eq('id',id).eq('seller_id',user.data.user.id).maybeSingle();
    const submission=process.env.POST_AD_SUBMISSION_TEST_ENABLED==='true'?await loadSubmissionState(client,id):null;
    return evaluateReadiness({testSubmissionAvailable:submission?.enabled??false,family,savedContract,listing:l.data,reference,context,model,media:media.error?null:media.data,
      observations:{owner:'pass',account:outcome(account,d=>record.parse(d).account_status==='active'),policy:outcome(policy,d=>d===true),maintenance:isSellerWriteMaintenanceEnabled()?'fail':'pass',pin:privateLocation.error||!loc.success?'not_verified':pin&&/^\d{6}$/.test(pin)?'pass':'fail',location,registration:registrationResult,privateDraft},capturedAt:new Date().toISOString(),endIdentity:end.error?null:end.data,now:new Date().toISOString()});
  }catch{return failed();}
}
