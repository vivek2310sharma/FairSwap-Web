import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/types/database';
import type {Listing} from '@/types/listing';
import {loadVehicleReferences,type VehicleContext} from '@/lib/listings/two-wheeler/server';
import {twoWheelerV1} from '@/lib/listings/two-wheeler/contract';
import EditListingPage from '@/app/account/listings/[id]/edit/page';
import ListingForm from '@/components/listings/ListingForm';
const m=vi.hoisted(()=>({client:null as unknown,update:vi.fn(),create:vi.fn(),push:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>m.client}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:m.push}),redirect:vi.fn(),notFound:vi.fn()}));
vi.mock('@/app/account/listings/actions',()=>({updateListingAction:m.update,createDraftListingAction:m.create,submitListingAction:vi.fn()}));
vi.mock('@/lib/maintenance/seller-writes',()=>({isSellerWriteMaintenanceEnabled:()=>false}));
vi.mock('@/lib/location/pincode',()=>({lookupPincodeServer:vi.fn()}));
vi.mock('@/components/listings/MediaUploader',()=>({default:()=> <div>Saved photos</div>}));
vi.mock('@/components/listings/PincodeLocationPicker',()=>({default:()=> <input name="city_id" value="33333333-3333-4333-8333-333333333333" readOnly/>}));
const id='55555555-5555-4555-8555-555555555555',categoryId='11111111-1111-4111-8111-111111111111',versionId='22222222-2222-4222-8222-222222222222';
const category={id:categoryId,name:'Commuter Bikes',macro_category:'vehicles',is_active:true,new_listing_enabled:true};
const context:VehicleContext={listing_id:id,category_id:categoryId,version_id:versionId,mode:'unanswered',brand_id:null,model_id:null,brand_text:null,model_text:null,classification_review_required:false};
const contract={category_id:categoryId,version_id:versionId,source_path:twoWheelerV1.paths[0].path,fields:twoWheelerV1.paths[0].fields,display_order:0};
const listing:Listing={id,seller_id:'owner',category_id:categoryId,title:'Retained vehicle',status:'draft',category_attributes:{year:{state:'known',value:2024},km_driven:{state:'known',value:0},engine_cc:125},price_type:'free',price_paise:0,condition:'good',slug:'synthetic-retained',city_id:'33333333-3333-4333-8333-333333333333',locality_id:null,description:null,pin_code:null,landmark:null,cover_photo_id:null,rejection_reason:null,removal_reason:null,removed_by:null,revision:1,renewal_count:0,created_at:'',updated_at:'',submitted_at:null,published_at:null,expires_at:null,sold_at:null};
type Setup={active?:boolean;posting?:boolean;closed?:boolean;closedSaved?:boolean;contextError?:boolean;missingContext?:boolean;ownerError?:boolean;malformed?:boolean;mismatch?:boolean;badContract?:boolean;badVersion?:boolean;newVersion?:boolean};
function client(options:Setup={}){
  const c={...category,is_active:options.active??true,new_listing_enabled:options.posting??true};
  const rpc=vi.fn(async(name:string)=>name==='get_seller_listing_category_context'?{data:options.malformed?{category:{...c,is_active:'bad'},attributes:[]}:options.mismatch?{category:{...c,id:versionId},attributes:[]}:{category:c,attributes:[]},error:options.ownerError?{code:'42501'}:null}:{data:[],error:null});
  const from=vi.fn((table:string)=>{
    const filters:Record<string,unknown>={};let projection='';
    const result=()=>{
      if(table==='listings')return {data:listing,error:null};
      if(table==='listing_vehicle_contexts')return {data:options.missingContext?null:context,error:options.contextError?{code:'42501'}:null};
      if(table==='vehicle_contract_versions')return {data:{id:options.badVersion&&filters.id?categoryId:options.newVersion&&!filters.id?id:versionId,new_assignment_enabled:!(options.closed||(options.closedSaved&&filters.id))},error:null};
      if(table==='vehicle_category_contracts')return {data:projection.includes('categories(')?[{...contract,version_id:options.newVersion?id:versionId,categories:c.is_active?c:null}]:{...contract,version_id:options.badContract?categoryId:versionId},error:null};
      return {data:[],error:null};
    };
    const q={select:(p:string)=>{projection=p;return q;},eq:(key:string,value:unknown)=>{filters[key]=value;return q;},order:()=>q,single:async()=>result(),maybeSingle:async()=>result(),then:(resolve:(v:unknown)=>unknown)=>resolve(result())};return q;
  });
  return {from,rpc,auth:{getUser:async()=>({data:{user:{id:'owner'}}})}} as unknown as SupabaseClient<Database>;
}
function enable(){
  for(const [key,value] of Object.entries({NODE_ENV:'test',POST_AD_GOODS_TEST_ENABLED:'true',POST_AD_TWO_WHEELER_TEST_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://wpppxlnbzqynvhpeuavd.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test',POST_AD_TEST_CREDENTIALS_VERIFIED:'wpppxlnbzqynvhpeuavd',SUPABASE_URL:'',STAGING_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''}))vi.stubEnv(key,value);
}
beforeEach(()=>{enable();vi.clearAllMocks();m.update.mockResolvedValue({});vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({brands:[],rows:[],selected:null,total:0,offset:0,limit:25})})));});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals();});
it.each([{active:true},{posting:false},{active:false},{closed:true},{newVersion:true,closedSaved:true},{newVersion:true}])('retains owner-authorized saved references %j',async options=>{
  const c=client(options),refs=await loadVehicleReferences(c,{listingId:id,categoryId,context});
  expect(refs.error).toBeUndefined();expect(refs.categories).toHaveLength(1);
  expect(refs.categories[0]).toMatchObject({id:categoryId,version_id:versionId,fields:contract.fields});
  expect(refs.categories[0]).not.toHaveProperty('slug');
  expect(c.rpc).toHaveBeenCalledWith('get_seller_listing_category_context',{p_listing_id:id});
});
it.each([{ownerError:true},{malformed:true},{mismatch:true},{badContract:true},{badVersion:true}])('fails closed for invalid saved owner references %j',async options=>{
  expect(await loadVehicleReferences(client(options),{listingId:id,categoryId,context})).toMatchObject({categories:[],states:[],error:expect.any(String)});
});
it('rejects mismatched persisted listing/context identity',async()=>{
  const c=client();expect(await loadVehicleReferences(c,{listingId:versionId,categoryId,context})).toHaveProperty('error');expect(c.rpc).not.toHaveBeenCalled();
});
it.each([{active:false},{posting:false},{closed:true}])('new selection never gains retention %j',async options=>{
  const c=client(options);expect((await loadVehicleReferences(c)).categories).toEqual([]);expect(c.rpc).not.toHaveBeenCalled();
});
it.each([{contextError:true},{missingContext:true}])('context failures cannot select legacy editor %j',async options=>{
  m.client=client(options);render(await EditListingPage({params:Promise.resolve({id})}));expect(screen.getByRole('alert')).toHaveTextContent(/vehicle context/);expect(screen.queryByRole('button',{name:'Save Changes'})).not.toBeInTheDocument();
});
it('default-OFF edit acquires no vehicle schema or saved-category RPC dependency',async()=>{
  vi.stubEnv('POST_AD_TWO_WHEELER_TEST_ENABLED','false');vi.stubEnv('POST_AD_GOODS_TEST_ENABLED','false');
  const c=client();m.client=c;await act(async()=>{render(await EditListingPage({params:Promise.resolve({id})}));});
  expect(c.from).not.toHaveBeenCalledWith('listing_vehicle_contexts');expect(c.from).not.toHaveBeenCalledWith('vehicle_category_contracts');
  expect(c.rpc).not.toHaveBeenCalledWith('get_seller_listing_category_context',expect.anything());
  expect(screen.getByRole('heading',{name:'Edit ad'})).toBeVisible();
});
it('renders retained actual fields and keeps answers/version/same ID after reference refresh',async()=>{
  m.client=client({active:false,posting:false,closed:true});
  const page=await EditListingPage({params:Promise.resolve({id})});
  let view!:ReturnType<typeof render>;
  await act(async()=>{view=render(page);});
  expect(screen.getByLabelText('Engine capacity (cc)')).toHaveValue(125);
  expect(screen.getByLabelText('Manufacture year')).toHaveValue('known');
  const refs=await loadVehicleReferences(m.client as SupabaseClient<Database>,{listingId:id,categoryId,context});
  await act(async()=>{view.rerender(<ListingForm postAdEntry="vehicle" vehicle={{references:refs,initialResolution:{mode:'unanswered'}}} categories={refs.categories} allAttributes={[]} cities={[]} initialListing={listing}/>);});
  expect(screen.getByLabelText('Engine capacity (cc)')).toHaveValue(125);
  fireEvent.click(screen.getByRole('button',{name:'Save Changes'}));
  await waitFor(()=>expect(m.update).toHaveBeenCalledOnce());
  expect(m.update.mock.calls[0][0]).toBe(id);
  const form=m.update.mock.calls[0][1] as FormData;expect(form.get('vehicle_version_id')).toBe(versionId);expect(JSON.parse(String(form.get('category_attributes')))).toEqual(listing.category_attributes);expect(m.create).not.toHaveBeenCalled();
});
