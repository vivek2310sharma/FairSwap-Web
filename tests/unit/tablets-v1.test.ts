import {describe,it,expect} from "vitest";
import {tabletSchema,tabletCatalogueIssues} from "@/lib/listings/tablets/contract";
import {blankTabletDraft,validateTabletStep,validateTabletWizard,tabletRecoverySchema,generatedTabletTitle} from "@/components/listings/posting/tablet-wizard";
import {id,valid,catalogue} from "./tablet-fixture";
describe("Tablets V1 contract and wizard",()=>{
 it("accepts Wi-Fi iPad with optional RAM and no sensitive identifiers",()=>{expect(tabletSchema.safeParse(valid).success).toBe(true);expect(tabletCatalogueIssues(valid,catalogue)).toEqual([]);});
 it.each([{transfer_lock_status:"locked"},{transfer_lock_status:"unknown"},{condition:"poor"},{powers_on:"no"},{imei:"123456789012345"},{hardware_model_number:"123456789012345"},{description:"serial: AB1234567890"},{description:"Pay courier fee in advance"},{description:"Pay an advance to reserve"},{description:"pay seller@okaxis"},{description:"See https://paytm.me/scam"},{included:["Under warranty"]},{screen_touch_status:"fault"},{media_ids:[id,id]},{trade:"giveaway"},{included:["Keyboard","Keyboard"]}])("rejects unsafe or forged fields: %j",patch=>expect(tabletSchema.safeParse({...valid,...patch}).success).toBe(false));
 it("allows global variants and preserves catalogue ownership",()=>{
  const variant={...valid,storage:"2 TB",connectivity:"five_g"};
  expect(tabletSchema.safeParse(variant).success).toBe(true);
  expect(tabletCatalogueIssues(variant,catalogue)).toEqual([]);
  expect(tabletCatalogueIssues({...valid,other_model:"Made up"},catalogue)[0].field).toBe("other_model");
  expect(tabletCatalogueIssues({...valid,brand_id:"other"},catalogue).map(i=>i.field)).toContain("model_id");
 });
 it("accepts guarded Other models for named and unlisted brands",()=>{
  const other="22222222-2222-4222-8222-222222222222";
  const namedFallback="33333333-3333-4333-8333-333333333333";
  const fallback={...catalogue.models[0],name:"Other model",other:true};
  const c={...catalogue,brands:[...catalogue.brands,{...catalogue.brands[0],id:other,name:"Other"}],
   models:[...catalogue.models,{...fallback,id:namedFallback},{...fallback,id:other,brand_id:other},
    {...catalogue.models[0],brand_id:other}]};
  expect(tabletCatalogueIssues({...valid,other_brand:"",model_id:namedFallback,other_model:"iPad Legacy"},c)).toEqual([]);
  const payload={...valid,brand_id:other,model_id:other,other_model:"Example Tab"};
  expect(tabletCatalogueIssues(payload,c)).toEqual([]);
  expect(tabletCatalogueIssues({...payload,other_brand:"Example"},c)).toEqual([]);
  expect(tabletCatalogueIssues({...payload,other_brand:" "},c)[0].field).toBe("other_brand");
  expect(tabletCatalogueIssues({...payload,other_brand:"Example",model_id:id},c).map(issue=>issue.field)).toContain("model_id");
 });
 it.each([
  {other_brand:"serial: ABC123456789"},{other_model:"1234 5678 9012 345"},
  {other_brand:"",connectivity:"unknown",connectivity_other:"https://paytm.me/scam"},
  {other_brand:"",storage:"Not sure",storage_other:"0 GB"},
  {other_brand:"",storage_other:"8 GB"},{ram_other:"1 GB"},
 ])("rejects invalid or risky additive fields: %j",patch=>expect(tabletSchema.safeParse({...valid,...patch}).success).toBe(false));
 it("recovers a partially typed custom spec and accepts a complete declaration",()=>{
  const draft={...valid,other_brand:"",storage:"Not sure" as const,storage_other:"8 G"};
  const r={version:1,owner:id,updated:Date.now(),draft,manualTitle:false,area:"",priceText:"100",photos:[]};
  expect(tabletRecoverySchema.parse(r).draft.storage_other).toBe("8 G");
  expect(tabletSchema.safeParse(draft).success).toBe(false);
  expect(validateTabletStep(1,{...draft,condition:"",storage_other:""},catalogue,[],"").map(issue=>issue.field)).toContain("storage_other");
  expect(tabletSchema.safeParse({...draft,storage_other:"8 GB",ram_other:"1 GB",connectivity:"unknown",connectivity_other:"Wi-Fi + 3G"}).success).toBe(true);
 });
 it("allows disclosed faults but blocks unresolved locks",()=>{expect(tabletSchema.safeParse({...valid,screen_touch_status:"fault",other_defects:"Touch fails on right side"}).success).toBe(true);});
 it("does not demand future fields on Continue or leak feedback across steps",()=>{const draft={...blankTabletDraft(),session_id:id,media_ids:[id]};expect(validateTabletStep(0,draft,catalogue,[{state:"ready"}],"")).toEqual([]);expect(validateTabletStep(1,draft,catalogue,[{state:"ready"}],"").every(i=>["brand_id","model_id","storage","connectivity"].includes(i.field))).toBe(true);expect(validateTabletWizard(valid,catalogue,[{state:"ready"}],"100").issues).toEqual([]);});
 it("uses a versioned tablet-only recovery shape",()=>{const r={version:1,owner:id,updated:Date.now(),draft:valid,manualTitle:false,area:"",priceText:"100",photos:[]};expect(tabletRecoverySchema.safeParse(r).success).toBe(true);expect(tabletRecoverySchema.safeParse({...r,version:2}).success).toBe(false);expect(tabletRecoverySchema.safeParse({...r,draft:{...valid,selection:{category:"mobiles",subcategory:"mobile-phones",version:2}}}).success).toBe(false);});
 it("deduplicates brand and generates storage/connectivity title",()=>expect(generatedTabletTitle("Apple","Apple iPad","64 GB","wifi")).toBe("Apple iPad · 64 GB · Wi-Fi"));
});
