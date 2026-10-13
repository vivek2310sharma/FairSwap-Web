import {afterEach,expect,it,vi} from "vitest";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/types/database";
import {loadVehicleReferences,type VehicleContext} from "@/lib/listings/two-wheeler/server";
import {carsV1} from "@/lib/listings/cars/contract";
const id="11111111-1111-4111-8111-111111111111",categoryId="22222222-2222-4222-8222-222222222222",version="33333333-3333-4333-8333-333333333333";
afterEach(()=>vi.unstubAllEnvs());
function enabled(){for(const [k,v] of Object.entries({NODE_ENV:"test",POST_AD_GOODS_TEST_ENABLED:"true",POST_AD_CARS_TEST_ENABLED:"true",NEXT_PUBLIC_SUPABASE_URL:"https://wpppxlnbzqynvhpeuavd.supabase.co",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_test",SUPABASE_SECRET_KEY:"sb_secret_test",POST_AD_TEST_CREDENTIALS_VERIFIED:"wpppxlnbzqynvhpeuavd",STAGING_SUPABASE_URL:"",SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_ANON_KEY:"",SUPABASE_SERVICE_ROLE_KEY:""}))vi.stubEnv(k,v);}
it.each(["off","production"])("%s loads no Cars schema",async mode=>{
  enabled();vi.stubEnv(mode==="off"?"POST_AD_CARS_TEST_ENABLED":"NODE_ENV",mode==="off"?"false":"production");
  const from=vi.fn(),rpc=vi.fn();expect(await loadVehicleReferences({from,rpc} as unknown as SupabaseClient<Database>,undefined,"cars")).toHaveProperty("error");expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
it.each([false,true])("loads closed saved Cars version through owner RPC; malformed=%s",async malformed=>{
  enabled();const category={id:categoryId,name:"Hatchback",is_active:false,new_listing_enabled:false,macro_category:"vehicles"};
  const context:VehicleContext={listing_id:id,category_id:categoryId,version_id:version,mode:"unanswered",brand_id:null,model_id:null,brand_text:null,model_text:null,classification_review_required:false};
  const contract={category_id:categoryId,version_id:malformed?id:version,fields:carsV1.paths[0].fields,source_path:carsV1.paths[0].path,display_order:101};
  const rpc=vi.fn(async()=>({data:{category,attributes:[]},error:null}));
  const from=vi.fn((table:string)=>{let projection="";const result=()=>({data:table==="car_contract_versions"?{id:version,new_assignment_enabled:false}:table==="car_category_contracts"?projection.includes("categories(")?[{...contract,categories:null}]:contract:[],error:null});const q={select:(s:string)=>{projection=s;return q;},eq:()=>q,order:()=>q,single:async()=>result(),then:(f:(r:unknown)=>unknown)=>f(result())};return q;});
  const refs=await loadVehicleReferences({from,rpc} as unknown as SupabaseClient<Database>,{listingId:id,categoryId,context},"cars");
  expect(rpc).toHaveBeenCalledWith("get_seller_listing_category_context",{p_listing_id:id});
  if(malformed)expect(refs).toMatchObject({categories:[],error:expect.any(String)});else expect(refs.categories).toEqual([{...category,version_id:version,path:contract.source_path,fields:contract.fields,display_order:101,family:"cars"}]);
  expect(from.mock.calls.some(([table])=>table.startsWith("vehicle_category")||table.startsWith("vehicle_contract"))).toBe(false);
});
