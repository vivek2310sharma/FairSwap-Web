// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const m = vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn(),policy:vi.fn(),account:vi.fn(),lookup:vi.fn(),maintenance:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:m.rpc,auth:{getUser:m.getUser},from:(table:string)=>{const filters:Record<string,string>={};const query={select:()=>query,eq:(key:string,value:string)=>{filters[key]=value;return query;},maybeSingle:()=>table==="user_accounts"?m.account():m.lookup({...filters})};return query;}})}));
vi.mock("@/lib/compliance/policy-acceptance",()=>({requireCurrentPolicyAcceptance:m.policy}));
vi.mock("@/lib/maintenance/seller-writes",()=>({isSellerWriteMaintenanceEnabled:m.maintenance}));
import { POST, GET, DELETE } from "@/app/api/post-ad/sessions/route";
import { sessionCall, postingError } from "@/lib/listings/mobiles/server";
const id="11111111-1111-4111-8111-111111111111";
const snapshot={session:{id,owner_id:id,listing_id:id,state:"open"},media:[]};
const request=(method:string,body:unknown={session_id:id},origin="http://localhost")=>new Request("http://localhost/api/post-ad/sessions",{method,headers:{origin,"Content-Type":"application/json"},...(method!=="GET"?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("POST_AD_MOBILES_V2_ENABLED","true");m.getUser.mockResolvedValue({data:{user:{id}},error:null});m.policy.mockResolvedValue({allowed:true});m.account.mockResolvedValue({data:{account_status:"active"},error:null});m.maintenance.mockReturnValue(false);m.lookup.mockResolvedValue({data:null,error:null});m.rpc.mockResolvedValue({data:snapshot,error:null});});
afterEach(()=>vi.unstubAllEnvs());
describe("Owner upload-session HTTP/RPC boundary",()=>{
 it.each(["UPLOAD_SESSION_LIMIT","Too many upload sessions"])("returns a safe specific capacity error for %s",async message=>{
  m.rpc.mockResolvedValue({data:null,error:{code:"P0001",message,details:"private SQL details",hint:"secret hint"}});
  const result=await POST(request("POST"));expect(result.status).toBe(429);const data=await result.json();expect(data.code).toBe("UPLOAD_SESSION_LIMIT");expect(data.error).toMatch(/five active/);expect(JSON.stringify(data)).not.toMatch(/private SQL|secret hint/);
 });
 it("retries the exact supplied session id and unchanged RPC signature",async()=>{
  await POST(request("POST"));await POST(request("POST"));expect(m.rpc.mock.calls).toEqual(Array(2).fill(["posting_v2_session",{session_id:id,operation:"create",media_id:null}]));
 });
 it("listing is owner guarded, returns safe metadata and never creates",async()=>{
  const choices={limit:5,sessions:[{id,state:"open",created_at:new Date().toISOString(),expires_at:new Date(Date.now()+10000).toISOString(),can_abandon:true,draft_protected:true,can_rotate:false}]};m.rpc.mockResolvedValue({data:choices,error:null});
  const result=await GET(request("GET"));expect(result.status).toBe(200);expect(await result.json()).toEqual(choices);expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:null,operation:"list_recovery",media_id:null});expect(result.headers.get("Cache-Control")).toBe("private, no-store");
 });
 it("explicit release delegates to the atomic empty-only RPC and exposes a protected conflict",async()=>{
  m.rpc.mockResolvedValue({data:null,error:{code:"PT409",message:"UPLOAD_SESSION_PROTECTED"}});const result=await DELETE(request("DELETE"));expect(result.status).toBe(409);expect((await result.json()).code).toBe("UPLOAD_SESSION_PROTECTED");expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:id,operation:"abandon_empty",media_id:null});
 });
 it.each(["Upload session expired","UPLOAD_SESSION_EXPIRED"])("retains actionable expiry for %s",async message=>{
  m.rpc.mockResolvedValue({data:null,error:{code:"PT410",message}});const result=await POST(request("POST"));expect(result.status).toBe(410);expect((await result.json()).code).toBe("UPLOAD_SESSION_EXPIRED");
 });
 it("does not leak unexpected SQL errors, malformed RPC results or another owner's existence",async()=>{
  const client={rpc:m.rpc} as unknown as SupabaseClient;
  for(const value of [{data:null,error:{code:"42501",message:"UPLOAD_SESSION_UNAVAILABLE"}},{data:null,error:{code:"P0001",message:"private-table: sensitive context"}},{data:{},error:null}]){
   m.rpc.mockResolvedValue(value);try{await sessionCall(client,id,"read");throw Error("Expected rejection");}catch(error){const result=postingError(error);expect(result.status).toBe(503);expect((await result.json()).code).toBe("UPLOAD_SESSION_UNAVAILABLE");}
  }
 });
 it("origin, auth, account, policy and maintenance checks protect session mutations",async()=>{
  expect((await DELETE(request("DELETE",{session_id:id},"https://attacker.invalid"))).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();
  m.getUser.mockResolvedValueOnce({data:{user:null},error:null});await GET(request("GET"));expect(m.rpc).not.toHaveBeenCalled();
  m.account.mockResolvedValueOnce({data:{account_status:"suspended"},error:null});await POST(request("POST"));expect(m.rpc).not.toHaveBeenCalled();
  m.policy.mockResolvedValueOnce({allowed:false});await DELETE(request("DELETE"));expect(m.rpc).not.toHaveBeenCalled();
  m.maintenance.mockReturnValue(true);await DELETE(request("DELETE"));expect(m.rpc).not.toHaveBeenCalled();
 });
 it("rejects owner injection and oversized release bodies before RPC access",async()=>{
  expect((await DELETE(request("DELETE",{session_id:id,owner_id:id}))).status).toBe(400);
  expect((await DELETE(request("DELETE",{session_id:id,padding:"x".repeat(1100)}))).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();
 });
});

it("legacy recovery metadata defaults to protected; clients cannot mark their existing draft disposable",async()=>{
 m.rpc.mockResolvedValue({data:{limit:5,sessions:[{id,state:"open",created_at:new Date().toISOString(),expires_at:new Date(Date.now()+10000).toISOString(),can_abandon:true}]},error:null});
 const data=await (await GET(request("GET"))).json();expect(data.sessions[0].draft_protected).toBe(true);expect(data.sessions[0].can_rotate).toBe(false);
 m.rpc.mockClear();expect((await POST(request("POST",{session_id:id,draft_protected:false}))).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();
});

it.each(["create_empty","claim_draft"])("the guarded route delegates explicit %s without accepting security metadata",async operation=>{
 const response=await POST(request("POST",{session_id:id,operation}));expect(response.status).toBe(200);expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:id,operation,media_id:null});
});
it.each(["reserve","prepare","abandon_empty","list_recovery"])("POST refuses operation %s outside its explicit contract",async operation=>{
 expect((await POST(request("POST",{session_id:id,operation}))).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();
});

it("acquire resumes an owned prepared nonce after a lost claim without allocating a duplicate",async()=>{
 const prepared="22222222-2222-4222-8222-222222222222";
 m.lookup.mockResolvedValueOnce({data:null,error:null}).mockResolvedValueOnce({data:{id:prepared},error:null});
 m.rpc.mockResolvedValue({data:{...snapshot,session:{...snapshot.session,id:prepared,draft_protected:true}},error:null});
 const result=await POST(request("POST",{session_id:id,operation:"acquire_draft"}));expect(result.status).toBe(200);expect((await result.json()).session.id).toBe(prepared);
 expect(m.lookup.mock.calls).toEqual([[{owner_id:id,id}],[{owner_id:id,empty_request_id:id}]]);
 expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:prepared,operation:"claim_draft",media_id:null});
});
it("acquire preserves a real existing draft id before resolving any unrelated empty nonce",async()=>{
 m.lookup.mockResolvedValue({data:{id},error:null});expect((await POST(request("POST",{session_id:id,operation:"acquire_draft"}))).status).toBe(200);
 expect(m.lookup).toHaveBeenCalledOnce();expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:id,operation:"create",media_id:null});
});
it("acquire fails closed on metadata lookup errors instead of allocating another session",async()=>{
 m.lookup.mockResolvedValue({data:null,error:{message:"private SQL"}});const result=await POST(request("POST",{session_id:id,operation:"acquire_draft"}));expect(result.status).toBe(503);expect((await result.json()).code).toBe("UPLOAD_SESSION_UNAVAILABLE");expect(m.rpc).not.toHaveBeenCalled();
});

it("blank preparation reuses and protects an existing real session instead of misclassifying it",async()=>{
 m.lookup.mockResolvedValue({data:{id},error:null});const result=await POST(request("POST",{session_id:id,operation:"create_empty"}));expect(result.status).toBe(200);
 expect(m.rpc).toHaveBeenCalledExactlyOnceWith("posting_v2_session",{session_id:id,operation:"create",media_id:null});
});
