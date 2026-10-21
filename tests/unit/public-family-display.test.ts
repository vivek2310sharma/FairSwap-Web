import { describe, it, expect } from "vitest";
import {
  publicFamilyForSlug, publicPriceFallback, makePublicPropertyDisplay,
  makePublicVehicleDisplay,
} from "@/lib/discovery/family-display";

describe("public Vehicle and Property display", () => {
  it("uses only supported category families", () => {
    expect(publicFamilyForSlug("car-sedan")).toBe("cars");
    expect(publicFamilyForSlug("tw-commuter-bikes")).toBe("two-wheelers");
    expect(publicFamilyForSlug("rental-boys-pg")).toBe("property");
    expect(publicFamilyForSlug("electronics")).toBeNull();
  });
  it("never calls a null rental item price Free or price on request", () => {
    expect(publicPriceFallback("rental-boys-pg", null, null)).toBe("Monthly rent unavailable");
    expect(publicPriceFallback("car-sedan", "fixed", 123450)).toBe("₹1,234.50");
    expect(publicPriceFallback("electronics", "free", 0)).toBe("Free");
  });
  it("validates supported vehicle answers and omits nested/unapproved fields", () => {
    const valid = makePublicVehicleDisplay("two-wheelers", "tw-commuter-bikes",
      { year: { state: "known", value: 2022 }, km_driven: { state: "known", value: 12000 } },
      "fixed", 120000, { mode: "not_listed", brandText: "Honda", modelText: "Shine" });
    expect(valid?.specifications).toEqual(expect.arrayContaining([
      { field: "brand", label: "Brand", value: "Honda" },
      { field: "year", label: "Manufacture year", value: "2,022" },
    ]));
    expect(makePublicVehicleDisplay("cars", "car-sedan",
      { private_address: "Hidden" }, "fixed", 120000,
      { mode: "unanswered", brandText: null, modelText: null })).toBeNull();
  });
  it("preserves monthly rental basis, deposit and maintenance distinctly", () => {
    const display = makePublicPropertyDisplay("rental-boys-pg",
      { wifi: "yes" },
      {
        currency: "INR", period: "month", basis: "per_bed",
        rent: { state: "known", amount_paise: 789900 },
        deposit: { state: "known", amount_paise: 0 },
      });
    expect(display?.priceLabel).toBe("₹7,899 / bed / month");
    expect(display?.rental?.deposit).toBe("₹0 one-time");
    expect(display?.rental?.maintenance).toBe("Not stated");
    expect(display?.specifications.find(x => x.field === "society_name")).toBeUndefined();
    expect(makePublicPropertyDisplay("rental-boys-pg", { society_name: "private" },
      { currency: "INR", period: "month", basis: "per_bed", rent: { state: "known", amount_paise: 10000 } })).toBeNull();
  });
});
