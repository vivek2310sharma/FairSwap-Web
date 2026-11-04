import "server-only";
import {cache} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import {mobilesEnabled,sessionSchema} from "../mobiles/server";
import {PostingSessionError,sessionErrors,type SessionErrorCode} from "../mobiles/session-errors";
import {tabletCatalogueSchema} from "./contract";
export function tabletsEnabled(){return mobilesEnabled()&&process.env.POST_AD_TABLETS_V1_ENABLED==="true";}
export const loadTabletCatalogue=cache(async(client:SupabaseClient)=>{
 if(!tabletsEnabled())return null;
 const r=await client.rpc("tablets_v1_catalogue");const p=tabletCatalogueSchema.safeParse(r.data);
 return !r.error&&p.success&&p.data.enabled?p.data:null;
});
export async function tabletSession(client:SupabaseClient,id:string,operation:string){
 const r=await client.rpc("tablet_v1_session",{session_id:id,operation});
 const p=sessionSchema.safeParse(r.data);if(r.error){const code=r.error.message as SessionErrorCode;throw new PostingSessionError(Object.hasOwn(sessionErrors,code)?code:"UPLOAD_SESSION_UNAVAILABLE");}if(!p.success)throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");return p.data;
}
