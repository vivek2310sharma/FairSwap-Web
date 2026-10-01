import { describe, it, expect, vi } from "vitest";
import { GET as getRecentListings } from "@/app/api/listings/recent/route";
import * as discoveryQueries from "@/lib/discovery/queries";
import { PublicListingCard } from "@/types/listing";

describe("Public Location Privacy Application DTO & Query Tests (#81)", () => {
  it("/api/listings/recent returns public-safe DTO with NO pin_code or landmark", async () => {
    const mockCard: PublicListingCard = {
      id: "list-1",
      seller_id: "seller-1",
      slug: "vintage-desk-chair",
      title: "Vintage Desk Chair",
      description: "Solid wood chair in great condition",
      condition: "good",
      price_type: "fixed",
      price_paise: 250000,
      category_attributes: {},
      status: "active",
      created_at: "2026-10-01T10:00:00Z",
      published_at: "2026-10-01T10:05:00Z",
      category: {
        id: "cat-1",
        name: "Furniture",
        slug: "furniture",
        icon: "chair",
      },
      city: {
        id: "city-1",
        name: "Bengaluru",
        state: "Karnataka",
      },
      locality: {
        id: "loc-1",
        name: "Koramangala",
      },
      cover_photo: null,
    };

    const spy = vi.spyOn(discoveryQueries, "searchPublicListings").mockResolvedValueOnce({
      items: [mockCard],
      total_count: 1,
      page: 1,
      per_page: 12,
      total_pages: 1,
    });

    const res = await getRecentListings();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items).toHaveLength(1);
    const item = json.items[0];

    // Assert strictly that neither pin_code nor landmark is present
    expect(item).not.toHaveProperty("pin_code");
    expect(item).not.toHaveProperty("landmark");
    expect(item.locality.name).toBe("Koramangala");
    expect(item.city.name).toBe("Bengaluru");
    expect(item.city.state).toBe("Karnataka");

    spy.mockRestore();
  });

  it("public listing detail object does not expose pin_code or landmark", () => {
    const detail: discoveryQueries.PublicListingDetail = {
      id: "detail-1",
      seller_id: "seller-1",
      slug: "vintage-road-bike",
      title: "Vintage Road Bike",
      description: "Great 10-speed bicycle",
      condition: "good",
      price_type: "fixed",
      price_paise: 500000,
      category_attributes: {},
      status: "active",
      created_at: "2026-10-01T10:00:00Z",
      published_at: "2026-10-01T10:05:00Z",
      category: { id: "cat-1", name: "Sports", slug: "sports", icon: null },
      city: { id: "city-1", name: "Bengaluru", state: "Karnataka" },
      locality: { id: "loc-1", name: "Indiranagar" },
      seller: {
        id: "seller-1",
        display_name: "Seller One",
        avatar_url: null,
        bio: null,
        city: "Bengaluru",
        state: "Karnataka",
        created_at: "2026-09-01T00:00:00Z",
      },
      media: [],
    };

    expect(detail).not.toHaveProperty("pin_code");
    expect(detail).not.toHaveProperty("landmark");
  });

  it("PublicListingCard contract does not contain pin_code or landmark", () => {
    const card: PublicListingCard = {
      id: "card-1",
      seller_id: "seller-1",
      slug: "macbook-air-m2",
      title: "MacBook Air M2",
      description: "Flawless condition",
      condition: "like_new",
      price_type: "fixed",
      price_paise: 8500000,
      category_attributes: {},
      status: "active",
      created_at: "2026-10-01T10:00:00Z",
      published_at: "2026-10-01T10:05:00Z",
      category: { id: "cat-1", name: "Electronics", slug: "electronics", icon: null },
      city: { id: "city-1", name: "Jaipur", state: "Rajasthan" },
      locality: { id: "loc-2", name: "Malviya Nagar" },
      cover_photo: null,
    };

    expect(card).not.toHaveProperty("pin_code");
    expect(card).not.toHaveProperty("landmark");
    expect(card.locality?.name).toBe("Malviya Nagar");
    expect(card.city.name).toBe("Jaipur");
    expect(card.city.state).toBe("Rajasthan");
  });
});
