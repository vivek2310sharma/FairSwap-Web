"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search } from "lucide-react";
import { Category, City, Locality, SearchSortOption, getEffectiveSort } from "@/types/listing";

interface SearchFiltersProps {
  categories: Category[];
  cities: City[];
  localities: Locality[];
  initialFilters: {
    q?: string;
    category?: string;
    city?: string;
    locality?: string;
    condition?: string;
    price_min?: number;
    price_max?: number;
    sort?: string;
  };
}

export function SearchFilters({
  categories,
  cities,
  localities,
  initialFilters,
}: SearchFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Form State
  const [query, setQuery] = useState(initialFilters.q || "");
  const [category, setCategory] = useState(initialFilters.category || "");
  const [city, setCity] = useState(initialFilters.city || "");
  const [locality, setLocality] = useState(initialFilters.locality || "");
  const [condition, setCondition] = useState(initialFilters.condition || "");
  const [priceMin, setPriceMin] = useState(initialFilters.price_min?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialFilters.price_max?.toString() || "");

  // Track if sort was explicitly provided in props or changed by user.
  // Note: sort="relevance" without a keyword is an invalid/implicit state and should not lock as explicit sort.
  const hasInitialKeyword = Boolean(initialFilters.q && initialFilters.q.trim().length > 0);
  const initialEffectiveSort = getEffectiveSort(initialFilters.q, initialFilters.sort);
  const [sort, setSort] = useState<SearchSortOption>(initialEffectiveSort);
  const [isExplicitSort, setIsExplicitSort] = useState<boolean>(
    initialFilters.sort !== undefined &&
      initialFilters.sort !== "" &&
      !(initialFilters.sort === "relevance" && !hasInitialKeyword)
  );

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    const hasKeyword = newQuery.trim().length > 0;

    if (!isExplicitSort) {
      setSort(hasKeyword ? "relevance" : "newest");
    } else if (!hasKeyword && sort === "relevance") {
      setSort("newest");
      setIsExplicitSort(false);
    }
  };

  const handleSortChange = (newSort: string) => {
    const validSort = newSort as SearchSortOption;
    setSort(validSort);

    const hasKeyword = query.trim().length > 0;
    const isImplicitDefault = hasKeyword ? validSort === "relevance" : validSort === "newest";

    setIsExplicitSort(!isImplicitDefault);
  };

  // Filter localities by selected city
  const filteredLocalities = city
    ? localities.filter((loc) => loc.city_id === city)
    : localities;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (locality) params.set("locality", locality);
    if (condition) params.set("condition", condition);
    if (priceMin.trim()) params.set("price_min", priceMin.trim());
    if (priceMax.trim()) params.set("price_max", priceMax.trim());

    if (isExplicitSort || (trimmedQuery && sort !== "relevance")) {
      params.set("sort", sort);
    }

    // Reset to page 1 on new search
    params.set("page", "1");

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
      setMobileFiltersOpen(false);
    });
  };

  const handleReset = () => {
    setQuery("");
    setCategory("");
    setCity("");
    setLocality("");
    setCondition("");
    setPriceMin("");
    setPriceMax("");
    setSort("newest");
    setIsExplicitSort(false);

    startTransition(() => {
      router.push("/search");
      setMobileFiltersOpen(false);
    });
  };

  const currentEffectiveSort = getEffectiveSort(query, sort);
  const hasActiveFilters =
    Boolean(query) ||
    Boolean(category) ||
    Boolean(city) ||
    Boolean(locality) ||
    Boolean(condition) ||
    Boolean(priceMin) ||
    Boolean(priceMax) ||
    isExplicitSort;

  const filterFormContent = (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="Listing filters">
      {/* Search Query Input */}
      <div>
        <label htmlFor="search-q" className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Keywords
        </label>
        <div className="relative mt-1">
          <input
            id="search-q"
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search items, titles, brands..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label htmlFor="filter-category" className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Category
        </label>
        <select
          id="filter-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* District Selection */}
      <div>
        <label htmlFor="filter-city" className="block text-xs font-semibold uppercase tracking-wider text-muted">
          District
        </label>
        <select
          id="filter-city"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setLocality(""); // reset locality when district changes
          }}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
        >
          <option value="">All Districts</option>
          {cities.map((ci) => (
            <option key={ci.id} value={ci.id}>
              {ci.name}, {ci.state}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted">
          Filters by administrative district. No distance radii are inferred.
        </p>
      </div>

      {/* Locality Selection (Only if district selected) */}
      {city && filteredLocalities.length > 0 && (
        <div>
          <label htmlFor="filter-locality" className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Locality / Area
          </label>
          <select
            id="filter-locality"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
          >
            <option value="">All Areas in District</option>
            {filteredLocalities.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Condition Selection */}
      <div>
        <label htmlFor="filter-condition" className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Condition
        </label>
        <select
          id="filter-condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
        >
          <option value="">Any Condition</option>
          <option value="new">Brand New</option>
          <option value="like_new">Like New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">For Parts / Poor</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Price Range (₹)
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <input
            id="filter-price-min"
            type="number"
            min="0"
            step="100"
            placeholder="Min ₹"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            aria-label="Minimum price in rupees"
          />
          <input
            id="filter-price-max"
            type="number"
            min="0"
            step="100"
            placeholder="Max ₹"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            aria-label="Maximum price in rupees"
          />
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor="filter-sort" className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Sort By
        </label>
        <select
          id="filter-sort"
          value={currentEffectiveSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
        >
          <option value="newest">Newest First</option>
          <option value="relevance" disabled={!query.trim()}>Most Relevant</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-action-700 focus:outline-none focus:ring-2 focus:ring-action-500 disabled:opacity-50"
        >
          {isPending ? "Applying..." : "Apply Filters"}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted hover:bg-surface hover:text-foreground focus:outline-none"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Clear All Filters
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div>
      {/* Mobile Filters Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground shadow-xs"
          aria-expanded={mobileFiltersOpen}
          aria-controls="mobile-filter-drawer"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter &amp; Sort
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full bg-action-600" aria-label="Active filters" />
          )}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-foreground">Filter Listings</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-brand-link hover:underline"
            >
              Reset
            </button>
          )}
        </div>
        {filterFormContent}
      </div>

      {/* Mobile Drawer */}
      {mobileFiltersOpen && (
        <div
          id="mobile-filter-drawer"
          className="lg:hidden fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs"
        >
          <div className="ml-auto w-full max-w-xs h-full overflow-y-auto bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
            {filterFormContent}
          </div>
        </div>
      )}
    </div>
  );
}
