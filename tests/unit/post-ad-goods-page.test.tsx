import React from "react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import NewListingPage from "@/app/account/listings/new/page";
const m=vi.hoisted(()=>({enabled:vi.fn(),references:vi.fn(),locations:vi.fn(),entry:vi.fn(),form:vi.fn(),from:vi.fn(),getUser:vi.fn(),redirect:vi.fn((path:string):never=>{throw Error(`REDIRECT:${path}`);})}));
vi.mock("next/navigation",()=>({redirect:m.redirect}));
vi.mock('@/lib/listings/post-ad-locations',()=>({loadPostAdLocations:m.locations}));
vi.mock("@/lib/listings/post-ad-server",()=>({isGoodsPostAdEnabled:m.enabled,loadGoodsReferences:m.references}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:m.getUser},from:m.from})}));
vi.mock("@/components/listings/GoodsPostAdEntry",()=>({default:(p:unknown)=>{m.entry(p);return <div>Real Goods entry</div>}}));
vi.mock("@/components/listings/ListingForm",()=>({default:(p:unknown)=>{m.form(p);return <div>Original form</div>}}));
beforeEach(()=>{vi.clearAllMocks();m.getUser.mockResolvedValue({data:{user:{id:"owner"}}});m.enabled.mockReturnValue(true);m.references.mockResolvedValue({status:"ready",categories:[],attributes:[],cities:[]});m.locations.mockResolvedValue({status:'ready',cities:[]});});afterEach(cleanup);
it("ON serves real-data entry without legacy reference queries",async()=>{render(await NewListingPage({searchParams:Promise.resolve({macro:"goods"})}));expect(screen.getByText("Real Goods entry")).toBeVisible();expect(m.references).toHaveBeenCalledOnce();expect(m.from).not.toHaveBeenCalled();expect(m.form).not.toHaveBeenCalled();});
it.each([
  {entry:"legacy"},{entry:["legacy","legacy"]},{entry:"goods"},{entry:"unknown"},
])("ON redirects retired creation URL $entry to the main-category selector",async(query)=>{
  await expect(NewListingPage({searchParams:Promise.resolve(query)}))
    .rejects.toThrow("REDIRECT:/account/listings/new");
  expect(m.redirect).toHaveBeenCalledWith("/account/listings/new");
  expect(m.references).not.toHaveBeenCalled();
  expect(m.locations).not.toHaveBeenCalled();
  expect(m.from).not.toHaveBeenCalled();
  expect(m.form).not.toHaveBeenCalled();
  expect(m.entry).not.toHaveBeenCalled();
});
it('passes shared locations even when Goods-specific references fail',async()=>{m.references.mockResolvedValue({status:'error',message:'Goods-specific failure'});const locations={status:'error',message:'Shared location failure'};m.locations.mockResolvedValue(locations);render(await NewListingPage({searchParams:Promise.resolve({macro:'property'})}));expect(m.locations).toHaveBeenCalledOnce();expect(m.entry).toHaveBeenCalledWith(expect.objectContaining({references:{status:'error',message:'Goods-specific failure'},locations}));expect(m.references.mock.calls[0][2]).toBeInstanceOf(Promise);});
it('OFF retains original queries and never starts shared integration loading',async()=>{m.enabled.mockReturnValue(false);const q={select:vi.fn(()=>q),eq:vi.fn(()=>q),order:vi.fn(async()=>({data:[]}))};m.from.mockReturnValue(q);render(await NewListingPage({searchParams:Promise.resolve({macro:'property'})}));expect(m.locations).not.toHaveBeenCalled();expect(m.references).not.toHaveBeenCalled();expect(m.entry).not.toHaveBeenCalled();expect(m.from.mock.calls).toEqual([['categories'],['category_attributes'],['cities']]);});
