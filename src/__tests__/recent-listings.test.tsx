import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentListingsSection } from "@/components/listings/RecentListingsSection";
import * as queries from "@/lib/discovery/queries";
import { PublicListingCard } from "@/types/listing";
import React from "react";

vi.mock("@/lib/discovery/queries", () => ({
  searchPublicListings: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
}));

const area = { city: "11111111-1111-4111-8111-111111111111", locality: "22222222-2222-4222-8222-222222222222", label: "Koramangala, Bengaluru" };
const empty = { items: [], total_count: 0, page: 1, per_page: 12, total_pages: 0 };

// We use vitest's support for rendering async server components when returning their await result
const renderServerComponent = async (jsx: React.ReactElement | Promise<React.ReactElement | null>) => render((await jsx)!);

const listing = (overrides: Partial<PublicListingCard> = {}): PublicListingCard => ({
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
  ...overrides,
});

describe("RecentListingsSection (Server Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Fresh Finds with approved listings for All India", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue({ items: [listing()], total_count: 1, page: 1, per_page: 12, total_pages: 1 });

    await renderServerComponent(RecentListingsSection({}));

    expect(screen.getByRole("heading", { name: "Fresh Finds Near You" })).toBeInTheDocument();
    expect(screen.getByText("Listing 1")).toBeInTheDocument();
    expect(screen.getByText("Newest approved ads from across India")).toBeInTheDocument();
    expect(queries.searchPublicListings).toHaveBeenCalledWith({ sort: "newest", page: 1 });
  });

  it("queries the selected public city and locality and links View all to the same area", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue({ items: [listing({ locality: { id: "l1", name: "Koramangala" } })], total_count: 1, page: 1, per_page: 12, total_pages: 1 });

    await renderServerComponent(RecentListingsSection({ area }));

    expect(queries.searchPublicListings).toHaveBeenCalledWith({ sort: "newest", page: 1, city: area.city, locality: area.locality });
    expect(screen.getByText(`Newest approved ads in ${area.label}`)).toBeInTheDocument();
    const viewAll = screen.getByRole("link", { name: /view all/i });
    expect(viewAll.getAttribute("href")).toBe(`/search?city=${area.city}&locality=${area.locality}`);
  });

  it("shows a clear empty state for an area with a way back to All India", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue(empty);

    await renderServerComponent(RecentListingsSection({ area }));

    expect(screen.getByText(`No approved ads in ${area.label} yet.`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show All India" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a distinct empty state for All India", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue(empty);

    await renderServerComponent(RecentListingsSection({}));

    expect(screen.getByText("No approved ads to show yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Show All India" })).not.toBeInTheDocument();
  });

  it("shows an error state, not an empty state, when the RPC is unavailable", async () => {
    vi.mocked(queries.searchPublicListings).mockResolvedValue({ ...empty, unavailable: true });

    await renderServerComponent(RecentListingsSection({ area }));

    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load ads");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", `/?city=${area.city}&locality=${area.locality}`);
    expect(screen.queryByText(/No approved ads/)).not.toBeInTheDocument();
  });

  it("shows the error state when the search throws", async () => {
    vi.mocked(queries.searchPublicListings).mockRejectedValue(new Error("Database Error"));

    await renderServerComponent(RecentListingsSection({}));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/No approved ads/)).not.toBeInTheDocument();
  });
});
