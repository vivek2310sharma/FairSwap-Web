import { mobileSchema, phoneRiskSignals } from "@/lib/listings/mobiles/contract";
import { loadMobileCatalogue, postingGuard, postingError, readPostingBody } from "@/lib/listings/mobiles/server";
import {preparePostingMedia} from "@/lib/listings/prepare-posting-media";
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
  await preparePostingMedia(client,user,payload);
  const result=await client.rpc("submit_mobile_v2",{payload});
  if(result.error||result.data?.success!==true)throw new Error("Submission unavailable");
  return Response.json({success:true,listing_id:result.data.listing_id},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return postingError(e);}
}
