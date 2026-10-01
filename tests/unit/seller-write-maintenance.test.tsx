import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";
import {
  createDraftListingAction,
  updateListingAction,
  submitListingAction,
  transitionListingAction,
} from "@/app/account/listings/actions";
import ListingForm from "@/components/listings/ListingForm";
import type { Category, City, Locality, Listing } from "@/types/listing";

// Mock next/navigation and next/cache
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock policy acceptance
vi.mock("@/lib/compliance/policy-acceptance", () => ({
  requireCurrentPolicyAcceptance: vi.fn().mockResolvedValue({ allowed: true }),
}));

// Mock Supabase server client
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "new-listing-1" }, error: null }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
});
const mockFrom = vi.fn().mockImplementation(() => {
  return {
    insert: mockInsert,
    update: mockUpdate,
  };
});
const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: "test-user-id", email: "seller@example.com" } },
  error: null,
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

describe("Seller-Write Maintenance Guard Tests", () => {
  const originalEnv = process.env.MAINTENANCE_SELLER_WRITES;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.MAINTENANCE_SELLER_WRITES = originalEnv;
    } else {
      delete process.env.MAINTENANCE_SELLER_WRITES;
    }
    vi.clearAllMocks();
  });

  describe("1. Maintenance Helper: isSellerWriteMaintenanceEnabled", () => {
    it("returns false when env is absent", () => {
      delete process.env.MAINTENANCE_SELLER_WRITES;
      expect(isSellerWriteMaintenanceEnabled()).toBe(false);
    });

    it("returns false when env is 'false'", () => {
      process.env.MAINTENANCE_SELLER_WRITES = "false";
      expect(isSellerWriteMaintenanceEnabled()).toBe(false);
    });

    it("returns false when env is invalid string", () => {
      process.env.MAINTENANCE_SELLER_WRITES = "unexpected-value";
      expect(isSellerWriteMaintenanceEnabled()).toBe(false);
    });

    it("returns true when env is 'true'", () => {
      process.env.MAINTENANCE_SELLER_WRITES = "true";
      expect(isSellerWriteMaintenanceEnabled()).toBe(true);
    });

    it("handles case-insensitivity and trimming for 'True'", () => {
      process.env.MAINTENANCE_SELLER_WRITES = "  True  ";
      expect(isSellerWriteMaintenanceEnabled()).toBe(true);
    });
  });

  describe("2. Server Action Boundary Enforcement", () => {
    function createValidFormData() {
      const fd = new FormData();
      fd.set("title", "Vintage Bicycle");
      fd.set("category_id", "11111111-1111-1111-1111-111111111111");
      fd.set("city_id", "22222222-2222-2222-2222-222222222222");
      fd.set("price_type", "fixed");
      fd.set("price_paise", "250000");
      return fd;
    }

    describe("when maintenance is ENABLED (true)", () => {
      beforeEach(() => {
        process.env.MAINTENANCE_SELLER_WRITES = "true";
      });

      it("blocks createDraftListingAction and returns maintenance error", async () => {
        const result = await createDraftListingAction(null, createValidFormData());
        expect(result.error).toBe(SELLER_WRITE_MAINTENANCE_MESSAGE);
        expect(result.success).toBeUndefined();
        expect(mockInsert).not.toHaveBeenCalled();
      });

      it("blocks updateListingAction and returns maintenance error", async () => {
        const result = await updateListingAction("listing-123", createValidFormData());
        expect(result.error).toBe(SELLER_WRITE_MAINTENANCE_MESSAGE);
        expect(result.success).toBeUndefined();
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it("blocks submitListingAction and returns maintenance error", async () => {
        const result = await submitListingAction("listing-123");
        expect(result.error).toBe(SELLER_WRITE_MAINTENANCE_MESSAGE);
        expect(result.success).toBeUndefined();
        expect(mockRpc).not.toHaveBeenCalled();
      });

      it("does NOT block transitionListingAction (remains operational outside this guard)", async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null });
        const result = await transitionListingAction("listing-123", "cancel");
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(mockRpc).toHaveBeenCalledWith("seller_transition_listing", {
          listing_id: "listing-123",
          action: "cancel",
        });
      });
    });

    describe("when maintenance is DISABLED (false or absent)", () => {
      beforeEach(() => {
        process.env.MAINTENANCE_SELLER_WRITES = "false";
      });

      it("allows createDraftListingAction to proceed", async () => {
        const result = await createDraftListingAction(null, createValidFormData());
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(result.listingId).toBe("new-listing-1");
      });

      it("allows updateListingAction to proceed", async () => {
        const result = await updateListingAction("listing-123", createValidFormData());
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
      });

      it("allows submitListingAction to proceed", async () => {
        mockRpc.mockResolvedValueOnce({ data: null, error: null });
        const result = await submitListingAction("listing-123");
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
      });
    });
  });

  describe("3. ListingForm UI Behavior", () => {
    const dummyCategory: Category = {
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

    const dummyCity: City = {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Bengaluru",
      state: "Karnataka",
      slug: "bengaluru",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const dummyLocality: Locality = {
      id: "33333333-3333-3333-3333-333333333333",
      city_id: "22222222-2222-2222-2222-222222222222",
      name: "Koramangala",
      slug: "koramangala",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const dummyListing: Listing = {
      id: "listing-123",
      seller_id: "seller-1",
      category_id: "11111111-1111-1111-1111-111111111111",
      title: "Existing Road Bike",
      description: "Well maintained",
      condition: "like_new",
      price_type: "fixed",
      price_paise: 300000,
      city_id: "22222222-2222-2222-2222-222222222222",
      locality_id: "33333333-3333-3333-3333-333333333333",
      pin_code: "560034",
      status: "draft",
      rejection_reason: null,
      removal_reason: null,
      removed_by: null,
      revision: 1,
      renewal_count: 0,
      slug: "existing-road-bike",
      cover_photo_id: null,
      expires_at: null,
      published_at: null,
      submitted_at: null,
      sold_at: null,
      category_attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("renders maintenance banner and disables Save as Draft button in create mode when maintenance is active", () => {
      render(
        <ListingForm
          categories={[dummyCategory]}
          allAttributes={[]}
          cities={[dummyCity]}
          localities={[dummyLocality]}
          isMaintenanceActive={true}
          maintenanceMessage={SELLER_WRITE_MAINTENANCE_MESSAGE}
        />
      );

      const banner = screen.getByTestId("seller-write-maintenance-banner");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(SELLER_WRITE_MAINTENANCE_MESSAGE);

      const saveDraftButton = screen.getByRole("button", { name: /save as draft/i });
      expect(saveDraftButton).toBeDisabled();
    });

    it("renders maintenance banner and disables Save Changes and Submit for Review buttons in edit mode when maintenance is active", () => {
      render(
        <ListingForm
          categories={[dummyCategory]}
          allAttributes={[]}
          cities={[dummyCity]}
          localities={[dummyLocality]}
          initialListing={dummyListing}
          isMaintenanceActive={true}
          maintenanceMessage={SELLER_WRITE_MAINTENANCE_MESSAGE}
        />
      );

      const banner = screen.getByTestId("seller-write-maintenance-banner");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(SELLER_WRITE_MAINTENANCE_MESSAGE);

      const saveChangesButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveChangesButton).toBeDisabled();

      const submitButton = screen.getByRole("button", { name: /submit for review/i });
      expect(submitButton).toBeDisabled();
    });

    it("does NOT render maintenance banner and keeps buttons enabled when maintenance is inactive", () => {
      render(
        <ListingForm
          categories={[dummyCategory]}
          allAttributes={[]}
          cities={[dummyCity]}
          localities={[dummyLocality]}
          initialListing={dummyListing}
          isMaintenanceActive={false}
        />
      );

      expect(screen.queryByTestId("seller-write-maintenance-banner")).not.toBeInTheDocument();

      const saveChangesButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveChangesButton).not.toBeDisabled();

      const submitButton = screen.getByRole("button", { name: /submit for review/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
