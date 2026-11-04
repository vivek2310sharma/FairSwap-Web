import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import {accessoryBase,CONDITIONS,ORIGINALITY} from "./contract";
import {accessoryType,visibleSpecs} from "./catalogue";
import {compatibilityLabel} from "./compatibility";
export const accessoryDetailsSchema=accessoryBase.pick({type:true,brand:true,other_brand:true,product_model:true,originality:true,compatibility:true,specs:true,quantity:true,bundle_contents:true,condition:true,working:true,faults:true,bill:true,box:true,warranty_until:true,safety:true});
export async function loadAccessoryDetails(client:SupabaseClient,id:string){const r=await client.from("listing_accessory_contexts").select("details").eq("listing_id",id).maybeSingle();const p=accessoryDetailsSchema.safeParse(r.data?.details);return !r.error&&p.success?p.data:null;}
export function accessoryFacts(d:import("zod").infer<typeof accessoryDetailsSchema>){return [{field:"type",label:"Accessory type",value:accessoryType(d.type)?.name??d.type},{field:"condition",label:"Condition",value:CONDITIONS[d.condition]},{field:"compatibility",label:"Compatibility",value:compatibilityLabel(d.compatibility)},{field:"originality",label:"Originality",value:ORIGINALITY[d.originality]}];}
export function accessorySpecifications(d:import("zod").infer<typeof accessoryDetailsSchema>){return visibleSpecs(d.type,d.specs).map(s=>({field:s.key,label:s.label,value:String(d.specs[s.key]??"Not specified")}));}
