import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingsDashboardPage from "../app/account/listings/page";

const { mockServerClient, mockRpc } = vi.hoisted(() => ({
  mockServerClient: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockServerClient,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

vi.mock("../app/account/listings/actions", () => ({
  submitListingAction: vi.fn(),
  transitionListingAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const pendingListing = {
  id: "listing-123",
  slug: "test-listing",
  title: "Test listing",
  price_type: "free",
  price_paise: null,
  status: "pending_review",
  revision: 1,
  renewal_count: 0,
  rejection_reason: null,
  removal_reason: null,
  cover_photo_id: null,
  created_at: "2026-10-12T00:00:00.000Z",
  updated_at: "2026-10-12T00:00:00.000Z",
  categories: { name: "Electronics" },
  cities: { name: "Bengaluru" },
};

function stubSellerListings() {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [pendingListing], error: null }),
  };

  mockServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "seller-123" } } }),
    },
    from: vi.fn().mockReturnValue(query),
  });
}

describe("Seller listings pending-review status display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockReset();
    delete process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS;
    stubSellerListings();
  });

  it("renders exactly one Under Review badge and makes no enhanced RPC request by default", async () => {
    render(await ListingsDashboardPage());

    expect(screen.getAllByText("Under Review")).toHaveLength(1);
    expect(screen.queryByText("Checking...")).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("keeps a single badge when enhanced status is opted in but its RPC is missing", async () => {
    process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS = "true";
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function get_seller_moderation_workflow_status",
      },
    });

    render(await ListingsDashboardPage());

    expect(await screen.findByText("Under Review")).toBeDefined();
    expect(screen.getAllByText("Under Review")).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith(
      "get_seller_moderation_workflow_status",
      { listing_id: pendingListing.id }
    );
  });
});
