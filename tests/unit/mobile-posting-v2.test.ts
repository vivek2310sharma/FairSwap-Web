import { describe, expect, it } from "vitest";
import { mobileSchema, phoneRiskSignals, mobileTitle, selectPostingCategory, type MobileCatalogue } from "@/lib/listings/mobiles/contract";
const id="11111111-1111-4111-8111-111111111111";
const valid={selection:{category:"mobiles",subcategory:"mobile-phones",version:2},session_id:id,trade:"sell",brand_id:id,model_id:id,other_model:"",storage:"128 GB",ram:"",condition:"good",included:[],warranty_until:"",title:"iPhone 15",description:"Used carefully with no repairs.",price_paise:2000000,negotiable:false,pin_code:"560034",city_id:id,locality_id:id,media_ids:[id],plan_id:"free-v1"};
describe("Mobile posting contract",()=>{
 it("accepts Sell and preserves the fixed price enum boundary",()=>expect(mobileSchema.safeParse(valid).success).toBe(true));
 it("requires zero price and no negotiable toggle for giveaways",()=>{
  expect(mobileSchema.safeParse({...valid,trade:"giveaway"}).success).toBe(false);
  expect(mobileSchema.safeParse({...valid,trade:"giveaway",price_paise:0}).success).toBe(true);
  expect(mobileSchema.safeParse({...valid,trade:"giveaway",price_paise:0,negotiable:true}).success).toBe(false);
 });
 it("rejects zero Sell price, duplicate photos, no photos and unrecognized plans",()=>{
  for(const changes of [{price_paise:0},{media_ids:[]},{media_ids:[id,id]},{plan_id:"premium"},{fulfillment:"courier"}])expect(mobileSchema.safeParse({...valid,...changes}).success).toBe(false);
 });
 it("requires a valid warranty month only when warranty is declared",()=>{
  expect(mobileSchema.safeParse({...valid,included:["Under warranty"]}).success).toBe(false);
  expect(mobileSchema.safeParse({...valid,included:["Under warranty"],warranty_until:"2099-13"}).success).toBe(false);
  expect(mobileSchema.safeParse({...valid,warranty_until:"2099-01"}).success).toBe(false);
 });
 it("distinguishes Other storage from Not applicable and accepts feature phones",()=>{
  for(const storage of ["Other","Not applicable"])expect(mobileSchema.safeParse({...valid,storage,ram:""}).success).toBe(true);
 });
 it("keeps model/spec numbers out of contact signals",()=>expect(phoneRiskSignals("iPhone 15 Pro Max 128 GB 8 GB RAM battery 5000 mAh 2024")).toEqual([]));
 it("detects contact/payment/courier patterns without retaining the content",()=>{
  expect(phoneRiskSignals("Call +91 98765 43210")).toContain("off_platform_contact");
  expect(phoneRiskSignals("Pay seller@okaxis")).toContain("payment_destination");
  expect(phoneRiskSignals("free phone courier fee advance")).toContain("advance_or_courier_request");
  expect(phoneRiskSignals("Other phone",true)).toEqual(["other_model"]);
 });
 it("uses the same selection validator for programmatic and manual choices",()=>{
  const catalogue={enabled:true,selection:valid.selection} as MobileCatalogue;
  expect(selectPostingCategory(valid.selection,catalogue)).toEqual(valid.selection);
  expect(()=>selectPostingCategory({...valid.selection,subcategory:"tablets"},catalogue)).toThrow();
  expect(()=>selectPostingCategory(valid.selection,{...catalogue,enabled:false})).toThrow();
 });
 it("builds a title with the exact variant and seller condition",()=>expect(mobileTitle("iPhone 15","128 GB","good")).toBe("iPhone 15 · 128 GB · Good condition"));
});
