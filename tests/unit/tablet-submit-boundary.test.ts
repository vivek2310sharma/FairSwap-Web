// @vitest-environment node
import {beforeEach,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({guard:vi.fn(),catalogue:vi.fn(),rpc:vi.fn(),prepare:vi.fn()}));
vi.mock("@/lib/listings/mobiles/server",()=>({postingGuard:m.guard,postingError:()=>Response.json({error:"Rejected"},{status:400}),readPostingBody:async(r:Request)=>new Uint8Array(await r.arrayBuffer())}));
vi.mock("@/lib/listings/tablets/server",()=>({loadTabletCatalogue:m.catalogue}));
vi.mock("@/lib/listings/prepare-posting-media",()=>({preparePostingMedia:m.prepare}));
import {POST} from "@/app/api/post-ad/tablets/submit/route";
import {valid,catalogue} from "./tablet-fixture";
const request=(v:unknown)=>new Request('http://localhost/api/post-ad/tablets/submit',{method:"POST",headers:{origin:"http://localhost"},body:JSON.stringify(v)});
beforeEach(()=>{vi.clearAllMocks();m.guard.mockResolvedValue({client:{rpc:m.rpc},user:{id:valid.session_id}});m.catalogue.mockResolvedValue(catalogue);m.rpc.mockResolvedValue({data:{success:true,listing_id:valid.session_id},error:null});});
it.each([{connectivity:"five_g"},{transfer_lock_status:"locked"},{imei:"forged"},{model_id:"22222222-2222-4222-8222-222222222222"},{description:"Send advance payment to seller@okaxis"}])("rejects tablet forgery before media preparation: %j",async(p)=>{expect((await POST(request({...valid,...p}))).status).toBe(422);expect(m.prepare).not.toHaveBeenCalled();});
it("fails closed on disabled catalogue or unbound session",async()=>{m.catalogue.mockResolvedValue(null);expect((await POST(request(valid))).status).toBe(409);m.catalogue.mockResolvedValue(catalogue);m.rpc.mockResolvedValue({error:{message:"Cross-category session"}});expect((await POST(request(valid))).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();});
it("uses dedicated RPC after category binding and media checks",async()=>{expect((await POST(request(valid))).status).toBe(200);expect(m.rpc).toHaveBeenNthCalledWith(1,"tablet_v1_session",{session_id:valid.session_id,operation:"read"});expect(m.prepare).toHaveBeenCalledTimes(1);expect(m.rpc).toHaveBeenLastCalledWith("submit_tablet_v1",{payload:valid});});
it("auth/account/policy rejection cannot reach media",async()=>{m.guard.mockRejectedValue(Error("denied"));expect((await POST(request(valid))).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();});
