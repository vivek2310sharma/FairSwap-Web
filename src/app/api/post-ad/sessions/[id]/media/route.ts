import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { detectImageMimeFromMagicBytes, processImageBuffer } from "@/lib/media/processor";
import { postingGuard, postingError, sessionCall, stagedPrefix, readPostingBody } from "@/lib/listings/mobiles/server";
export const runtime = "nodejs";
export const maxDuration = 60;
type Context = {params:Promise<{id:string}>};
const uuid=z.string().uuid();
export async function GET(request:Request,ctx:Context) {
  try {
    const {client,user}=await postingGuard(request,false);const id=uuid.parse((await ctx.params).id);
    const snapshot=await sessionCall(client,id,"read");
    const storage=createServiceRoleClient().storage.from("posting-staged");
    const media=await Promise.all(snapshot.media.map(async m=>{
      let url:string|null=null;
      if(m.state==="ready") { const r=await storage.createSignedUrl(`${stagedPrefix(user.id,id,m.id,m.attempt)}/medium.webp`,600);if(r.error)throw new Error("Media unavailable");url=r.data.signedUrl; }
      return {id:m.id,state:m.state,url};
    }));
    return Response.json({session:snapshot.session,media},{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return postingError(e);}
}
export async function POST(request:Request,ctx:Context) {
  try {
    if(Number(request.headers.get("content-length")??0)>6*1024*1024)return Response.json({error:"Image is too large."},{status:413});
    const {client,user}=await postingGuard(request);const id=uuid.parse((await ctx.params).id);
    // Check ownership and expiry before reading the multipart body.
    await sessionCall(client,id,"read");
    const bytes=await readPostingBody(request,6*1024*1024);
    const form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();const mediaId=uuid.parse(form.get("media_id"));const file=form.get("file");
    if(!(file instanceof File)||file.size<12||file.size>5*1024*1024)throw new Error("Invalid image");
    const snapshot=await sessionCall(client,id,"reserve",mediaId);const media=snapshot.media.find(m=>m.id===mediaId);
    if(!media)throw new Error("Media unavailable");
    if(media.state==="ready")return Response.json({success:true});
    const raw=Buffer.from(await file.arrayBuffer());
    if(!detectImageMimeFromMagicBytes(raw.subarray(0,12)))throw new Error("Invalid image");
    // Sharp strips metadata before ANY persistent write. No raw original is stored.
    const processed=await processImageBuffer(raw);
    const storage=createServiceRoleClient();const bucket=storage.storage.from("posting-staged");
    const prefix=stagedPrefix(user.id,id,mediaId,media.attempt);
    const written:string[]=[];
    let completionAttempted=false;
    try {
      for(const [name,bytes] of [["original",processed.large],["thumb",processed.thumb],["medium",processed.medium],["large",processed.large]] as const) {
        const path=`${prefix}/${name}.webp`;const r=await bucket.upload(path,bytes,{contentType:"image/webp",upsert:false});
        if(r.error)throw new Error("Upload failed");written.push(path);
      }
      const metadata=await import("sharp").then(s=>s.default(processed.large).metadata());
      completionAttempted=true;
      const done=await storage.rpc("posting_v2_media_ready",{session_id:id,media_id:mediaId,attempt_id:media.attempt,file_size:processed.large.length,width:metadata.width!,height:metadata.height!});
      if(done.error||done.data!==true){
        const observed=await sessionCall(client,id,"read");
        if(!observed.media.some(m=>m.id===mediaId&&m.attempt===media.attempt&&m.state==="ready"))throw new Error("Upload not confirmed");
      }
      return Response.json({success:true},{headers:{"Cache-Control":"private, no-store"}});
    }catch(e){
      // A lost RPC response may already have committed readiness. Retain those
      // immutable objects for reconciliation/expiry, never delete on ambiguity.
      if(written.length&&!completionAttempted)await bucket.remove(written);throw e;
    }
  }catch(e){return postingError(e);}
}
export async function DELETE(request:Request,ctx:Context) {
 try {const {client}=await postingGuard(request);const id=uuid.parse((await ctx.params).id);const {media_id}=z.object({media_id:uuid}).strict().parse(await request.json());await sessionCall(client,id,"remove",media_id);return Response.json({success:true});}catch(e){return postingError(e);}
}
