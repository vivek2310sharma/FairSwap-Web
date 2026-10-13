import {describe,it,expect} from "vitest";
import {carsV1,carCompatibility,validateCarAnswers} from "@/lib/listings/cars/contract";
import {isVerifiedCarsTestEnvironment} from "@/lib/listings/test-runtime";
import {carAnswerOptions} from "@/lib/listings/cars/answer-options";
const now=new Date("2026-10-10T00:00:00Z"),ordinary=carsV1.paths[0],ev=carsV1.paths[7];
const raw={brand:"Synthetic",model:"No spec inference",body_type:"Hatchback",segment:"mass",status:"on_sale"};
describe("Cars V1 declared answers and independent classification",()=>{
  it("supports all nine exact source paths and preserves shared zero/unknown/past dates",()=>{
    expect(carsV1.paths).toHaveLength(9);
    expect(carAnswerOptions).toEqual(carsV1.options);
    expect(validateCarAnswers({year:{state:"unknown"},km_driven:{state:"known",value:0},insurance_valid_till:"2020-01-01"},ordinary,now).error).toBeUndefined();
  });
  it.each([{fuel_type:{state:"unknown",value:"petrol"}},{fuel_type:{state:"known",value:"other"}},{transmission:{state:"known",value:"invented"}},{seating_capacity:0},{condition:"good"},{price:0}])("rejects contradictory or inapplicable %j",answers=>expect(validateCarAnswers(answers,ordinary,now).error).toBeTruthy());
  it("accepts bounded seller Other and positive whole seating only where sourced",()=>{
    expect(validateCarAnswers({fuel_type:{state:"known",value:"other",other:"Seller detail"}},ordinary,now).error).toBeUndefined();
    expect(validateCarAnswers({seating_capacity:7},carsV1.paths[4],now).error).toBeUndefined();
    expect(validateCarAnswers({seating_capacity:1.5},carsV1.paths[4],now).error).toBeTruthy();
  });
  it("preserves unknown/not-applicable separately from electric-only zero",()=>{
    expect(validateCarAnswers({battery_capacity_kwh:{state:"unknown"},range_km:{state:"not_applicable"}},ev,now).error).toBeUndefined();
    expect(validateCarAnswers({powertrain:{state:"known",value:"hybrid"},battery_capacity_kwh:{state:"known",value:58.3},range_km:{state:"known",value:0,basis:"electric_only"}},ev,now).error).toBeUndefined();
  });
  it.each([{battery_capacity_kwh:{state:"known",value:0}},{range_km:{state:"known",value:1,basis:"total_driving"}},{range_km:{state:"known",value:0,basis:"electric_only"}}])("rejects incorrect battery/range declaration %j",answers=>expect(validateCarAnswers(answers,ev,now).error).toBeTruthy());
  it("keeps body, luxury segment, powertrain and classic dimensions independent",()=>{
    expect(carCompatibility(raw,ordinary)).toBe("exact");expect(carCompatibility(raw,carsV1.paths[1])).toBe("incompatible");
    expect(carCompatibility({...raw,body_type:"Compact Sedan"},carsV1.paths[1])).toBe("grouped");
    expect(carCompatibility({...raw,segment:"luxury"},carsV1.paths[5])).toBe("grouped");
    expect(carCompatibility(raw,ev)).toBe("unresolved");expect(carCompatibility(raw,carsV1.paths[8])).toBe("unresolved");
    expect(carCompatibility({...raw,body_type:"Pickup"},ordinary)).toBe("unresolved");
  });
  it("Cars flag is default off and cannot activate production",()=>{
    expect(isVerifiedCarsTestEnvironment({})).toBe(false);
    expect(isVerifiedCarsTestEnvironment({NODE_ENV:"production",POST_AD_CARS_TEST_ENABLED:"true"})).toBe(false);
  });
});
