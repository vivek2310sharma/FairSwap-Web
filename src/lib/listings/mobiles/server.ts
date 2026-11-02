import "server-only";
import { z } from "zod";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PostingSessionError, sessionErrors, sessionRecoveryChoicesSchema } from "./session-errors";
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
  if (r.error) throw sessionRpcError(r.error);
  const parsed = sessionSchema.safeParse(r.data);
  if (!parsed.success) throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  return parsed.data;
}
function sessionRpcError(error: {code?:string;message?:string}) {
  // Only known constants/legacy messages may cross the RPC boundary. Never echo SQL.
  if (error.message === "UPLOAD_SESSION_LIMIT" || error.message === "Too many upload sessions") return new PostingSessionError("UPLOAD_SESSION_LIMIT");
  if (error.message === "UPLOAD_SESSION_EXPIRED" || error.message === "Upload session expired" || error.message === "Upload session is expiring; start a new posting") return new PostingSessionError("UPLOAD_SESSION_EXPIRED");
  if (error.message === "UPLOAD_SESSION_PROTECTED") return new PostingSessionError("UPLOAD_SESSION_PROTECTED");
  if (error.message === "Upload in progress; retry shortly" || error.message === "Submission is being finalized") return new PostingSessionError("UPLOAD_SESSION_BUSY");
  return new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
}
export async function sessionRecoveryChoices(client: SupabaseClient) {
  const r = await client.rpc("posting_v2_session", {session_id:null,operation:"list_recovery",media_id:null});
  if (r.error) throw sessionRpcError(r.error);
  const parsed = sessionRecoveryChoicesSchema.safeParse(r.data);
  if (!parsed.success) throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  return parsed.data;
}
/** A pristine browser view must not relabel an existing server draft as empty. */
export async function prepareEmptySession(client: SupabaseClient, owner: string, nonce: string) {
  const existing=await client.from("posting_upload_sessions").select("id").eq("owner_id",owner).eq("id",nonce).maybeSingle();
  if(existing.error)throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  return sessionCall(client,nonce,existing.data?"create":"create_empty");
}
/** Resolve only this account's prior preparation nonce; never guess an unrelated blank. */
export async function acquireDraftSession(client: SupabaseClient, owner: string, nonce: string) {
  const existing=await client.from("posting_upload_sessions").select("id").eq("owner_id",owner).eq("id",nonce).maybeSingle();
  if(existing.error)throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  if(existing.data)return sessionCall(client,nonce,"create");
  const lookup=await client.from("posting_upload_sessions").select("id").eq("owner_id",owner).eq("empty_request_id",nonce).maybeSingle();
  if(lookup.error)throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
  if(lookup.data){
    const id=z.string().uuid().safeParse(lookup.data.id);
    if(!id.success)throw new PostingSessionError("UPLOAD_SESSION_UNAVAILABLE");
    return sessionCall(client,id.data,"claim_draft");
  }
  return sessionCall(client,nonce,"create");
}
export function postingError(error: unknown, status = 400) {
  if (error instanceof PostingSessionError) return Response.json({error:error.message,code:error.code},{status:sessionErrors[error.code].status,headers:{"Cache-Control":"private, no-store"}});
  const message = error instanceof Error && /^(Mobile posting|Request origin|Posting is temporarily|Sign in|Current policy|An active|Upload in progress|Session unavailable)/.test(error.message) ? error.message : "Could not complete the request. Your saved details are safe; please retry.";
  return Response.json({error:message},{status,headers:{"Cache-Control":"private, no-store"}});
}
export const stagedPrefix = (owner: string, session: string, media: string, attempt: string) => `${owner}/${session}/${media}/${attempt}`;
