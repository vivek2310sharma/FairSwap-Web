import { describe, it, expect } from "vitest";
import { isValidIndianPincode } from "@/lib/location/pincode";
import { draftListingSchema, submitListingSchema } from "@/types/listing";
import {
  normalizeText,
  toTitleCase,
  slugify,
  parseCSVLine,
} from "../../scripts/import-india-postal-data";

describe("India Location & PIN Code Utilities", () => {
  describe("isValidIndianPincode", () => {
    it("validates correct 6-digit PIN codes", () => {
      expect(isValidIndianPincode("560034")).toBe(true);
      expect(isValidIndianPincode("302017")).toBe(true);
      expect(isValidIndianPincode(" 110001 ")).toBe(true);
    });

    it("rejects invalid PIN codes", () => {
      expect(isValidIndianPincode("56003")).toBe(false); // 5 digits
      expect(isValidIndianPincode("5600345")).toBe(false); // 7 digits
      expect(isValidIndianPincode("56003A")).toBe(false); // letters
      expect(isValidIndianPincode("")).toBe(false); // empty
    });
  });

  describe("Postal Importer Normalization Utilities", () => {
    it("normalizes text and strips extra whitespace", () => {
      expect(normalizeText("  Koramangala   VI  Block ")).toBe("Koramangala VI Block");
      expect(normalizeText(undefined)).toBe("");
    });

    it("converts text to title case", () => {
      expect(toTitleCase("BENGALURU URBAN")).toBe("Bengaluru Urban");
      expect(toTitleCase("malviya nagar")).toBe("Malviya Nagar");
    });

    it("generates clean URL slugs", () => {
      expect(slugify("Koramangala 6th Block")).toBe("koramangala-6th-block");
      expect(slugify("B.O / S.O Test!")).toBe("bo-so-test");
    });

    it("parses CSV lines with quotes", () => {
      const line = '"Koramangala B.O",560034,"Bengaluru Urban",Karnataka';
      const parsed = parseCSVLine(line);
      expect(parsed).toEqual(["Koramangala B.O", "560034", "Bengaluru Urban", "Karnataka"]);
    });
  });

  describe("Zod Listing Schemas", () => {
    it("allows optional pin_code and landmark on draft listing", () => {
      const draft = {
        title: "Used Bicycle",
        category_id: "00000000-0000-0000-0000-000000000001",
        pin_code: "560034",
        landmark: "Near Nexus Mall",
      };
      const res = draftListingSchema.safeParse(draft);
      expect(res.success).toBe(true);
    });

    it("requires 6-digit pin_code and locality_id on submit listing", () => {
      const validSubmit = {
        title: "Used Bicycle in Koramangala",
        category_id: "00000000-0000-0000-0000-000000000001",
        city_id: "00000000-0000-0000-0000-000000000002",
        locality_id: "00000000-0000-0000-0000-000000000003",
        pin_code: "560034",
        description: "Excellent condition bicycle available for local pickup",
        condition: "good",
        price_type: "fixed",
        price_paise: 500000,
        landmark: "Near Forum Mall",
      };

      const res = submitListingSchema.safeParse(validSubmit);
      expect(res.success).toBe(true);
    });

    it("fails submit listing when pin_code is missing", () => {
      const missingPin = {
        title: "Used Bicycle in Koramangala",
        category_id: "00000000-0000-0000-0000-000000000001",
        city_id: "00000000-0000-0000-0000-000000000002",
        locality_id: "00000000-0000-0000-0000-000000000003",
        description: "Excellent condition bicycle available for local pickup",
        condition: "good",
        price_type: "fixed",
        price_paise: 500000,
      };

      const resPin = submitListingSchema.safeParse(missingPin);
      expect(resPin.success).toBe(false);

      const missingLocality = {
        ...missingPin,
        pin_code: "560034",
        locality_id: undefined,
      };
      const resLoc = submitListingSchema.safeParse(missingLocality);
      expect(resLoc.success).toBe(true);
    });
  });
});
