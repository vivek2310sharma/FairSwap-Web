// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from "vitest";
import sharp from "sharp";
const m=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),remove:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/listings/mobiles/server",()=>({
 postingGuard:async()=>({client:{},user:{id:"11111111-1111-4111-8111-111111111111"}}),
 sessionCall:m.session,
 stagedPrefix:(...parts:string[])=>parts.join("/"),
 readPostingBody:async(r:Request)=>new Uint8Array(await r.arrayBuffer()),
 postingError:()=>Response.json({error:"Request not confirmed"},{status:400}),
}));
vi.mock("@/lib/supabase/service",()=>({createServiceRoleClient:()=>({storage:{from:()=>({upload:m.upload,remove:m.remove})},rpc:m.rpc})}));
import { POST } from "@/app/api/post-ad/sessions/[id]/media/route";
const session="22222222-2222-4222-8222-222222222222",media="33333333-3333-4333-8333-333333333333",attempt="44444444-4444-4444-8444-444444444444";
const snapshot=(state:string)=>({session:{id:session,state:"open"},media:[{id:media,attempt,state}]});
beforeEach(()=>{vi.resetAllMocks();m.upload.mockResolvedValue({error:null});m.remove.mockResolvedValue({error:null});m.session.mockResolvedValueOnce(snapshot("uploading")).mockResolvedValueOnce(snapshot("uploading"));});
async function request(){const bytes=await sharp({create:{width:32,height:32,channels:3,background:"green"}}).png().toBuffer();const form=new FormData();form.set("media_id",media);form.set("file",new File([new Uint8Array(bytes)],"photo.png",{type:"image/png"}));return new Request(`http://localhost/api/post-ad/sessions/${session}/media`,{method:"POST",body:form});}
describe("Staged photo completion uncertainty",()=>{
 it("reconciles a committed-but-lost response without deleting ready photos",async()=>{
  m.rpc.mockResolvedValue({data:null,error:{message:"Response lost"}});m.session.mockResolvedValueOnce(snapshot("ready"));
  const result=await POST(await request(),{params:Promise.resolve({id:session})});expect(result.status).toBe(200);expect(m.upload).toHaveBeenCalledTimes(4);expect(m.remove).not.toHaveBeenCalled();
 });
 it("retains immutable objects when readiness cannot be reconciled",async()=>{
  m.rpc.mockResolvedValue({data:null,error:{message:"Response lost"}});m.session.mockRejectedValueOnce(new Error("DB unavailable"));
  expect((await POST(await request(),{params:Promise.resolve({id:session})})).status).toBe(400);expect(m.remove).not.toHaveBeenCalled();
 });
 it("compensates only known partial writes before readiness was attempted",async()=>{
  m.upload.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{message:"Storage failure"}});
  expect((await POST(await request(),{params:Promise.resolve({id:session})})).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();expect(m.remove).toHaveBeenCalledWith([expect.stringContaining(`/${media}/${attempt}/original.webp`)]);
 });
});
