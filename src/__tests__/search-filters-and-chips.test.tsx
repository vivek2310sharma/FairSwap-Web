import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { getEffectiveSort } from "@/types/listing";
import { GET as localitiesRouteGET } from "@/app/api/discovery/localities/route";
import { getLocalityPage } from "@/lib/discovery/locality-page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/discovery/locality-page", () => ({
  getLocalityPage: vi.fn(async (cityId: string) => ({ items: [
    { id: "loc-1", city_id: cityId, name: "Vaishali Nagar", slug: "vaishali-nagar", is_active: true, created_at: "" },
  ], nextOffset: null })),
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
    vi.mocked(global.fetch).mockReset();
    vi.mocked(global.fetch).mockImplementation(async () => new Response("[]"));
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

  it("retains production category family optgroups while instantly applying a car category", () => {
    const car = { ...mockData.cat, id: "cat-car", slug: "car-hatchback", name: "Hatchbacks" };
    const motorcycle = { ...mockData.cat, id: "cat-bike", slug: "tw-commuter-bikes", name: "Commuter Bikes" };
    const rental = { ...mockData.cat, id: "cat-rental", slug: "rental-apartment-or-flat", name: "Apartments" };
    render(<SearchFilters categories={[mockData.cat, motorcycle, car, rental]}
      cities={[mockData.city1]} localities={[]} initialFilters={{}} />);
    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(Array.from(select.querySelectorAll("optgroup")).map(group => group.label)).toEqual([
      "Goods", "Motorcycles & Scooters", "Cars", "Monthly Rentals, PG & Co-living",
    ]);
    fireEvent.change(select, { target: { value: "car-hatchback" } });
    expect(mockPush).toHaveBeenLastCalledWith("/search?category=car-hatchback&page=1");
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
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([mockData.loc1])));
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
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
    it("rejects unbounded or invalid offsets before querying", async () => {
      for (const offset of ["-1", "1.5", "1000001", "NaN"]) {
        const res = await localitiesRouteGET(new Request(`http://localhost/api/discovery/localities?city_id=${mockData.city1.id}&offset=${offset}`));
        expect(res.status).toBe(400);
      }
      expect(getLocalityPage).not.toHaveBeenCalled();
    });

    it("returns a non-cacheable retryable error without exposing backend details", async () => {
      vi.mocked(getLocalityPage).mockRejectedValueOnce(new Error("private backend details"));
      const res = await localitiesRouteGET(new Request(`http://localhost/api/discovery/localities?city_id=${mockData.city1.id}`));
      expect(res.status).toBe(503);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(await res.text()).not.toContain("private backend details");
    });
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
      expect(res.headers.get("Cache-Control")).toContain("private");
      const json = await res.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json).toHaveLength(1);
      expect(json[0].name).toBe("Vaishali Nagar");
    });
  });

  describe("SRCH-04 locality and navigation regressions", () => {
    const view = (filters = {}) => <SearchFilters categories={[mockData.cat]} cities={[mockData.city1, mockData.city2]} localities={[]} initialFilters={filters} />;
    const response = (items: unknown[], next?: number) => new Response(JSON.stringify(items), {
      headers: next === undefined ? {} : { "X-Next-Offset": String(next) },
    });

    it("distinguishes failure from empty and retries without navigating", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 503 }))
        .mockResolvedValueOnce(response([]));
      render(view({ city: mockData.city1.id }));
      await screen.findByRole("alert");
      expect(screen.queryByText(/No areas available/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry areas" }));
      await screen.findByText(/No areas available/);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("loads additional pages only on demand, preserving prior options", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(response([mockData.loc1], 1))
        .mockResolvedValueOnce(response([{ ...mockData.loc1, id: "extra", name: "दूसरा क्षेत्र" }]));
      render(view({ city: mockData.city1.id }));
      fireEvent.click(await screen.findByRole("button", { name: "Load more areas" }));
      await screen.findByRole("option", { name: "दूसरा क्षेत्र" });
      expect(screen.getByRole("option", { name: "Vaishali Nagar" })).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(vi.mocked(fetch).mock.calls[1][0]).toContain("offset=1");
      expect(screen.queryByRole("button", { name: "Load more areas" })).not.toBeInTheDocument();
    });

    it("keeps an applied area beyond the first page visible", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(response([{ ...mockData.loc1, id: "another", name: "Another area" }], 100));
      render(<SearchFilters categories={[mockData.cat]} cities={[mockData.city1]}
        localities={[mockData.loc1]} initialFilters={{ city: mockData.city1.id, locality: mockData.loc1.id }} />);
      await screen.findByRole("button", { name: "Load more areas" });
      expect(screen.getByLabelText("Locality / Area")).toHaveValue(mockData.loc1.id);
    });

    it("retains earlier options after a later-page error and retries the same offset", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(response([mockData.loc1], 1))
        .mockResolvedValueOnce(new Response("{}", { status: 503 }))
        .mockResolvedValueOnce(response([{ ...mockData.loc1, id: "extra", name: "Extra area" }]));
      render(view({ city: mockData.city1.id }));
      fireEvent.click(await screen.findByRole("button", { name: "Load more areas" }));
      fireEvent.click(await screen.findByRole("button", { name: "Retry areas" }));
      await screen.findByRole("option", { name: "Extra area" });
      expect(screen.getByRole("option", { name: "Vaishali Nagar" })).toBeInTheDocument();
      expect(vi.mocked(fetch).mock.calls[2][0]).toContain("offset=1");
    });

    it("aborts stale requests and ignores a late response even if transport ignores abort", async () => {
      let resolveOld!: (value: Response) => void;
      vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
        .mockResolvedValueOnce(response([mockData.loc2]));
      const { unmount } = render(view({ city: mockData.city1.id }));
      const oldSignal = vi.mocked(fetch).mock.calls[0][1]?.signal;
      fireEvent.change(screen.getByLabelText("District"), { target: { value: mockData.city2.id } });
      expect(oldSignal?.aborted).toBe(true);
      await screen.findByRole("option", { name: "Hiran Magri" });
      await act(async () => { resolveOld(response([mockData.loc1])); });
      expect(screen.queryByRole("option", { name: "Vaishali Nagar" })).not.toBeInTheDocument();
      const latestSignal = vi.mocked(fetch).mock.calls[1][1]?.signal;
      unmount();
      expect(latestSignal?.aborted).toBe(true);
    });

    it("accumulates price blur and rapid desktop selections", () => {
      render(view());
      const price = screen.getByLabelText("Minimum price in rupees");
      fireEvent.change(price, { target: { value: "500" } });
      fireEvent.blur(price);
      fireEvent.change(screen.getByLabelText("Category"), { target: { value: "electronics" } });
      fireEvent.change(screen.getByLabelText("Condition"), { target: { value: "good" } });
      expect(mockPush).toHaveBeenLastCalledWith("/search?category=electronics&condition=good&price_min=500&page=1");
    });

    it("mobile Close discards drafts and Apply batches them; Back/Forward props restore state", () => {
      const { rerender } = render(view({ q: "phone" }));
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/ }));
      let drawer = within(screen.getByRole("dialog"));
      fireEvent.change(drawer.getByLabelText("Category"), { target: { value: "electronics" } });
      fireEvent.click(drawer.getByRole("button", { name: "Close" }));
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Category")).toHaveValue("");
      fireEvent.click(screen.getByRole("button", { name: /Filter & Sort/ }));
      drawer = within(screen.getByRole("dialog"));
      fireEvent.change(drawer.getByLabelText("Category"), { target: { value: "electronics" } });
      fireEvent.click(drawer.getByRole("button", { name: "Apply Filters" }));
      expect(mockPush).toHaveBeenLastCalledWith("/search?q=phone&category=electronics&page=1");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      rerender(view({ q: "phone", category: "electronics" }));
      rerender(view({ q: "phone" }));
      expect(screen.getByLabelText("Category")).toHaveValue("");
      rerender(view({ q: "phone", category: "electronics" }));
      expect(screen.getByLabelText("Category")).toHaveValue("electronics");
    });
  });
});
