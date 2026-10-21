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

describe("SRCH-02 Full Workflow Regression Test: Browse -> Listing -> Back to Search -> Enter Keyword", () => {
  it("preserves implicit default when returning from listing and entering a keyword", () => {
    // 1. User arrives at /search (clean browse)
    const initialRaw = searchFiltersSchema.parse({});
    expect(initialRaw.sort).toBeUndefined();
    expect(getEffectiveSort(initialRaw.q, initialRaw.sort)).toBe("newest");

    // 2. Search context serialized for listing card navigation from browse
    const searchContext = serializeSearchFilters(initialRaw);
    expect(searchContext).toBe("page=1"); // No sort= parameter injected!

    // 3. User clicks listing card, then clicks Back to Search
    const backHref = getBackToSearchHref(searchContext);
    expect(backHref).toBe("/search?page=1");

    // 4. URL restored params parsed on /search
    const restoredRaw = searchFiltersSchema.parse({ page: "1" });
    expect(restoredRaw.sort).toBeUndefined(); // Still implicit!

    // 5. User enters keyword 'iphone' while on restored browse page
    const keywordEffectiveSort = getEffectiveSort("iphone", restoredRaw.sort);
    expect(keywordEffectiveSort).toBe("relevance"); // Switches to relevance correctly!
  });
});
