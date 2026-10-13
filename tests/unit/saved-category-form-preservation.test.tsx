// Isolated runtime-contract proof: real form and loader with mocked I/O.
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import ListingForm from "@/components/listings/ListingForm";
import type {Category,CategoryAttribute,City,Listing} from "@/types/listing";
import {loadSavedCategoryContext} from "@/lib/listings/saved-category-context";

const actions=vi.hoisted(()=>({update:vi.fn(),create:vi.fn(),submit:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock("@/app/account/listings/actions",()=>({updateListingAction:actions.update,createDraftListingAction:actions.create,submitListingAction:actions.submit}));
vi.mock("@/components/listings/MediaUploader",()=>({default:()=>null}));
vi.mock("@/components/listings/PincodeLocationPicker",()=>({default:()=> <><input name="city_id" value="33333333-3333-4333-8333-333333333333" readOnly/><input name="pin_code" value="302021" readOnly/></>}));
afterEach(()=>{cleanup();vi.clearAllMocks();});

it("reference refresh preserves entered common fields and saved/edited attribute values in the existing form payload",async()=>{
  // Full synthetic rows supply their own metadata. The minimal RPC projection
  // is never asserted/cast to a full DB row or padded with invented defaults.
  const category:Category={id:"22222222-2222-4222-8222-222222222222",name:"Saved Goods",slug:"saved-goods",description:null,icon:null,sort_order:0,is_active:false,created_at:"2026-10-01T00:00:00Z",updated_at:"2026-10-01T00:00:00Z"};
  const attribute:CategoryAttribute={id:"44444444-4444-4444-8444-444444444444",category_id:category.id,name:"brand",label:"Brand",value_type:"text",is_required:true,is_filterable:false,options:null,validation_rules:null,sort_order:1,created_at:"2026-10-01T00:00:00Z"};
  const city:City={id:"33333333-3333-4333-8333-333333333333",name:"Synthetic city",slug:"synthetic-city",state:"Synthetic state",is_active:true,created_at:"2026-10-01T00:00:00Z"};
  const listing:Listing={id:"11111111-1111-4111-8111-111111111111",seller_id:"synthetic-owner",slug:"synthetic-item",category_id:category.id,city_id:city.id,locality_id:null,title:"Saved title",description:"Saved description",condition:"good",price_type:"fixed",price_paise:123400,pin_code:"302021",landmark:null,category_attributes:{brand:"Saved brand"},status:"draft",cover_photo_id:null,rejection_reason:null,created_at:"2026-10-01T00:00:00Z",updated_at:"2026-10-01T00:00:00Z",submitted_at:null,published_at:null,expires_at:null,sold_at:null,revision:1,renewal_count:0,removal_reason:null,removed_by:null};
  actions.update.mockResolvedValue({});
  const form=render(<ListingForm categories={[category]} allAttributes={[attribute]} cities={[city]} initialListing={listing} postAdEntry="goods"/>);
  expect(screen.getByLabelText(/Brand/)).toHaveValue("Saved brand");
  fireEvent.change(screen.getByLabelText(/Brand/),{target:{value:"Entered brand"}});
  fireEvent.change(screen.getByLabelText(/Title/),{target:{value:"Entered title"}});
  fireEvent.change(screen.getByLabelText(/Description/),{target:{value:"Entered description"}});
  fireEvent.change(screen.getByLabelText("Price (₹ Rupees) *"),{target:{value:"2345"}});
  const result=await loadSavedCategoryContext({rpc:async()=>({data:{category:{id:category.id,name:category.name,is_active:false,macro_category:"goods",new_listing_enabled:false},attributes:[{id:attribute.id,category_id:category.id,name:attribute.name,label:attribute.label,value_type:attribute.value_type,is_required:true,options:null,validation_rules:null,sort_order:1}]},error:null})},listing.id);
  expect(result.status).toBe("ready");
  if(result.status!=="ready")throw Error("Reference fixture rejected");
  form.rerender(<ListingForm categories={[{...category,...result.context.category}]} allAttributes={[{...attribute,...result.context.attributes[0]}]} cities={[city]} initialListing={listing} postAdEntry="goods"/>);
  fireEvent.click(screen.getByRole("button",{name:"Save Changes"}));
  await waitFor(()=>expect(actions.update).toHaveBeenCalledOnce());
  expect(actions.update.mock.calls[0][0]).toBe(listing.id);
  const payload=actions.update.mock.calls[0][1] as FormData;
  expect(Object.fromEntries(payload)).toMatchObject({category_id:category.id,title:"Entered title",description:"Entered description",condition:"good",price_type:"fixed",price_paise:"234500",pin_code:"302021",city_id:city.id,category_attributes:JSON.stringify({brand:"Entered brand"})});
  expect(actions.create).not.toHaveBeenCalled();
  expect(actions.submit).not.toHaveBeenCalled();
});
