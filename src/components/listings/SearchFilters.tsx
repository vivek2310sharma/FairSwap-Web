"use client";

import { useState, useRef, useEffect, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search, Loader2 } from "lucide-react";
import { Category, City, Locality } from "@/types/listing";

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

function FilterForm({
  categories,
  cities,
  filteredLocalities,
  query,
  category,
  city,
  locality,
  condition,
  priceMin,
  priceMax,
  sort,
  isPending,
  hasActiveFilters,
  onQueryChange,
  onCategoryChange,
  onCityChange,
  onLocalityChange,
  onConditionChange,
  onPriceMinChange,
  onPriceMaxChange,
  onPriceBlurOrEnter,
  onSortChange,
  onSubmit,
  onReset,
  onApplyQuery,
}: {
  categories: Category[];
  cities: City[];
  filteredLocalities: Locality[];
  query: string;
  category: string;
  city: string;
  locality: string;
  condition: string;
  priceMin: string;
  priceMax: string;
  sort: string;
  isPending: boolean;
  hasActiveFilters: boolean;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onLocalityChange: (val: string) => void;
  onConditionChange: (val: string) => void;
  onPriceMinChange: (val: string) => void;
  onPriceMaxChange: (val: string) => void;
  onPriceBlurOrEnter: () => void;
  onSortChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  onApplyQuery: (q: string) => void;
}) {
  const baseId = useId();

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-label="Listing filters">
      {/* Search Query Input */}
      <div>
        <label htmlFor={`${baseId}-search-q`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Keywords
        </label>
        <div className="relative mt-1">
          <input
            id={`${baseId}-search-q`}
            type="search"
            value={query}
            onChange={onQueryChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApplyQuery(query);
              }
            }}
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
        <label htmlFor={`${baseId}-filter-category`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Category
        </label>
        <select
          id={`${baseId}-filter-category`}
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
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
        <label htmlFor={`${baseId}-filter-city`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          District
        </label>
        <select
          id={`${baseId}-filter-city`}
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
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
          <label htmlFor={`${baseId}-filter-locality`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Locality / Area
          </label>
          <select
            id={`${baseId}-filter-locality`}
            value={locality}
            onChange={(e) => onLocalityChange(e.target.value)}
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
        <label htmlFor={`${baseId}-filter-condition`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Condition
        </label>
        <select
          id={`${baseId}-filter-condition`}
          value={condition}
          onChange={(e) => onConditionChange(e.target.value)}
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
            id={`${baseId}-filter-price-min`}
            type="number"
            min="0"
            step="100"
            placeholder="Min ₹"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            onBlur={onPriceBlurOrEnter}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onPriceBlurOrEnter();
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            aria-label="Minimum price in rupees"
          />
          <input
            id={`${baseId}-filter-price-max`}
            type="number"
            min="0"
            step="100"
            placeholder="Max ₹"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            onBlur={onPriceBlurOrEnter}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onPriceBlurOrEnter();
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            aria-label="Maximum price in rupees"
          />
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor={`${baseId}-filter-sort`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Sort By
        </label>
        <select
          id={`${baseId}-filter-sort`}
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
        >
          <option value="newest">Newest First</option>
          <option value="relevance">Most Relevant</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col gap-2">
        {/* Mobile-only Apply button */}
        <button
          type="submit"
          disabled={isPending}
          className="lg:hidden w-full rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-action-700 focus:outline-none focus:ring-2 focus:ring-action-500 disabled:opacity-50"
        >
          {isPending ? "Applying..." : "Apply Filters"}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
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
  const [sort, setSort] = useState(initialFilters.sort || "newest");

  // Synchronize local state with initialFilters when initialFilters prop changes
  const [prevInitialFilters, setPrevInitialFilters] = useState(initialFilters);
  if (initialFilters !== prevInitialFilters) {
    setPrevInitialFilters(initialFilters);
    setQuery(initialFilters.q || "");
    setCategory(initialFilters.category || "");
    setCity(initialFilters.city || "");
    setLocality(initialFilters.locality || "");
    setCondition(initialFilters.condition || "");
    setPriceMin(initialFilters.price_min?.toString() || "");
    setPriceMax(initialFilters.price_max?.toString() || "");
    setSort(initialFilters.sort || "newest");
  }

  // Ref for debouncing query changes on desktop
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Filter localities by selected city
  const filteredLocalities = city
    ? localities.filter((loc) => loc.city_id === city)
    : localities;

  // Apply filters helper
  const applyFilters = (overrides?: {
    q?: string;
    category?: string;
    city?: string;
    locality?: string;
    condition?: string;
    price_min?: string;
    price_max?: string;
    sort?: string;
  }) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const nextQuery = overrides && "q" in overrides ? overrides.q : query;
    const nextCategory = overrides && "category" in overrides ? overrides.category : category;
    const nextCity = overrides && "city" in overrides ? overrides.city : city;
    const nextLocality = overrides && "locality" in overrides ? overrides.locality : locality;
    const nextCondition = overrides && "condition" in overrides ? overrides.condition : condition;
    const nextPriceMin = overrides && "price_min" in overrides ? overrides.price_min : priceMin;
    const nextPriceMax = overrides && "price_max" in overrides ? overrides.price_max : priceMax;
    const nextSort = overrides && "sort" in overrides ? overrides.sort : sort;

    const params = new URLSearchParams();
    if (nextQuery && nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    if (nextCity) params.set("city", nextCity);
    if (nextLocality) params.set("locality", nextLocality);
    if (nextCondition) params.set("condition", nextCondition);
    if (nextPriceMin && nextPriceMin.trim()) params.set("price_min", nextPriceMin.trim());
    if (nextPriceMax && nextPriceMax.trim()) params.set("price_max", nextPriceMax.trim());
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);

    // Reset to page 1 on search filter change
    params.set("page", "1");

    const queryStr = params.toString();
    const targetUrl = queryStr ? `/search?${queryStr}` : "/search";

    startTransition(() => {
      router.push(targetUrl);
      setMobileFiltersOpen(false);
    });
  };

  const handleReset = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setQuery("");
    setCategory("");
    setCity("");
    setLocality("");
    setCondition("");
    setPriceMin("");
    setPriceMax("");
    setSort("newest");

    startTransition(() => {
      router.push("/search");
      setMobileFiltersOpen(false);
    });
  };

  // Debounced Query Update for Desktop
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (!mobileFiltersOpen) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        applyFilters({ q: val });
      }, 500);
    }
  };

  // Price validation and apply on blur / Enter
  const handlePriceBlurOrEnter = () => {
    if (mobileFiltersOpen) return;

    const minStr = priceMin.trim();
    const maxStr = priceMax.trim();

    const minNum = minStr !== "" ? Number(minStr) : undefined;
    const maxNum = maxStr !== "" ? Number(maxStr) : undefined;

    // Validate price range inputs
    if (minNum !== undefined && (isNaN(minNum) || minNum < 0)) return;
    if (maxNum !== undefined && (isNaN(maxNum) || maxNum < 0)) return;
    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) return;

    const initialMinStr = initialFilters.price_min?.toString() || "";
    const initialMaxStr = initialFilters.price_max?.toString() || "";

    // Apply if changed from current URL state
    if (minStr !== initialMinStr || maxStr !== initialMaxStr) {
      applyFilters({
        price_min: minStr,
        price_max: maxStr,
      });
    }
  };

  const handleMobileClose = () => {
    // Discard uncommitted changes in mobile drawer
    setQuery(initialFilters.q || "");
    setCategory(initialFilters.category || "");
    setCity(initialFilters.city || "");
    setLocality(initialFilters.locality || "");
    setCondition(initialFilters.condition || "");
    setPriceMin(initialFilters.price_min?.toString() || "");
    setPriceMax(initialFilters.price_max?.toString() || "");
    setSort(initialFilters.sort || "newest");
    setMobileFiltersOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const hasActiveFilters =
    Boolean(query) ||
    Boolean(category) ||
    Boolean(city) ||
    Boolean(locality) ||
    Boolean(condition) ||
    Boolean(priceMin) ||
    Boolean(priceMax) ||
    sort !== "newest";

  const formProps = {
    categories,
    cities,
    filteredLocalities,
    query,
    category,
    city,
    locality,
    condition,
    priceMin,
    priceMax,
    sort,
    isPending,
    hasActiveFilters,
    onQueryChange: handleQueryChange,
    onCategoryChange: (val: string) => {
      setCategory(val);
      if (!mobileFiltersOpen) applyFilters({ category: val });
    },
    onCityChange: (val: string) => {
      setCity(val);
      setLocality("");
      if (!mobileFiltersOpen) applyFilters({ city: val, locality: "" });
    },
    onLocalityChange: (val: string) => {
      setLocality(val);
      if (!mobileFiltersOpen) applyFilters({ locality: val });
    },
    onConditionChange: (val: string) => {
      setCondition(val);
      if (!mobileFiltersOpen) applyFilters({ condition: val });
    },
    onPriceMinChange: setPriceMin,
    onPriceMaxChange: setPriceMax,
    onPriceBlurOrEnter: handlePriceBlurOrEnter,
    onSortChange: (val: string) => {
      setSort(val);
      if (!mobileFiltersOpen) applyFilters({ sort: val });
    },
    onSubmit: handleSubmit,
    onReset: handleReset,
    onApplyQuery: (q: string) => applyFilters({ q }),
  };

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
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">Filter Listings</h2>
            {isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-action-600" aria-label="Loading..." />
            )}
          </div>
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
        <FilterForm {...formProps} />
      </div>

      {/* Mobile Drawer */}
      {mobileFiltersOpen && (
        <div
          id="mobile-filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Filter listings"
          className="lg:hidden fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs"
        >
          <div className="ml-auto w-full max-w-xs h-full overflow-y-auto bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Filters</h2>
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin text-action-600" aria-label="Loading..." />
                )}
              </div>
              <button
                type="button"
                onClick={handleMobileClose}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
            <FilterForm {...formProps} />
          </div>
        </div>
      )}
    </div>
  );
}
