import {afterEach, describe, expect, it, vi} from "vitest";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/types/database";
import {loadVehicleReferences, saveVehicleDraft} from "@/lib/listings/two-wheeler/server";
const ref="wpppxlnbzqynvhpeuavd";
function enable(){
  vi.stubEnv("NODE_ENV","test"); vi.stubEnv("POST_AD_GOODS_TEST_ENABLED","true");
  vi.stubEnv("POST_AD_TWO_WHEELER_TEST_ENABLED","true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL",`https://${ref}.supabase.co`);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","sb_publishable_test"); vi.stubEnv("SUPABASE_SECRET_KEY","sb_secret_test");
  vi.stubEnv("POST_AD_TEST_CREDENTIALS_VERIFIED",ref);
  for(const key of ["SUPABASE_URL","STAGING_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY"]) vi.stubEnv(key,"");
}
afterEach(()=>vi.unstubAllEnvs());
describe("vehicle server boundaries",()=>{
  it.each(["off","production"])("%s never touches new schema",async mode=>{
    enable(); vi.stubEnv(mode==="off"?"POST_AD_TWO_WHEELER_TEST_ENABLED":"NODE_ENV",mode==="off"?"false":"production");
    const from=vi.fn(),rpc=vi.fn();const c={from,rpc} as unknown as SupabaseClient<Database>;
    expect(await loadVehicleReferences(c)).toMatchObject({categories:[],states:[]});
    expect(await saveVehicleDraft(c,new FormData())).toHaveProperty("error");
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["vehicle_version_id","vehicle_resolution","category_attributes","price_paise","category_id","post_ad_entry"])("rejects repeated %s before queries",async key=>{
    enable(); const from=vi.fn(),rpc=vi.fn();const f=new FormData();f.append(key,"one");f.append(key,"two");
    expect(await saveVehicleDraft({from,rpc} as unknown as SupabaseClient<Database>,f)).toEqual({error:"Repeated vehicle draft field"});
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
  it("malformed resolution cannot invoke persistence",async()=>{
    enable();const from=vi.fn(),rpc=vi.fn();const f=new FormData();f.set("vehicle_version_id","0506a02a-b66a-4abe-b168-db58eb87c43d");f.set("vehicle_resolution","{");
    expect(await saveVehicleDraft({from,rpc} as unknown as SupabaseClient<Database>,f)).toHaveProperty("error");
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
});
