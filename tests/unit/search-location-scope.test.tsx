import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SearchPage from "@/app/search/page";
import { getPublicCategories, getPublicCities, searchPublicListings } from "@/lib/discovery/queries";
import { getAppliedLocality } from "@/lib/discovery/locality-page";
vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("@/components/footer", () => ({ Footer: () => null }));
vi.mock("@/components/listings/SearchFilters", () => ({ SearchFilters: () => null }));
vi.mock("@/components/listings/SearchLocation", () => ({ SearchLocation: ({ area }: { area: { label: string } | null }) => <p>{area?.label || "All India"}</p> }));
vi.mock("@/lib/discovery/queries", () => ({ getPublicCategories: vi.fn(), getPublicCities: vi.fn(), searchPublicListings: vi.fn() }));
vi.mock("@/lib/discovery/locality-page", () => ({ getAppliedLocality: vi.fn() }));
vi.mock("@/lib/discovery/public-family-query", () => ({ loadPublicFamilyDisplays: vi.fn(async () => new Map()) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
const city = "11111111-1111-4111-8111-111111111111";
const locality = "22222222-2222-4222-8222-222222222222";
const empty = { items: [], total_count: 0, total_pages: 0, page: 1, per_page: 12 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublicCategories).mockResolvedValue([{ id: "c1", slug: "electronics", name: "Electronics", description: null, icon: null, sort_order: 1, is_active: true, created_at: "", updated_at: "" }]);
  vi.mocked(getPublicCities).mockResolvedValue([{ id: city, name: "Bengaluru", state: "Karnataka", slug: "bengaluru", is_active: true, created_at: "" }]);
  vi.mocked(getAppliedLocality).mockResolvedValue([{ id: locality, city_id: city, name: "Koramangala", slug: "koramangala", is_active: true, created_at: "" }]);
  vi.mocked(searchPublicListings).mockResolvedValue(empty);
});
afterEach(cleanup);
const show = async (params: Record<string, string | string[] | undefined>) => render(await SearchPage({ searchParams: Promise.resolve(params) }));
describe("search public-area scope", () => {
  it("offers explicit district widening with keyword/category and advanced filters intact", async () => {
    await show({ q: "bicycle", category: "electronics", city, locality, price_min: "100", page: "3" });
    const url = new URL(screen.getByRole("link", { name: /View ads across the district/ }).getAttribute("href")!, "https://fairswap.in");
    expect(url.searchParams.get("q")).toBe("bicycle"); expect(url.searchParams.get("category")).toBe("electronics");
    expect(url.searchParams.get("city")).toBe(city); expect(url.searchParams.get("price_min")).toBe("100");
    expect(url.searchParams.has("locality")).toBe(false); expect(url.searchParams.has("page")).toBe(false);
    expect(screen.getByText("Koramangala, Bengaluru district, Karnataka")).toBeInTheDocument();
  });
  it("offers All India only after a district search, preserving keyword and category", async () => {
    await show({ q: "bike", category: "electronics", city });
    expect(screen.getByRole("link", { name: /View ads across All India/ })).toHaveAttribute("href", "/search?q=bike&category=electronics");
  });
  it.each([{ city: "unknown" }, { locality }, { q: ["bike", "phone"] }, { price_min: "invalid" }])("does not query listings or silently widen invalid parameters %s", async params => {
    await show(params);
    expect(searchPublicListings).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("invalid or unavailable");
    expect(screen.queryByRole("link", { name: /View ads across/ })).not.toBeInTheDocument();
  });
  it("does not misrepresent a provider failure as an empty district", async () => {
    vi.mocked(searchPublicListings).mockResolvedValue({ ...empty, unavailable: true });
    await show({ city });
    expect(screen.getByText("Search is temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View ads across/ })).not.toBeInTheDocument();
  });
});
