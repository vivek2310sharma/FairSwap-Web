import {accessorySchema} from "@/lib/listings/accessories/contract";
import {loadAccessoryCatalogue} from "@/lib/listings/accessories/server";
import {phoneRiskSignals} from "@/lib/listings/mobiles/contract";
import {postingGuard,postingError,readPostingBody} from "@/lib/listings/mobiles/server";
import {preparePostingMedia} from "@/lib/listings/prepare-posting-media";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request){try{
 if(Number(request.headers.get("content-length")??0)>24000)return Response.json({error:"Request too large"},{status:413});
 const {client,user}=await postingGuard(request);
 const parsed=accessorySchema.safeParse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,24000))));
 if(!parsed.success)return Response.json({error:"Check the highlighted fields.",issues:parsed.error.issues.map(i=>({field:i.path[0]==="specs"?i.path.join("."):String(i.path[0]),message:i.message}))},{status:422});
 const payload=parsed.data;if(!await loadAccessoryCatalogue(client))return Response.json({error:"Accessories posting is unavailable."},{status:409});
 const text=Object.fromEntries(Object.entries(payload).filter(([key])=>!["session_id","media_ids","city_id","locality_id"].includes(key)));
 if(phoneRiskSignals(JSON.stringify(text)).length)return Response.json({error:"Remove contact details, payment links and advance or courier fee requests. Use FairSwap chat and pickup."},{status:422});
 await preparePostingMedia(client,user,payload);
 const result=await client.rpc("submit_accessory_v1",{payload});
 if(result.error||result.data?.success!==true)throw new Error("Accessory submission unavailable");
 return Response.json({success:true,listing_id:result.data.listing_id},{headers:{"Cache-Control":"private, no-store"}});
}catch(error){return postingError(error);}}
