import { describe, it, expect } from "vitest";
import { getEffectiveSort, searchFiltersSchema } from "@/types/listing";
import { serializeSearchFilters, getBackToSearchHref } from "@/lib/navigation/search-context";

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
});

describe("SRCH-02 Search Context Serialization & Preservation", () => {
  it("serializes keyword search context with effective relevance sort", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", category: "electronics" });
    const serialized = serializeSearchFilters(parsed);
    expect(serialized).toContain("q=laptop");
    expect(serialized).toContain("category=electronics");
    expect(serialized).toContain("sort=relevance");
  });

  it("serializes explicit newest sort on keyword search", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", sort: "newest" });
    const serialized = serializeSearchFilters(parsed);
    expect(serialized).toContain("q=laptop");
    expect(serialized).toContain("sort=newest");
  });

  it("restores search href safely with getBackToSearchHref", () => {
    const parsed = searchFiltersSchema.parse({ q: "laptop", category: "electronics" });
    const context = serializeSearchFilters(parsed);
    const href = getBackToSearchHref(context);
    expect(href).toBe("/search?q=laptop&category=electronics&sort=relevance&page=1");
  });

  it("returns fallback /search for invalid or empty context", () => {
    expect(getBackToSearchHref(null)).toBe("/search");
    expect(getBackToSearchHref("")).toBe("/search");
    expect(getBackToSearchHref("invalid%format")).toBe("/search");
  });
});
