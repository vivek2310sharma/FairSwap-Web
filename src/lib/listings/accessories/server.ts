import "server-only";
import {cache} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import {mobilesEnabled} from "../mobiles/server";
import {accessoryCatalogueSchema} from "./contract";
export const loadAccessoryCatalogue=cache(async(client:SupabaseClient)=>{
 if(!mobilesEnabled())return null;
 const result=await client.rpc("accessories_v1_catalogue");const parsed=accessoryCatalogueSchema.safeParse(result.data);
 return !result.error&&parsed.success&&parsed.data.enabled?parsed.data:null;
});
