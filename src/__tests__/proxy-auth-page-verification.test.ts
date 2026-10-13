import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest,NextResponse} from "next/server";
import type {CookieMethodsServer} from "@supabase/ssr";
import {proxy} from "@/proxy";
const sdk=vi.hoisted(()=>({cookies:undefined as CookieMethodsServer|undefined,getClaims:vi.fn(),getUser:vi.fn(),rpc:vi.fn()}));
vi.mock("@supabase/ssr",()=>({createServerClient:vi.fn((_url,_key,options:{cookies:CookieMethodsServer})=>{sdk.cookies=options.cookies;return {auth:{getClaims:sdk.getClaims,getUser:sdk.getUser},rpc:sdk.rpc};})}));
beforeEach(()=>{vi.resetAllMocks();sdk.getClaims.mockResolvedValue({data:{claims:{sub:"fixture-owner"}},error:null});sdk.getUser.mockResolvedValue({data:{user:{id:"fixture-owner"}},error:null});sdk.rpc.mockResolvedValue({data:true,error:null});vi.stubGlobal("fetch",vi.fn(()=>{throw Error("Network forbidden")}));});
afterEach(()=>vi.unstubAllGlobals());
const request=(path:string)=>new NextRequest(`https://fixture.test${path}`,{headers:{cookie:"unrelated=inert-keep", "x-request-id":"untrusted-id"}});
describe.each(["/auth/sign-in","/auth/sign-up"])("authoritative auth-page verification %s",path=>{
  it.each([
    {data:{user:null},error:{name:"AuthSessionMissingError",status:400}},
    {data:{user:null},error:null},
    {data:{user:{id:"fixture-owner"}},error:{name:"AuthApiError",status:503}},
  ])("allows normal auth page for missing user or returned error: %j",async result=>{sdk.getUser.mockResolvedValue(result);const res=await proxy(request(path+"?next=%2Faccount%2Flistings%2Fnew%3Fmacro%3Dgoods"));expect(res).toBeInstanceOf(NextResponse);expect(res.status).toBe(200);expect(res.headers.get("location")).toBeNull();expect(sdk.getUser).toHaveBeenCalledOnce();expect(res.headers.getSetCookie()).toEqual([]);expect(sdk.rpc).not.toHaveBeenCalled();});
  it("keeps transient thrown Auth errors on the sign-in/sign-up page without clearing sessions",async()=>{sdk.getUser.mockRejectedValue(Error("Synthetic network failure"));const res=await proxy(request(path));expect(res.status).toBe(200);expect(res.headers.get("location")).toBeNull();expect(res.headers.getSetCookie()).toEqual([]);expect(res.headers.get("x-middleware-request-cookie")).toContain("unrelated=inert-keep");});
  it("retains the healthy destination only after verified user resolution",async()=>{const res=await proxy(request(path+"?next=%2Fsearch"));expect(res.status).toBe(307);expect(new URL(res.headers.get("location")!).pathname).toBe("/account");expect(sdk.getUser).toHaveBeenCalledOnce();expect(sdk.rpc).not.toHaveBeenCalled();expect(res.headers.get("x-request-id")).not.toBe("untrusted-id");});
  it.each([true,false])("serializes cookies from both SDK calls, verified=%s",async verified=>{
    const claimsCookie={name:"fixture-claims",value:"inert-refresh",options:{path:"/",httpOnly:true,sameSite:"lax" as const}};
    const userCookie={name:"fixture-user",value:"inert-user-refresh",options:{path:"/",httpOnly:true,sameSite:"lax" as const}};
    sdk.getClaims.mockImplementation(async()=>{sdk.cookies!.setAll!([claimsCookie],{Expires:"0",Pragma:"no-cache"});return {data:{claims:{sub:"fixture-owner"}},error:null};});
    sdk.getUser.mockImplementation(async()=>{sdk.cookies!.setAll!([userCookie],{});return {data:{user:verified?{id:"fixture-owner"}:null},error:verified?null:{name:"AuthSessionMissingError"}};});
    const res=await proxy(request(path));const expected=new NextResponse();expected.cookies.set(claimsCookie.name,claimsCookie.value,claimsCookie.options);expected.cookies.set(userCookie.name,userCookie.value,userCookie.options);
    expect(res.status).toBe(verified?307:200);expect(res.headers.getSetCookie()).toEqual(expected.headers.getSetCookie());expect(res.headers.get("cache-control")).toContain("no-store");expect(res.headers.get("expires")).toBe("0");expect(res.headers.get("pragma")).toBe("no-cache");expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
    if(!verified){expect(res.headers.get("x-middleware-request-cookie")).toContain("fixture-user=inert-user-refresh");expect(res.headers.get("x-middleware-request-cookie")).toContain("unrelated=inert-keep");}else expect(res.headers.get("x-middleware-set-cookie")).toBeNull();
  });
});
it.each(["/search","/account/listings/new?macro=goods","/account/privacy","/admin/users"])("adds no getUser lookup to %s",async path=>{await proxy(request(path));expect(sdk.getUser).not.toHaveBeenCalled();});
it("does not call getUser on an auth page without claims",async()=>{sdk.getClaims.mockResolvedValue({data:{claims:null},error:null});const res=await proxy(request("/auth/sign-in?next=%2Faccount"));expect(res.status).toBe(200);expect(sdk.getUser).not.toHaveBeenCalled();});
