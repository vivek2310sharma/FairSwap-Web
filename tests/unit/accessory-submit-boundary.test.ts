// @vitest-environment node
import {beforeEach,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({guard:vi.fn(),catalogue:vi.fn(),media:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/listings/mobiles/server",()=>({postingGuard:m.guard,readPostingBody:async(r:Request)=>new Uint8Array(await r.arrayBuffer()),postingError:()=>Response.json({error:"Request rejected"},{status:400})}));
vi.mock("@/lib/listings/accessories/server",()=>({loadAccessoryCatalogue:m.catalogue}));
vi.mock("@/lib/listings/prepare-posting-media",()=>({preparePostingMedia:m.media}));
import {POST} from "@/app/api/post-ad/accessories/submit/route";
import {blankAccessoryDraft} from "@/components/listings/posting/accessory-wizard";
const id="11111111-1111-4111-8111-111111111111";
const valid={...blankAccessoryDraft(),session_id:id,type:"phone-case",brand:"Spigen",originality:"third_party",compatibility:{state:"seller",device_brand:"Samsung",device_model:"Galaxy S24",standard:""},specs:{variant:"6.2 inch",material:"TPU",colour:"Black",magnetic:"No"},bundle_contents:"One case",condition:"good",working:"not_applicable",safety:"not_applicable",title:"Case for S24",description:"Carefully used with visible wear.",price_paise:50000,pin_code:"560034",city_id:id,locality_id:id,media_ids:[id]};
const request=(value:unknown)=>new Request("http://localhost/api/post-ad/accessories/submit",{method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify(value)});
beforeEach(()=>{vi.clearAllMocks();m.guard.mockResolvedValue({client:{rpc:m.rpc},user:{id}});m.catalogue.mockResolvedValue({enabled:true});m.rpc.mockResolvedValue({data:{success:true,listing_id:id},error:null});});
it("calls only the accessory RPC with fully parsed category payload",async()=>{expect((await POST(request(valid))).status).toBe(200);expect(m.media).toHaveBeenCalled();expect(m.rpc).toHaveBeenCalledWith("submit_accessory_v1",{payload:valid});});
it.each([{selection:{category:"mobiles",subcategory:"mobile-phones",version:2}},{media_ids:[]},{safety:"hazardous"},{price_paise:0},{originality:"verified"}])("rejects invalid data before media: %j",async change=>{expect((await POST(request({...valid,...change}))).status).toBe(422);expect(m.media).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();});
it("checks auth and posting gates before catalogue/media",async()=>{m.guard.mockRejectedValue(new Error("No account"));expect((await POST(request(valid))).status).toBe(400);expect(m.media).not.toHaveBeenCalled();expect(m.catalogue).not.toHaveBeenCalled();});
it("fails closed for inactive category",async()=>{m.catalogue.mockResolvedValue(null);expect((await POST(request(valid))).status).toBe(409);expect(m.media).not.toHaveBeenCalled();});
it("preserves payment/moderation boundaries in structured fields",async()=>{expect((await POST(request({...valid,product_model:"Pay seller@okaxis"}))).status).toBe(422);expect(m.media).not.toHaveBeenCalled();});
