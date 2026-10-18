import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentListingsSection } from "@/components/listings/RecentListingsSection";
import * as queries from "@/lib/discovery/queries";
import { PublicListingCard } from "@/types/listing";
import React from "react";

vi.mock("@/lib/discovery/queries", () => ({
  searchPublicListings: vi.fn(),
}));

// We use vitest's support for rendering async server components when returning their await result
const renderServerComponent = async (Component: () => Promise<React.ReactElement | null>) => {
  const jsx = await Component();
  if (jsx === null) {
    return { container: null };
  }
  return render(jsx);
};

describe("RecentListingsSection (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with approved listings", async () => {
    const mockListings: PublicListingCard[] = [
      {
        id: "1",
        seller_id: "seller1",
        slug: "listing-1",
        title: "Listing 1",
        description: "Desc 1",
        condition: "new",
        price_type: "fixed",
        price_paise: 100000,
        category_attributes: {},
        status: "active",
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        category: { id: "c1", name: "Category 1", slug: "cat-1", icon: null },
        city: { id: "ct1", name: "City 1", state: "State 1" },
        locality: null,
        cover_photo: null,
      },
    ];

    vi.mocked(queries.searchPublicListings).mockResolvedValue({
      items: mockListings,
      total_count: 1,
      page: 1,
      per_page: 12,
      total_pages: 1,
    });

    await renderServerComponent(RecentListingsSection);

    // Using `getByText` as the heading is rendered
    expect(screen.getByText("Recent Verified Listings")).toBeInTheDocument();
    expect(screen.getByText("Listing 1")).toBeInTheDocument();
  });

  it("returns null when there are no listings", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue({
      items: [],
      total_count: 0,
      page: 1,
      per_page: 12,
      total_pages: 0,
    });

    const result = await renderServerComponent(RecentListingsSection);
    expect(result.container).toBeNull();
  });

  it("fails gracefully and returns null when search throws an error", async () => {
    vi.mocked(queries.searchPublicListings).mockRejectedValue(new Error("Database Error"));

    const result = await renderServerComponent(RecentListingsSection);
    expect(result.container).toBeNull();
  });
});
