import React from "react";
import {describe,it,expect,vi} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import TabletListingDetails from "@/components/listings/TabletListingDetails";
import {loadTabletDetails,tabletDetailsSchema} from "@/lib/listings/tablets/public";
import type {SupabaseClient} from "@supabase/supabase-js";
import {valid} from "./tablet-fixture";
const details=tabletDetailsSchema.parse({...Object.fromEntries(Object.entries(valid).filter(([k])=>['storage','connectivity','ram','colour','hardware_model_number','condition','screen_touch_status','battery_charging_status','transfer_lock_status','powers_on','repair_history','other_defects','included','stylus_description','keyboard_description','warranty_until'].includes(k))),family:'iPad',generation:'9th generation / 2021',screen_inches:'10.2'});
describe('Tablet public projection',()=>{
 it('shows seller-declared faults, locks, connectivity and bundle details without verification claims',()=>{const html=renderToStaticMarkup(<TabletListingDetails details={{...details,brand_name:'Apple',model_name:'iPad',other_defects:'Marked corner',included:['Stylus/pen'],stylus_description:'Pencil first generation'}}/>);for(const text of ['seller-declared','Marked corner','Wi-Fi only','Pencil first generation','does not currently verify'])expect(html).toContain(text);expect(html).not.toContain('560034');});
 it('shows typed identity and custom facts from a V2 context',()=>{
  const projection=tabletDetailsSchema.parse({...details,storage:"Not sure",storage_other:"8 GB",ram_other:"1 GB",connectivity:"unknown",connectivity_other:"Wi-Fi + 3G"});
  const html=renderToStaticMarkup(<TabletListingDetails details={{...projection,brand_name:"Example",model_name:"Legacy Tab"}}/>);
  for(const value of ["Example Legacy Tab","8 GB","1 GB","Wi-Fi + 3G","Storage (seller-declared)"])expect(html).toContain(value);
 });
 it('fails closed on unexpected private projection fields',()=>expect(tabletDetailsSchema.safeParse({...details,serial:'private'}).success).toBe(false));
 it('fails closed when context data is unavailable',async()=>{const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({error:{message:'blocked'},data:null})};expect(await loadTabletDetails({from:()=>q} as unknown as SupabaseClient,valid.session_id)).toBeNull();});
});
