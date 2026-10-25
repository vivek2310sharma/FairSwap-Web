import "server-only";
import { z } from "zod";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { catalogueSchema } from "./contract";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { isSellerWriteMaintenanceEnabled } from "@/lib/maintenance/seller-writes";

export function mobilesEnabled() { return process.env.POST_AD_MOBILES_V2_ENABLED === "true"; }
export const loadMobileCatalogue = cache(async (client: SupabaseClient) => {
  if (!mobilesEnabled()) return null;
  const result = await client.rpc("posting_v2_catalogue");
  const parsed = catalogueSchema.safeParse(result.data);
  return !result.error && parsed.success && parsed.data.enabled ? parsed.data : null;
});
/** Bound streamed bodies too; Content-Length alone is attacker-controlled. */
export async function readPostingBody(request:Request,limit:number) {
  const reader=request.body?.getReader();if(!reader)throw new Error("Missing request body");
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error("Request too large");}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export const sessionSchema = z.object({session:z.object({id:z.string().uuid(),owner_id:z.string().uuid(),listing_id:z.string().uuid(),state:z.enum(["open","finalizing","submitted","expired","cleaned"])}).passthrough(),media:z.array(z.object({id:z.string().uuid(),session_id:z.string().uuid(),attempt:z.string().uuid(),state:z.enum(["uploading","ready","removed"]),file_size:z.number().nullable(),width:z.number().nullable(),height:z.number().nullable()}).passthrough()).max(8)});
export type UploadSession = z.infer<typeof sessionSchema>;
export async function postingGuard(request: Request, mutation = true) {
  if (!mobilesEnabled()) throw new Error("Mobile posting is coming soon.");
  if (mutation) {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Request origin rejected.");
    if (isSellerWriteMaintenanceEnabled()) throw new Error("Posting is temporarily unavailable.");
  }
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Sign in to continue.");
  const policy = await requireCurrentPolicyAcceptance(client);
  if (!policy.allowed) throw new Error("Current policy acceptance is required.");
  const account = await client.from("user_accounts").select("account_status").eq("user_id",user.id).maybeSingle();
  if (account.error || account.data?.account_status !== "active") throw new Error("An active account is required.");
  return {client, user};
}
export async function sessionCall(client: SupabaseClient, session_id: string, operation: string, media_id?: string) {
  const r = await client.rpc("posting_v2_session", {session_id,operation,media_id:media_id ?? null});
  const parsed = sessionSchema.safeParse(r.data);
  if (r.error || !parsed.success) throw new Error(r.error?.code === "PT409" ? "Upload in progress. Retry in two minutes." : "Session unavailable. Retry or start a new posting.");
  return parsed.data;
}
export function postingError(error: unknown, status = 400) {
  const message = error instanceof Error && /^(Mobile posting|Request origin|Posting is temporarily|Sign in|Current policy|An active|Upload in progress|Session unavailable)/.test(error.message) ? error.message : "Could not complete the request. Your saved details are safe; please retry.";
  return Response.json({error:message},{status,headers:{"Cache-Control":"private, no-store"}});
}
export const stagedPrefix = (owner: string, session: string, media: string, attempt: string) => `${owner}/${session}/${media}/${attempt}`;
