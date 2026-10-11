import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isCarsEnabled } from "@/lib/listings/two-wheeler/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
const querySchema = z.object({ category: z.string().uuid(), version: z.string().uuid(), brand: z.string().uuid().optional(), selected: z.string().uuid().optional(), search: z.string().max(100).default(""), offset: z.coerce.number().int().min(0).max(10000).default(0), limit: z.coerce.number().int().min(1).max(25).default(25), view: z.enum(["mapped","unresolved","review"]).default("mapped") }).strict();
export async function GET(request: Request) {
  if (!isCarsEnabled()) return Response.json({error:"Unavailable"},{status:404});
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(k=>params.getAll(k).length!==1)) return Response.json({error:"Repeated query parameter"},{status:400});
  const query=querySchema.safeParse(Object.fromEntries(params));
  if (!query.success) return Response.json({error:"Invalid catalogue query"},{status:400});
  const client=await createClient() as SupabaseClient<Database>;
  const {data:{user}}=await client.auth.getUser();
  if (!user) return Response.json({error:"Sign in required"},{status:401});
  const q=query.data;
  const {data,error}=await client.rpc("lookup_car_catalogue",{p_category_id:q.category,p_version_id:q.version,p_brand_id:q.brand,p_search:q.search,p_offset:q.offset,p_limit:q.limit,p_view:q.view,p_selected_id:q.selected});
  return Response.json(error ? {error:"Catalogue lookup failed"} : data,{status:error?(error.code==="22023"?400:503):200,headers:{"Cache-Control":"private, no-store"}});
}
