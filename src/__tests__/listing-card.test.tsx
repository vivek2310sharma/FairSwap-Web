import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingCard } from "@/components/listings/ListingCard";
import { PublicListingCard } from "@/types/listing";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
}));

const sampleListing: PublicListingCard = {
  id: "list-1",
  seller_id: "seller-1",
  slug: "iphone-13-128gb-mumbai",
  title: "iPhone 13 128GB Blue Excellent Condition - केवल 6 महीने पुराना",
  description: "Used iPhone 13",
  condition: "good",
  price_type: "fixed",
  price_paise: 4500000, // ₹45,000
  category_attributes: {},
  status: "active",
  created_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  category: { id: "cat-1", name: "Mobiles & Tablets", slug: "mobiles", icon: null },
  city: { id: "city-1", name: "Mumbai", state: "Maharashtra" },
  locality: { id: "loc-1", name: "Bandra West" },
  cover_photo: {
    id: "photo-1",
    thumbnail_storage_path: "path/thumb.jpg",
    medium_storage_path: "path/med.jpg",
    width: 800,
    height: 600,
  },
};

describe("ListingCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders standard variant with correct price and details", () => {
    render(<ListingCard listing={sampleListing} />);

    expect(screen.getByText("₹45,000")).toBeInTheDocument();
    expect(screen.getByText("Mobiles & Tablets")).toBeInTheDocument();
    expect(screen.getByText(/iPhone 13 128GB Blue/i)).toBeInTheDocument();
    expect(screen.getByText("Bandra West, Mumbai")).toBeInTheDocument();
    expect(screen.getByText("Good Condition")).toBeInTheDocument();
  });

  it("renders compact variant with appropriate compact CSS classes", () => {
    const { container } = render(<ListingCard listing={sampleListing} variant="compact" />);

    // Compact padding
    const contentDiv = container.querySelector(".p-2\\.5");
    expect(contentDiv).not.toBeNull();

    // Price size in compact mode
    const priceSpan = screen.getByText("₹45,000");
    expect(priceSpan.className).toContain("text-base");

    // Condition tag has collision guard and compact font sizing
    const conditionTag = screen.getByText("Good Condition");
    expect(conditionTag.className).toContain("max-w-[calc(100%-3.25rem)]");
    expect(conditionTag.className).toContain("text-[10px]");
  });

  it("formats free listings correctly", () => {
    const freeListing: PublicListingCard = {
      ...sampleListing,
      price_type: "free",
      price_paise: 0,
    };

    render(<ListingCard listing={freeListing} variant="compact" />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("formats price-on-request listings correctly", () => {
    const requestListing: PublicListingCard = {
      ...sampleListing,
      price_type: null,
      price_paise: null,
    };

    render(<ListingCard listing={requestListing} variant="compact" />);
    expect(screen.getByText("Price on request")).toBeInTheDocument();
  });

  it("renders favourite button with 44px minimum touch target", () => {
    render(<ListingCard listing={sampleListing} variant="compact" />);

    const favButton = screen.getByRole("button", { name: /save to favourites/i });
    expect(favButton).toBeInTheDocument();
    expect(favButton.className).toContain("min-h-[44px]");
    expect(favButton.className).toContain("min-w-[44px]");
  });

  it("handles Hindi/Devanagari text gracefully", () => {
    const hindiListing: PublicListingCard = {
      ...sampleListing,
      title: "पुराना फ्रिज बिक्री के लिए उपलब्ध - अंधेरी पूर्व",
      category: { id: "cat-2", name: "घरेलू सामान", slug: "home", icon: null },
      city: { id: "city-1", name: "मुंबई", state: "महाराष्ट्र" },
    };

    render(<ListingCard listing={hindiListing} variant="compact" />);

    expect(screen.getByText("पुराना फ्रिज बिक्री के लिए उपलब्ध - अंधेरी पूर्व")).toBeInTheDocument();
    expect(screen.getByText("घरेलू सामान")).toBeInTheDocument();
    expect(screen.getByText(/मुंबई/)).toBeInTheDocument();
  });
});
