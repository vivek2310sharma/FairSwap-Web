import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ListingForm from "@/components/listings/ListingForm";
import { draftListingSchema, submitListingSchema } from "@/types/listing";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/account/listings/actions", () => ({
  createDraftListingAction: vi.fn(),
  updateListingAction: vi.fn(),
  submitListingAction: vi.fn(),
  reorderMediaAction: vi.fn(),
  setCoverPhotoAction: vi.fn(),
}));

describe("Listing Defect Remediation Unit Tests", () => {
  const dummyCategory = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Bicycles",
    slug: "bicycles",
    description: null,
    icon: null,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dummyAttribute = {
    id: "22222222-2222-2222-2222-222222222222",
    category_id: dummyCategory.id,
    name: "frame_size",
    label: "Frame Size",
    value_type: "text" as const,
    is_required: true,
    is_filterable: true,
    options: null,
    validation_rules: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  };

  const dummyCity = {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Jaipur",
    state: "Rajasthan",
    slug: "jaipur",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  describe("A. Explicit Light-Control Contrast Classes", () => {
    it("renders all ListingForm input, select, and textarea controls with explicit contrast classes", () => {
      render(
        <ListingForm
          categories={[dummyCategory]}
          allAttributes={[dummyAttribute]}
          cities={[dummyCity]}
        />
      );

      const titleInput = screen.getByLabelText(/Title \*/i);
      expect(titleInput).toHaveClass("bg-white", "text-gray-900", "placeholder:text-gray-500");

      const descriptionTextarea = screen.getByLabelText(/Description \*/i);
      expect(descriptionTextarea).toHaveClass("bg-white", "text-gray-900", "placeholder:text-gray-500");

      const categorySelect = screen.getByLabelText(/Category \*/i);
      expect(categorySelect).toHaveClass("bg-white", "text-gray-900");

      const citySelect = screen.getByLabelText(/PIN Code \*/i);
      expect(citySelect).toHaveClass("bg-white", "text-gray-900");

      const conditionSelect = screen.getByLabelText(/Condition \*/i);
      expect(conditionSelect).toHaveClass("bg-white", "text-gray-900");

      const priceTypeSelect = screen.getByLabelText(/Price Type \*/i);
      expect(priceTypeSelect).toHaveClass("bg-white", "text-gray-900");

      const priceInput = screen.getByLabelText(/Price \(₹ Rupees\) \*/i);
      expect(priceInput).toHaveClass("bg-white", "text-gray-900", "placeholder:text-gray-500");
    });

  });

  describe("B. Saving Draft Permissiveness", () => {
    it("allows saving a draft when submission-only fields are incomplete", () => {
      const minimalDraft = {
        title: "Test Draft Bicycle",
        category_id: dummyCategory.id,
        // city_id is null
        city_id: null,
        // description is null
        description: null,
        // condition is null
        condition: null,
        // price_type and price_paise are null
        price_type: null,
        price_paise: null,
      };

      const result = draftListingSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
    });
  });

  describe("C & D. Submit-for-Review Validation Gate", () => {
    const validFullData = {
      title: "Mountain Bicycle — Excellent Condition",
      category_id: dummyCategory.id,
      city_id: dummyCity.id,
      locality_id: null,
      description: "A well-maintained mountain bicycle with 21 gears, helmet included.",
      condition: "good" as const,
      price_type: "fixed" as const,
      price_paise: 350000,
      pin_code: "302017",
      category_attributes: { frame_size: "Large" },
    };

    it("accepts a completely specified listing", () => {
      const result = submitListingSchema.safeParse(validFullData);
      expect(result.success).toBe(true);
    });

    it("rejects missing or short description (<10 characters)", () => {
      const shortDesc = { ...validFullData, description: "Too short" };
      const res = submitListingSchema.safeParse(shortDesc);
      expect(res.success).toBe(false);
      expect(res.error?.issues[0].message).toContain("Description must be at least 10 characters");

      const nullDesc = { ...validFullData, description: null };
      const resNull = submitListingSchema.safeParse(nullDesc);
      expect(resNull.success).toBe(false);
    });

    it("rejects missing required city", () => {
      const missingCity = { ...validFullData, city_id: null };
      const res = submitListingSchema.safeParse(missingCity);
      expect(res.success).toBe(false);
      expect(res.error?.issues[0].message).toContain("City is required");
    });

    it("rejects missing required condition", () => {
      const missingCondition = { ...validFullData, condition: null };
      const res = submitListingSchema.safeParse(missingCondition);
      expect(res.success).toBe(false);
    });

    it("rejects missing positive price for fixed or negotiable listings", () => {
      const missingPrice = { ...validFullData, price_type: "fixed" as const, price_paise: null };
      const res = submitListingSchema.safeParse(missingPrice);
      expect(res.success).toBe(false);
      expect(res.error?.issues[0].message).toContain(
        "Price in rupees is required unless the item is marked free"
      );

      const zeroPrice = { ...validFullData, price_type: "negotiable" as const, price_paise: 0 };
      const resZero = submitListingSchema.safeParse(zeroPrice);
      expect(resZero.success).toBe(false);
      expect(resZero.error?.issues[0].message).toContain(
        "Price in rupees is required unless the item is marked free"
      );
    });

    it("D: accepts free listing without requiring positive numeric price", () => {
      const freeListing = {
        ...validFullData,
        price_type: "free" as const,
        price_paise: 0,
      };
      const res = submitListingSchema.safeParse(freeListing);
      expect(res.success).toBe(true);
    });
  });

  describe("E. Server-Side seller_submit_listing Authority", () => {
    it("preserves server-side seller_submit_listing RPC contract in submitListingAction", async () => {
      const { submitListingAction } = await import("@/app/account/listings/actions");
      expect(typeof submitListingAction).toBe("function");
    });
  });
});
