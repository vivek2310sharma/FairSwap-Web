import { createHash } from "node:crypto";
import { mobileSchema, phoneRiskSignals } from "@/lib/listings/mobiles/contract";
import { loadMobileCatalogue, postingGuard, postingError, sessionCall, stagedPrefix, readPostingBody } from "@/lib/listings/mobiles/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request) {
 try {
  if(Number(request.headers.get("content-length")??0)>24000)return Response.json({error:"Request too large"},{status:413});
  const {client,user}=await postingGuard(request);
  const parsed=mobileSchema.safeParse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,24000))));
  if(!parsed.success)return Response.json({error:"Check the highlighted fields.",issues:parsed.error.issues.map(i=>({field:i.path[0],message:i.message}))},{status:422});
  const payload=parsed.data;
  const catalogue=await loadMobileCatalogue(client);
  if(!catalogue)throw new Error("Mobile posting is coming soon.");
  const model=catalogue.models.find(m=>m.id===payload.model_id&&m.brand_id===payload.brand_id);
  if(!model||(model.other?payload.other_model.length<2:!!payload.other_model))return Response.json({error:"Select a valid Brand and Model."},{status:422});
  if(phoneRiskSignals(`${payload.title} ${payload.description} ${payload.other_model}`).length)return Response.json({error:"Remove contact numbers, payment IDs, payment links and advance or courier fee requests. Use FairSwap chat and pickup."},{status:422});
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
  const result=await client.rpc("submit_mobile_v2",{payload});
  if(result.error||result.data?.success!==true)throw new Error("Submission unavailable");
  return Response.json({success:true,listing_id:result.data.listing_id},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return postingError(e);}
}
