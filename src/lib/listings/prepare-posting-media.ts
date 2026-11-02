import "server-only";
import {createHash} from "node:crypto";
import {createServiceRoleClient} from "@/lib/supabase/service";
import {sessionCall,stagedPrefix} from "./mobiles/server";
import type {SupabaseClient} from "@supabase/supabase-js";
export async function preparePostingMedia(client:SupabaseClient,user:{id:string},payload:{session_id:string;media_ids:string[]}) {
  const snapshot=await sessionCall(client,payload.session_id,"prepare");
  if(snapshot.session.state!=="submitted") {
   const service=createServiceRoleClient();
   for(const id of payload.media_ids) {
    const media=snapshot.media.find(m=>m.id===id&&m.state==="ready");if(!media)throw new Error("Photo unavailable");
    for(const name of ["original","thumb","medium","large"]) {
     const source=`${stagedPrefix(user.id,payload.session_id,id,media.attempt)}/${name}.webp`;
     const dest=`${snapshot.session.listing_id}/${id}/${name}.webp`;
     const bucket=service.storage.from(name==="original"?"listing-originals":"listing-derivatives");
     const read=await service.storage.from("posting-staged").download(source);if(read.error)throw new Error("Photo unavailable");
     const bytes=Buffer.from(await read.data.arrayBuffer());
     const write=await bucket.upload(dest,bytes,{contentType:"image/webp",upsert:false});
     if(write.error) {
      // Lost-response retries accept only byte-identical prepared objects.
      const existing=await bucket.download(dest);if(existing.error)throw new Error("Photo preparation failed");
      const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
      if(hash(bytes)!==hash(Buffer.from(await existing.data.arrayBuffer())))throw new Error("Photo conflict");
     }
    }
   }
  }
}
