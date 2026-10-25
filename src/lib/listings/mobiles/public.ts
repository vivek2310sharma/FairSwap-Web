import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
const context=z.object({model_name:z.string(),storage:z.string(),ram:z.string().nullable(),included:z.array(z.string()),warranty_until:z.string().nullable()});
export async function loadPublicMobileDetails(client:SupabaseClient,listingId:string) {
 const r=await client.from("listing_mobile_contexts").select("model_name,storage,ram,included,warranty_until").eq("listing_id",listingId).maybeSingle();
 if(r.error||!r.data)return null;
 const p=context.safeParse(r.data);return p.success?{...p.data,model:p.data.model_name}:null;
}
