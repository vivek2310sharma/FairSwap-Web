import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { getEffectiveSort } from "@/types/listing";
import { GET as localitiesRouteGET } from "@/app/api/discovery/localities/route";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/discovery/queries", () => ({
  getPublicLocalities: vi.fn(async (cityId: string) => [
    { id: "loc-1", city_id: cityId, name: "Vaishali Nagar", slug: "vaishali-nagar", is_active: true, created_at: "" },
  ]),
}));

global.fetch = vi.fn();

describe("SRCH-04: Active Filter Chips & Search Filters Integration", () => {
  const mockData = {
    cat: { id: "cat-1", slug: "electronics", name: "Electronics", description: null, icon: null, sort_order: 1, is_active: true, created_at: "", updated_at: "" },
    city1: { id: "11111111-1111-1111-1111-111111111111", name: "Jaipur", state: "Rajasthan", slug: "jaipur", is_active: true, created_at: "" },
    city2: { id: "22222222-2222-2222-2222-222222222222", name: "Udaipur", state: "Rajasthan", slug: "udaipur", is_active: true, created_at: "" },
    loc1: { id: "loc-1", city_id: "11111111-1111-1111-1111-111111111111", name: "Vaishali Nagar", slug: "vaishali-nagar", is_active: true, created_at: "" },
    loc2: { id: "loc-2", city_id: "22222222-2222-2222-2222-222222222222", name: "Hiran Magri", slug: "hiran-magri", is_active: true, created_at: "" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SRCH-02 & Search Core Utilities", () => {
    it("getEffectiveSort correctly defaults or switches to relevance when q is provided", () => {
      expect(getEffectiveSort("laptop", undefined)).toBe("relevance");
      expect(getEffectiveSort("laptop", "")).toBe("relevance");
      expect(getEffectiveSort("", undefined)).toBe("newest");
      expect(getEffectiveSort("", "relevance")).toBe("newest"); // Invalid sort without keyword falls back to newest
      expect(getEffectiveSort("laptop", "price_asc")).toBe("price_asc");
      expect(getEffectiveSort("laptop", "newest")).toBe("newest");
    });
  });

  describe("ActiveFilterChips", () => {
    it("renders active chips for all active URL parameters", () => {
      render(
        <ActiveFilterChips
          filters={{
            q: "phone",
            category: "electronics",
            city: mockData.city1.id,
            locality: "loc-1",
            condition: "like_new",
            price_min: 5000,
            price_max: 20000,
            sort: "price_asc",
          }}
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1]}
        />
      );

      expect(screen.getByText('Keyword: "phone"')).toBeInTheDocument();
      expect(screen.getByText("Category: Electronics")).toBeInTheDocument();
      expect(screen.getByText("District: Jaipur, Rajasthan")).toBeInTheDocument();
      expect(screen.getByText("Area: Vaishali Nagar")).toBeInTheDocument();
      expect(screen.getByText("Condition: Like New")).toBeInTheDocument();
      expect(screen.getByText("Price: ₹5,000 - ₹20,000")).toBeInTheDocument();
      expect(screen.getByText("Sort: Price: Low to High")).toBeInTheDocument();
      expect(screen.getByText("Clear All")).toBeInTheDocument();
    });

    it("returns null when no active filters are present", () => {
      const { container } = render(
        <ActiveFilterChips
          filters={{ sort: "newest" }}
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1]}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("clears district and locality when district chip remove link is clicked", () => {
      render(
        <ActiveFilterChips
          filters={{
            city: mockData.city1.id,
            locality: "loc-1",
            condition: "good",
          }}
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1]}
        />
      );

      const districtRemoveLink = screen
        .getByText("District: Jaipur, Rajasthan")
        .closest("span")
        ?.querySelector("a");

      expect(districtRemoveLink).toBeInTheDocument();
      expect(districtRemoveLink?.getAttribute("href")).toBe("/search?condition=good&page=1");
    });

    it("displays explicit newest sort chip when keyword query is present", () => {
      render(
        <ActiveFilterChips
          filters={{
            q: "laptop",
            sort: "newest",
          }}
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
        />
      );

      expect(screen.getByText("Sort: Newest First")).toBeInTheDocument();
    });
  });

  describe("SearchFilters Desktop Race Conditions & Draft Isolation", () => {
    it("accumulates rapid consecutive select dropdown changes on desktop without losing previous selections", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      const categorySelect = screen.getByLabelText("Category");
      const conditionSelect = screen.getByLabelText("Condition");

      // 1. User changes category to electronics
      fireEvent.change(categorySelect, { target: { value: "electronics" } });
      expect(mockPush).toHaveBeenNthCalledWith(1, "/search?category=electronics&page=1");

      // 2. Before server re-renders initialFilters, user immediately changes condition to like_new
      fireEvent.change(conditionSelect, { target: { value: "like_new" } });
      expect(mockPush).toHaveBeenNthCalledWith(2, "/search?category=electronics&condition=like_new&page=1");
    });

    it("DOES NOT leak uncommitted keyword text or invalid prices into URL when instant category select changes", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      // Type uncommitted draft query text and invalid price in sidebar
      const keywordInput = screen.getByLabelText("Keywords");
      const minPriceInput = screen.getByLabelText("Minimum price in rupees");

      fireEvent.change(keywordInput, { target: { value: "uncommitted keyword text" } });
      fireEvent.change(minPriceInput, { target: { value: "-999" } });

      // Change category select dropdown
      const categorySelect = screen.getByLabelText("Category");
      fireEvent.change(categorySelect, { target: { value: "electronics" } });

      // Instant navigation must apply ONLY the validated category change and NOT leak uncommitted query or invalid price
      expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
    });

    it("desktop search icon button applies keyword search directly without triggering mobile form handler or failing on invalid price draft", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      const keywordInput = screen.getByLabelText("Keywords");
      const minPriceInput = screen.getByLabelText("Minimum price in rupees");
      const searchButtons = screen.getAllByRole("button", { name: "Submit search" });
      const desktopSearchButton = searchButtons[0];

      fireEvent.change(keywordInput, { target: { value: "laptop" } });
      fireEvent.change(minPriceInput, { target: { value: "-100" } }); // Invalid price draft

      // Click search magnifying glass button on desktop
      fireEvent.click(desktopSearchButton);

      // Desktop search must apply keyword without calling mobile form or showing price error
      expect(mockPush).toHaveBeenCalledWith("/search?q=laptop&page=1");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("applies valid price range on blur on desktop", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{ category: "electronics" }}
        />
      );

      const minPriceInput = screen.getByLabelText("Minimum price in rupees");
      const maxPriceInput = screen.getByLabelText("Maximum price in rupees");

      fireEvent.change(minPriceInput, { target: { value: "500" } });
      fireEvent.change(maxPriceInput, { target: { value: "2000" } });
      fireEvent.blur(maxPriceInput);

      expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&price_min=500&price_max=2000&page=1");
    });

    it("cancels pending debounced keyword search timer when applied initialFilters changes (e.g. chip removal)", () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{ q: "old" }}
        />
      );

      // Type draft edit in keyword input
      const keywordInput = screen.getByLabelText("Keywords");
      fireEvent.change(keywordInput, { target: { value: "typing new text" } });

      // Simulate external URL navigation (e.g., user removes a filter chip or presses Back)
      rerender(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{ category: "electronics" }}
        />
      );

      // Fast-forward 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // The debounced query push should have been canceled
      expect(mockPush).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("fetches localities lazily when district is changed in mobile drawer with server-scoped localities prop", async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockData.loc2],
      });

      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1]} // Server supplies ONLY city-1 localities
          initialFilters={{ city: mockData.city1.id, locality: "loc-1" }}
        />
      );

      // Open drawer
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/i }));

      const districtSelects = screen.getAllByLabelText("District");
      const drawerDistrictSelect = districtSelects[districtSelects.length - 1];

      // Change district to Udaipur (city-2)
      fireEvent.change(drawerDistrictSelect, { target: { value: mockData.city2.id } });

      // Verify lazy endpoint was called for city-2 with AbortController signal option
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/discovery/localities?city_id=${mockData.city2.id}`,
        expect.objectContaining({ signal: expect.any(Object) })
      );

      // Wait for newly fetched locality option to appear
      await waitFor(() => {
        const localitySelects = screen.getAllByLabelText("Locality / Area");
        const drawerLocalitySelect = localitySelects[localitySelects.length - 1];
        expect(drawerLocalitySelect).toHaveTextContent("Hiran Magri");
      });
    });

    it("preserves explicit sort=newest in URL when user explicitly selects Newest First for keyword query", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{ q: "laptop" }}
        />
      );

      const sortSelect = screen.getByLabelText("Sort By");
      fireEvent.change(sortSelect, { target: { value: "newest" } });

      expect(mockPush).toHaveBeenCalledWith("/search?q=laptop&sort=newest&page=1");
    });
  });

  describe("Locality API Endpoint Validation & Headers", () => {
    it("returns HTTP 400 Bad Request for malformed or missing city_id UUID", async () => {
      // 1. Missing city_id
      const req1 = new Request("http://localhost/api/discovery/localities");
      const res1 = await localitiesRouteGET(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toBeDefined();

      // 2. Malformed non-UUID city_id
      const req2 = new Request("http://localhost/api/discovery/localities?city_id=not-a-uuid");
      const res2 = await localitiesRouteGET(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toBeDefined();
    });

    it("returns HTTP 200 OK with Cache-Control headers for valid UUID city_id", async () => {
      const validCityId = "11111111-1111-1111-1111-111111111111";
      const req = new Request(`http://localhost/api/discovery/localities?city_id=${validCityId}`);
      const res = await localitiesRouteGET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("public");
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Vaishali Nagar");
    });
  });
});
