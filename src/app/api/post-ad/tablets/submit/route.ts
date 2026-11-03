import {z} from "zod";
import {tabletSchema,tabletCatalogueIssues} from "@/lib/listings/tablets/contract";
import {loadTabletCatalogue} from "@/lib/listings/tablets/server";
import {phoneRiskSignals} from "@/lib/listings/mobiles/contract";
import {postingGuard,postingError,readPostingBody} from "@/lib/listings/mobiles/server";
import {preparePostingMedia} from "@/lib/listings/prepare-posting-media";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request){try{
 if(Number(request.headers.get("content-length")??0)>24000)return Response.json({error:"Request too large"},{status:413});
 const {client,user}=await postingGuard(request);
 const parsed=tabletSchema.safeParse(JSON.parse(new TextDecoder().decode(await readPostingBody(request,24000))));
 if(!parsed.success)return Response.json({error:"Check the highlighted fields.",issues:parsed.error.issues.map(i=>({field:i.path[0]==="specs"?i.path.join("."):String(i.path[0]),message:i.message}))},{status:422});
 const payload=parsed.data;const catalogue=await loadTabletCatalogue(client);if(!catalogue)return Response.json({error:"Tablets posting is unavailable."},{status:409});
 const issues=tabletCatalogueIssues(payload,catalogue);if(issues.length)return Response.json({error:"Check the tablet variant.",issues},{status:422});
 const bound=await client.rpc("tablet_v1_session",{session_id:payload.session_id,operation:"read"});if(bound.error)throw Error("Invalid tablet photo session");
 const text=Object.fromEntries(Object.entries(payload).filter(([key])=>!["session_id","media_ids","city_id","locality_id"].includes(key)));
 if(phoneRiskSignals(JSON.stringify(text)).length)return Response.json({error:"Remove contact details, payment links and advance or courier fee requests. Use FairSwap chat and pickup."},{status:422});
 await preparePostingMedia(client,user,payload);
 const result=await client.rpc("submit_tablet_v1",{payload});
 if(result.error||result.data?.success!==true)throw new Error("Tablet submission unavailable");
 return Response.json({success:true,listing_id:z.string().uuid().parse(result.data.listing_id)},{headers:{"Cache-Control":"private, no-store"}});
}catch(error){return postingError(error);}}
