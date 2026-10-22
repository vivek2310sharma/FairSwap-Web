import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { getEffectiveSort } from "@/types/listing";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

global.fetch = vi.fn();

describe("SRCH-04: Active Filter Chips & Search Filters Integration", () => {
  const mockData = {
    cat: { id: "cat-1", slug: "electronics", name: "Electronics", description: null, icon: null, sort_order: 1, is_active: true, created_at: "", updated_at: "" },
    city1: { id: "city-1", name: "Jaipur", state: "Rajasthan", slug: "jaipur", is_active: true, created_at: "" },
    city2: { id: "city-2", name: "Udaipur", state: "Rajasthan", slug: "udaipur", is_active: true, created_at: "" },
    loc1: { id: "loc-1", city_id: "city-1", name: "Vaishali Nagar", slug: "vaishali-nagar", is_active: true, created_at: "" },
    loc2: { id: "loc-2", city_id: "city-2", name: "Hiran Magri", slug: "hiran-magri", is_active: true, created_at: "" },
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
            city: "city-1",
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
            city: "city-1",
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

  describe("SearchFilters Blocking Regression Fixes", () => {
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
          initialFilters={{ city: "city-1", locality: "loc-1" }}
        />
      );

      // Open drawer
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/i }));

      const districtSelects = screen.getAllByLabelText("District");
      const drawerDistrictSelect = districtSelects[districtSelects.length - 1];

      // Change district to Udaipur (city-2)
      fireEvent.change(drawerDistrictSelect, { target: { value: "city-2" } });

      // Verify lazy endpoint was called for city-2
      expect(global.fetch).toHaveBeenCalledWith("/api/discovery/localities?city_id=city-2");

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
});
