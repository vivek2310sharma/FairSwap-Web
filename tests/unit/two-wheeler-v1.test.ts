import { describe,it,expect } from "vitest";
import { compatibility,twoWheelerV1,validateVehicleAnswers,validateVehicleSubmission,resolutionSchema,rupeesToPaise,validateModelResolution,type RawModel } from "@/lib/listings/two-wheeler/contract";
import { isVerifiedTwoWheelerTestEnvironment } from "@/lib/listings/test-runtime";
import catalogue from "@/lib/listings/csv-fields/generated/catalogues.v1.json";
import source from "@/lib/listings/csv-fields/generated/categories.v1.json";
const now=new Date("2026-10-09T23:59:59Z"),path=twoWheelerV1.paths[0];
const id="10000000-0000-4000-8000-000000000001";
describe("approved V1 is separate from source facts",()=>{
  it.each(twoWheelerV1.paths)("preserves $slug source hierarchy and field order",p=>{
    const s=source.categories.find(s=>s.reviewKey===p.provenance.reviewKey)!;
    expect(p.path).toEqual(s.path);expect(p.fields).toEqual(s.fields.map(f=>f.key));expect(p.provenance.raw).toEqual(s.raw);
    expect(validateVehicleAnswers({},p,now).error).toBeUndefined();
  });
  it("maps 685 rows and keeps 145 unresolved; preserves raw CNG and lifecycle",()=>{
    const rows=catalogue.rows.filter(r=>r.catalogue==="two-wheelers");let mapped=0,unresolved=0;
    for(const r of rows){const states=twoWheelerV1.paths.map(p=>compatibility(r.raw as RawModel,p)); if(states.includes("mapped"))mapped++;else if(states.includes("unresolved"))unresolved++;}
    expect({mapped,unresolved}).toEqual({mapped:685,unresolved:145});expect(twoWheelerV1.mappings).toHaveLength(14);
    const cng=rows.find(r=>r.raw.fuel_type==="CNG")!;expect(compatibility(cng.raw as RawModel,path)).toBe("mapped");
    expect(compatibility(cng.raw as RawModel,twoWheelerV1.paths[5])).toBe("incompatible");
  });
  it.each([
    {year:{state:"known",value:1899}}, {year:{state:"known",value:2027}}, {year:{state:"known",value:2020.5}},
    {km_driven:{state:"unknown",value:0}}, {km_driven:{state:"known",value:null}}, {km_driven:{state:"known",value:0.5}},
    {engine_cc:0},{engine_cc:Infinity},{owner_number:0},{owner_number:1.5},{insurance_valid_till:"2026-02-30"},
    {registration_state:{state:"unknown",state_id:id}},{registration_state:{state:"provided"}},
    {registration_state:{state:"not_applicable",state_id:id}},{price:123},{negotiable:false},{fuel:"Petrol"},{range_km:123},
    {variant:"x".repeat(81)},{color:"x".repeat(61)},{km_driven:{state:"known",value:Number.MAX_SAFE_INTEGER+1}},
  ])("rejects invalid supplied answers %#",answers=>expect(validateVehicleAnswers(answers,path,now).error).toBeTruthy());
  it("distinguishes draft optional, unanswered, unknown and zero; submission stays a pure contract",()=>{
    const resolution={mode:"not_listed",brand_text:"Synthetic",model_text:"Unknown"} as const;
    expect(validateVehicleSubmission(resolution,{},path,now).error).toBeTruthy();
    expect(validateVehicleSubmission(resolution,{year:{state:"unknown"},km_driven:{state:"known",value:0}},path,now).error).toBeUndefined();
    expect(validateVehicleSubmission({mode:"unanswered"},{year:{state:"unknown"},km_driven:{state:"unknown"}},path,now).error).toBeTruthy();
    expect(validateVehicleAnswers({insurance_valid_till:"2000-02-29",registration_state:{state:"not_applicable"},engine_cc:0.1},path,now).error).toBeUndefined();
  });
  it("rejects forged flags and mismatches, Upcoming and known fallback; allows retained Upcoming",()=>{
    const raw=catalogue.rows.find(r=>r.catalogue==="two-wheelers"&&r.raw.fuel_type==="CNG")!.raw as RawModel;
    const known={id,brand_id:id,raw};const resolution={mode:"catalogue",brand_id:id,model_id:id} as const;
    expect(resolutionSchema.safeParse({...resolution,classification_review_required:false}).success).toBe(false);
    expect(validateModelResolution(resolution,path,known)).toBeNull();
    expect(validateModelResolution({...resolution,mode:"unresolved"},path,known)).toBeTruthy();
    expect(validateModelResolution(resolution,path,{...known,raw:{...raw,status:"Upcoming"}})).toBeTruthy();
    expect(validateModelResolution(resolution,path,{...known,raw:{...raw,status:"Upcoming"}},true)).toBeNull();
    expect(validateModelResolution({mode:"not_listed",brand_text:raw.brand,model_text:raw.model},path,known)).toBeTruthy();
  });
  it("uses one exact common price including Free, rejecting truncation and amount limits",()=>{
    expect(rupeesToPaise("1.01","fixed")).toBe(101);expect(rupeesToPaise("","fixed")).toBeNull();expect(rupeesToPaise("invalid","free")).toBe(0);
    expect(()=>rupeesToPaise("1.001","fixed")).toThrow();expect(()=>rupeesToPaise("1000000.01","negotiable")).toThrow();
  });
  it("defaults OFF and rejects Production even with vehicle flag",()=>{
    expect(isVerifiedTwoWheelerTestEnvironment({POST_AD_TWO_WHEELER_TEST_ENABLED:"true"})).toBe(false);
    expect(isVerifiedTwoWheelerTestEnvironment({POST_AD_TWO_WHEELER_TEST_ENABLED:"true",POST_AD_GOODS_TEST_ENABLED:"true",NODE_ENV:"production"})).toBe(false);
  });
});
