import { render, screen, fireEvent, act } from "@testing-library/react";
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
          localities={[mockData.loc1, mockData.loc2]}
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
          localities={[mockData.loc1, mockData.loc2]}
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
          localities={[mockData.loc1, mockData.loc2]}
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

  describe("SearchFilters", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("triggers immediate router.push when category dropdown changes on desktop", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1, mockData.loc2]}
          initialFilters={{}}
        />
      );

      const categorySelect = screen.getByLabelText("Category");
      fireEvent.change(categorySelect, { target: { value: "electronics" } });

      expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
    });

    it("merges fast-select dropdown and condition changes without dropping fast selections", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1, mockData.loc2]}
          initialFilters={{}}
        />
      );

      const categorySelect = screen.getByLabelText("Category");
      const conditionSelect = screen.getByLabelText("Condition");

      fireEvent.change(categorySelect, { target: { value: "electronics" } });
      fireEvent.change(conditionSelect, { target: { value: "like_new" } });

      expect(mockPush).toHaveBeenLastCalledWith(
        "/search?category=electronics&condition=like_new&page=1"
      );
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

    it("debounces keyword changes on desktop by 500ms and omits implicit relevance sort from query string", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      const keywordInput = screen.getByLabelText("Keywords");
      fireEvent.change(keywordInput, { target: { value: "laptop" } });

      expect(mockPush).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockPush).toHaveBeenCalledWith("/search?q=laptop&page=1");
    });

    it("applies price inputs on blur on desktop when valid", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      const minPriceInput = screen.getByLabelText("Minimum price in rupees");
      fireEvent.change(minPriceInput, { target: { value: "1000" } });
      fireEvent.blur(minPriceInput);

      expect(mockPush).toHaveBeenCalledWith("/search?price_min=1000&page=1");
    });

    it("shows price error alert when min price is greater than max price", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      const minPriceInput = screen.getByLabelText("Minimum price in rupees");
      const maxPriceInput = screen.getByLabelText("Maximum price in rupees");

      fireEvent.change(minPriceInput, { target: { value: "5000" } });
      fireEvent.change(maxPriceInput, { target: { value: "1000" } });
      fireEvent.blur(maxPriceInput);

      expect(mockPush).not.toHaveBeenCalled();
      expect(
        screen.getByText("Minimum price cannot be greater than maximum price")
      ).toBeInTheDocument();
    });

    it("updates available localities dynamically inside mobile drawer when district changes", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1, mockData.city2]}
          localities={[mockData.loc1, mockData.loc2]}
          initialFilters={{ city: "city-1", locality: "loc-1" }}
        />
      );

      // Open drawer
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/i }));

      const districtSelects = screen.getAllByLabelText("District");
      const drawerDistrictSelect = districtSelects[districtSelects.length - 1];

      // Change district to Udaipur (city-2)
      fireEvent.change(drawerDistrictSelect, { target: { value: "city-2" } });

      // Locality select inside drawer should now show Hiran Magri (loc-2)
      const hiranOptions = screen.getAllByText("Hiran Magri");
      expect(hiranOptions.length).toBeGreaterThan(0);
      expect(screen.queryByText("Vaishali Nagar")).not.toBeInTheDocument();
    });

    it("preserves mobile drawer changes without router.push until Apply Filters is clicked", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{}}
        />
      );

      // Open mobile drawer
      const openDrawerButton = screen.getByRole("button", { name: /Filter & Sort/i });
      fireEvent.click(openDrawerButton);

      // Change category inside drawer
      const categorySelects = screen.getAllByLabelText("Category");
      const drawerCategorySelect = categorySelects[categorySelects.length - 1];

      fireEvent.change(drawerCategorySelect, { target: { value: "electronics" } });

      // No instant apply on mobile drawer
      expect(mockPush).not.toHaveBeenCalled();

      // Click Apply Filters inside drawer
      const applyButtons = screen.getAllByRole("button", { name: /Apply Filters/i });
      fireEvent.click(applyButtons[applyButtons.length - 1]);

      expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
    });

    it("discards uncommitted mobile drawer edits on close", () => {
      render(
        <SearchFilters
          categories={[mockData.cat]}
          cities={[mockData.city1]}
          localities={[mockData.loc1]}
          initialFilters={{ category: "electronics" }}
        />
      );

      // Open drawer
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/i }));

      const categorySelects = screen.getAllByLabelText("Category");
      const drawerCategorySelect = categorySelects[categorySelects.length - 1];

      // Edit category
      fireEvent.change(drawerCategorySelect, { target: { value: "" } });

      // Close drawer
      fireEvent.click(screen.getByText("Close"));

      // Re-open drawer
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/i }));

      const reopenedSelects = screen.getAllByLabelText("Category");
      expect(reopenedSelects[reopenedSelects.length - 1]).toHaveValue("electronics");
    });
  });
});
