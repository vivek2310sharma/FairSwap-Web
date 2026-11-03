// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({enabled:vi.fn()}));
vi.mock("@/lib/listings/mobiles/server",()=>({mobilesEnabled:m.enabled,sessionSchema:{safeParse:()=>({success:false})}}));
import {loadTabletCatalogue,tabletsEnabled} from "@/lib/listings/tablets/server";
import type {SupabaseClient} from "@supabase/supabase-js";
import {catalogue} from "./tablet-fixture";
const rpc=vi.fn();const client={rpc} as unknown as SupabaseClient;
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('POST_AD_TABLETS_V1_ENABLED','true');m.enabled.mockReturnValue(true);rpc.mockResolvedValue({data:catalogue,error:null});});
afterEach(()=>vi.unstubAllEnvs());
it("requires both tablet and shared mobile capability flags",async()=>{vi.stubEnv('POST_AD_TABLETS_V1_ENABLED','false');expect(tabletsEnabled()).toBe(false);expect(await loadTabletCatalogue(client)).toBeNull();expect(rpc).not.toHaveBeenCalled();vi.stubEnv('POST_AD_TABLETS_V1_ENABLED','true');m.enabled.mockReturnValue(false);expect(await loadTabletCatalogue(client)).toBeNull();expect(rpc).not.toHaveBeenCalled();});
it.each([{data:{...catalogue,enabled:false},error:null},{data:{...catalogue,selection:{...catalogue.selection,version:2}},error:null},{data:null,error:{message:'unavailable'}}])("fails closed on disabled, malformed or failed catalogue: %j",async(result)=>{rpc.mockResolvedValue(result);expect(await loadTabletCatalogue(client)).toBeNull();});
it("accepts only the enabled validated tablet catalogue",async()=>{expect(await loadTabletCatalogue(client)).toEqual(catalogue);expect(rpc).toHaveBeenCalledWith('tablets_v1_catalogue');});
