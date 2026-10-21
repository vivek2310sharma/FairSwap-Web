import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { Category, City, Locality } from "@/types/listing";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useTransition: () => [false, (cb: () => void) => cb()],
}));

const sampleCategories: Category[] = [
  {
    id: "cat-1",
    slug: "electronics",
    name: "Electronics & Appliances",
    description: null,
    icon: null,
    sort_order: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    slug: "vehicles",
    name: "Vehicles & Motors",
    description: null,
    icon: null,
    sort_order: 2,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const sampleCities: City[] = [
  {
    id: "city-mumbai",
    name: "Mumbai",
    state: "Maharashtra",
    slug: "mumbai",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "city-delhi",
    name: "Delhi NCR",
    state: "Delhi",
    slug: "delhi-ncr",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const sampleLocalities: Locality[] = [
  {
    id: "loc-andheri",
    city_id: "city-mumbai",
    name: "Andheri East",
    slug: "andheri-east",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "loc-bandra",
    city_id: "city-mumbai",
    name: "Bandra West",
    slug: "bandra-west",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("SRCH-04 ActiveFilterChips Component", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("renders nothing when no filters are active", () => {
    const { container } = render(
      <ActiveFilterChips
        filters={{ page: 1 }}
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders chips with human-readable labels and formats INR prices", () => {
    render(
      <ActiveFilterChips
        filters={{
          q: "laptop",
          category: "electronics",
          city: "city-mumbai",
          locality: "loc-andheri",
          condition: "like_new",
          price_min: 10000,
          price_max: 50000,
          sort: "price_asc",
          page: 2,
        }}
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
      />
    );

    expect(screen.getByText('Keyword: "laptop"')).toBeInTheDocument();
    expect(screen.getByText("Electronics & Appliances")).toBeInTheDocument();
    expect(screen.getByText("Mumbai")).toBeInTheDocument();
    expect(screen.getByText("Andheri East")).toBeInTheDocument();
    expect(screen.getByText("Like New")).toBeInTheDocument();
    expect(screen.getByText("Min ₹10,000")).toBeInTheDocument();
    expect(screen.getByText("Max ₹50,000")).toBeInTheDocument();
    expect(screen.getByText("Price: Low to High")).toBeInTheDocument();

    // Verify pagination is not displayed as a filter chip
    expect(screen.queryByText(/page/i)).not.toBeInTheDocument();
  });

  it("removes single chip and preserves other filters, resetting page to 1", () => {
    render(
      <ActiveFilterChips
        filters={{
          q: "laptop",
          category: "electronics",
          page: 3,
        }}
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
      />
    );

    const removeKeywordBtn = screen.getByRole("button", {
      name: /remove filter keyword: "laptop"/i,
    });
    fireEvent.click(removeKeywordBtn);

    expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
  });

  it("clearing district chip also clears dependent locality", () => {
    render(
      <ActiveFilterChips
        filters={{
          city: "city-mumbai",
          locality: "loc-andheri",
          category: "electronics",
          page: 2,
        }}
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
      />
    );

    const removeCityBtn = screen.getByRole("button", {
      name: /remove filter mumbai/i,
    });
    fireEvent.click(removeCityBtn);

    expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
  });

  it("clicking Clear All resets to /search", () => {
    render(
      <ActiveFilterChips
        filters={{
          q: "phone",
          price_min: 5000,
        }}
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
      />
    );

    const clearAllBtn = screen.getByRole("button", { name: /clear all/i });
    fireEvent.click(clearAllBtn);

    expect(mockPush).toHaveBeenCalledWith("/search");
  });
});

describe("SRCH-04 SearchFilters Component (Desktop Instant Apply & Mobile Drawer)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("desktop: category dropdown change applies immediately", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{}}
      />
    );

    const categorySelect = screen.getAllByLabelText(/category/i)[0];
    fireEvent.change(categorySelect, { target: { value: "electronics" } });

    expect(mockPush).toHaveBeenCalledWith("/search?category=electronics&page=1");
  });

  it("desktop: district dropdown change clears locality and applies immediately", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{ city: "city-mumbai", locality: "loc-andheri" }}
      />
    );

    const citySelect = screen.getAllByLabelText(/district/i)[0];
    fireEvent.change(citySelect, { target: { value: "city-delhi" } });

    expect(mockPush).toHaveBeenCalledWith("/search?city=city-delhi&page=1");
  });

  it("desktop: keyword typing is debounced by 500ms and Enter key applies immediately", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{}}
      />
    );

    const keywordInput = screen.getAllByPlaceholderText(/search items, titles, brands/i)[0];
    fireEvent.change(keywordInput, { target: { value: "laptop" } });

    // Should not call router.push immediately
    expect(mockPush).not.toHaveBeenCalled();

    // Advance 400ms - still not called
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockPush).not.toHaveBeenCalled();

    // Advance 100ms (total 500ms) - should be called
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockPush).toHaveBeenCalledWith("/search?q=laptop&page=1");

    // Enter key triggers immediate search
    mockPush.mockReset();
    fireEvent.change(keywordInput, { target: { value: "phone" } });
    fireEvent.keyDown(keywordInput, { key: "Enter", code: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/search?q=phone&page=1");
  });

  it("desktop: price range validates on blur and does not trigger on digits", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{}}
      />
    );

    const minPriceInput = screen.getAllByLabelText(/minimum price in rupees/i)[0];
    const maxPriceInput = screen.getAllByLabelText(/maximum price in rupees/i)[0];

    // Typing digits does not navigate
    fireEvent.change(minPriceInput, { target: { value: "100" } });
    expect(mockPush).not.toHaveBeenCalled();

    // Invalid range (min > max) on blur should not trigger navigation
    fireEvent.change(maxPriceInput, { target: { value: "50" } });
    fireEvent.blur(maxPriceInput);
    expect(mockPush).not.toHaveBeenCalled();

    // Valid range on blur triggers navigation
    fireEvent.change(maxPriceInput, { target: { value: "5000" } });
    fireEvent.blur(maxPriceInput);
    expect(mockPush).toHaveBeenCalledWith("/search?price_min=100&price_max=5000&page=1");
  });

  it("mobile drawer: keeps batch apply button and discards changes on close", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{ category: "electronics" }}
      />
    );

    // Open mobile drawer
    const openDrawerBtn = screen.getByRole("button", { name: /filter & sort/i });
    fireEvent.click(openDrawerBtn);

    const drawer = screen.getByRole("dialog", { name: /filter listings/i });
    expect(drawer).toBeInTheDocument();

    // Select new condition inside drawer
    const conditionSelect = within(drawer).getByLabelText(/condition/i);
    fireEvent.change(conditionSelect, { target: { value: "new" } });

    // Drawer changes should NOT trigger instant push
    expect(mockPush).not.toHaveBeenCalled();

    // Close without applying discards changes
    const closeBtn = within(drawer).getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    // Reopen drawer and verify condition was restored to initial
    fireEvent.click(openDrawerBtn);
    const newDrawer = screen.getByRole("dialog", { name: /filter listings/i });
    expect(within(newDrawer).getByLabelText(/condition/i)).toHaveValue("");
  });

  it("mobile drawer: apply filters button submits all selected filters together", () => {
    render(
      <SearchFilters
        categories={sampleCategories}
        cities={sampleCities}
        localities={sampleLocalities}
        initialFilters={{}}
      />
    );

    // Open mobile drawer
    const openDrawerBtn = screen.getByRole("button", { name: /filter & sort/i });
    fireEvent.click(openDrawerBtn);

    const drawer = screen.getByRole("dialog", { name: /filter listings/i });

    const conditionSelect = within(drawer).getByLabelText(/condition/i);
    fireEvent.change(conditionSelect, { target: { value: "like_new" } });

    const sortSelect = within(drawer).getByLabelText(/sort by/i);
    fireEvent.change(sortSelect, { target: { value: "price_asc" } });

    const applyBtn = within(drawer).getByRole("button", { name: /apply filters/i });
    fireEvent.click(applyBtn);

    expect(mockPush).toHaveBeenCalledWith(
      "/search?condition=like_new&sort=price_asc&page=1"
    );
  });
});
