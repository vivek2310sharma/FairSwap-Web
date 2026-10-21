import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { getEffectiveSort, searchFiltersSchema } from "@/types/listing";
import { serializeSearchFilters, getBackToSearchHref } from "@/lib/navigation/search-context";

// Mock Next.js useRouter
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("SRCH-02 Keyword Search Relevance & Default Sorting Matrix", () => {
  it("resolves /search to newest", () => {
    const parsed = searchFiltersSchema.parse({});
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("newest");
  });

  it("resolves /search?q=iphone to relevance", () => {
    const parsed = searchFiltersSchema.parse({ q: "iphone" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("relevance");
  });

  it("resolves /search?q=laptop&sort=newest to newest", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", sort: "newest" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("newest");
  });

  it("resolves /search?q=phone&sort=price_asc to price_asc", () => {
    const parsed = searchFiltersSchema.parse({ q: "phone", sort: "price_asc" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("price_asc");
  });

  it("resolves /search?q=phone&sort=price_desc to price_desc", () => {
    const parsed = searchFiltersSchema.parse({ q: "phone", sort: "price_desc" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("price_desc");
  });

  it("resolves /search?q=phone&sort=relevance to relevance", () => {
    const parsed = searchFiltersSchema.parse({ q: "phone", sort: "relevance" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("relevance");
  });

  it("resolves /search?q=%20%20 (whitespace-only) to newest", () => {
    const parsed = searchFiltersSchema.parse({ q: "  " });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("newest");
  });

  it("resolves /search?category=electronics to newest", () => {
    const parsed = searchFiltersSchema.parse({ category: "electronics" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("newest");
  });

  it("normalizes /search?sort=relevance (relevance without keyword) to newest", () => {
    const parsed = searchFiltersSchema.parse({ sort: "relevance" });
    expect(getEffectiveSort(parsed.q, parsed.sort)).toBe("newest");
  });
});

describe("SRCH-02 Search Context Serialization & Preservation", () => {
  it("serializes keyword search context without converting implicit sort into explicit URL param", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", category: "electronics" });
    const serialized = serializeSearchFilters(parsed);
    expect(serialized).toContain("q=laptop");
    expect(serialized).toContain("category=electronics");
    expect(serialized).not.toContain("sort=");
  });

  it("serializes explicit newest sort on keyword search", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", sort: "newest" });
    const serialized = serializeSearchFilters(parsed);
    expect(serialized).toContain("q=laptop");
    expect(serialized).toContain("sort=newest");
  });

  it("preserves browse /search context without adding sort=newest", () => {
    const parsed = searchFiltersSchema.parse({ category: "electronics" });
    const serialized = serializeSearchFilters(parsed);
    expect(serialized).toBe("category=electronics&page=1");
    expect(serialized).not.toContain("sort=");
  });

  it("restores search href safely with getBackToSearchHref preserving clean browse URLs", () => {
    const parsed = searchFiltersSchema.parse({ category: "electronics" });
    const context = serializeSearchFilters(parsed);
    const href = getBackToSearchHref(context);
    expect(href).toBe("/search?category=electronics&page=1");
  });

  it("returns fallback /search for invalid or empty context", () => {
    expect(getBackToSearchHref(null)).toBe("/search");
    expect(getBackToSearchHref("")).toBe("/search");
    expect(getBackToSearchHref("invalid%format")).toBe("/search");
  });
});

describe("SRCH-02 SearchFilters Component Interactivity & Edge Cases", () => {
  it("normalizes sort=relevance without keyword so typing a keyword switches dropdown to relevance", () => {
    pushMock.mockClear();

    // Render SearchFilters initialized with sort="relevance" without a keyword (e.g. invalid URL)
    const rawFilters = searchFiltersSchema.parse({ sort: "relevance" });

    render(
      <SearchFilters
        categories={[]}
        cities={[]}
        localities={[]}
        initialFilters={rawFilters}
      />
    );

    const sortSelects = screen.getAllByLabelText("Sort By") as HTMLSelectElement[];
    const desktopSortSelect = sortSelects[0];
    const searchInputs = screen.getAllByPlaceholderText("Search items, titles, brands...") as HTMLInputElement[];
    const desktopSearchInput = searchInputs[0];

    // Effective sort without keyword should show "newest" in dropdown
    expect(desktopSortSelect.value).toBe("newest");

    // Type keyword "iphone"
    fireEvent.change(desktopSearchInput, { target: { value: "iphone" } });

    // Dropdown value should dynamically update to "relevance"
    expect(desktopSortSelect.value).toBe("relevance");

    // Submit search form
    const submitButtons = screen.getAllByRole("button", { name: "Submit search" });
    fireEvent.click(submitButtons[0]);

    // Pushed URL should be /search?q=iphone&page=1 (not forcing sort=newest or locking explicit sort)
    expect(pushMock).toHaveBeenCalledWith("/search?q=iphone&page=1");
  });
});
