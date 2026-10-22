"use client";

import { useState, useRef, useEffect, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, RotateCcw, Search, Loader2, AlertCircle } from "lucide-react";
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

const MAX_PRICE = 100000000;

export function SearchFilters({
  categories,
  cities,
  localities,
  initialFilters,
}: SearchFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const baseId = useId();

  // Uncommitted local form state
  const [query, setQuery] = useState(initialFilters.q || "");
  const [category, setCategory] = useState(initialFilters.category || "");
  const [city, setCity] = useState(initialFilters.city || "");
  const [locality, setLocality] = useState(initialFilters.locality || "");
  const [condition, setCondition] = useState(initialFilters.condition || "");
  const [priceMin, setPriceMin] = useState(initialFilters.price_min?.toString() || "");
  const [priceMax, setPriceMax] = useState(initialFilters.price_max?.toString() || "");

  // Staging Keyword-dependent Relevance Sort Tracking
  const hasInitialKeyword = Boolean(initialFilters.q && initialFilters.q.trim().length > 0);
  const initialEffectiveSort = getEffectiveSort(initialFilters.q, initialFilters.sort);
  const [sort, setSort] = useState<SearchSortOption>(initialEffectiveSort);
  const [isExplicitSort, setIsExplicitSort] = useState<boolean>(
    initialFilters.sort !== undefined &&
      initialFilters.sort !== "" &&
      !(initialFilters.sort === "relevance" && !hasInitialKeyword)
  );

  // Synchronize local form state when applied initialFilters prop changes using React state pattern
  const [prevInitialFilters, setPrevInitialFilters] = useState(initialFilters);
  if (initialFilters !== prevInitialFilters) {
    setPrevInitialFilters(initialFilters);
    const newHasKeyword = Boolean(initialFilters.q && initialFilters.q.trim().length > 0);
    const newEffectiveSort = getEffectiveSort(initialFilters.q, initialFilters.sort);
    const newIsExplicit =
      initialFilters.sort !== undefined &&
      initialFilters.sort !== "" &&
      !(initialFilters.sort === "relevance" && !newHasKeyword);

    setQuery(initialFilters.q || "");
    setCategory(initialFilters.category || "");
    setCity(initialFilters.city || "");
    setLocality(initialFilters.locality || "");
    setCondition(initialFilters.condition || "");
    setPriceMin(initialFilters.price_min?.toString() || "");
    setPriceMax(initialFilters.price_max?.toString() || "");
    setSort(newEffectiveSort);
    setIsExplicitSort(newIsExplicit);
    setPriceError(null);
  }

  // Ref for debouncing query changes on desktop
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Filter localities by selected city/district
  const filteredLocalities = city
    ? localities.filter((loc) => loc.city_id === city)
    : localities;

  // Price Range Validator
  const validatePriceInputs = (minStr: string, maxStr: string) => {
    const trimmedMin = minStr.trim();
    const trimmedMax = maxStr.trim();

    let minNum: number | undefined;
    let maxNum: number | undefined;

    if (trimmedMin !== "") {
      minNum = Number(trimmedMin);
      if (isNaN(minNum) || minNum < 0 || !Number.isFinite(minNum) || !Number.isInteger(minNum)) {
        return { isValid: false, error: "Minimum price must be a valid whole number" };
      }
      if (minNum > MAX_PRICE) {
        return { isValid: false, error: "Minimum price exceeds maximum allowed value" };
      }
    }

    if (trimmedMax !== "") {
      maxNum = Number(trimmedMax);
      if (isNaN(maxNum) || maxNum < 0 || !Number.isFinite(maxNum) || !Number.isInteger(maxNum)) {
        return { isValid: false, error: "Maximum price must be a valid whole number" };
      }
      if (maxNum > MAX_PRICE) {
        return { isValid: false, error: "Maximum price exceeds maximum allowed value" };
      }
    }

    if (minNum !== undefined && maxNum !== undefined && minNum > maxNum) {
      return { isValid: false, error: "Minimum price cannot be greater than maximum price" };
    }

    return { isValid: true, error: null, minStr: trimmedMin, maxStr: trimmedMax };
  };

  // Helper to execute instant navigation on desktop merging state directly from current local component state
  const triggerDesktopNavigation = (
    overrides?: {
      q?: string;
      category?: string;
      city?: string;
      locality?: string;
      condition?: string;
      price_min?: string;
      price_max?: string;
      sort?: SearchSortOption;
      isExplicitSort?: boolean;
    }
  ) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentQ = overrides?.q !== undefined ? overrides.q : query;
    const currentCat = overrides?.category !== undefined ? overrides.category : category;
    const currentCty = overrides?.city !== undefined ? overrides.city : city;
    const currentLoc = overrides?.locality !== undefined ? overrides.locality : locality;
    const currentCond = overrides?.condition !== undefined ? overrides.condition : condition;
    const currentPMin = overrides?.price_min !== undefined ? overrides.price_min : priceMin;
    const currentPMax = overrides?.price_max !== undefined ? overrides.price_max : priceMax;
    const currentSrt = overrides?.sort !== undefined ? overrides.sort : sort;
    const currentExplicit = overrides?.isExplicitSort !== undefined ? overrides.isExplicitSort : isExplicitSort;

    const params = new URLSearchParams();

    // Keyword
    if (currentQ.trim()) params.set("q", currentQ.trim());

    // Category
    if (currentCat) params.set("category", currentCat);

    // City & Locality
    if (currentCty) params.set("city", currentCty);
    if (currentCty && currentLoc) params.set("locality", currentLoc);

    // Condition
    if (currentCond) params.set("condition", currentCond);

    // Prices
    if (currentPMin) params.set("price_min", currentPMin);
    if (currentPMax) params.set("price_max", currentPMax);

    // Sort
    const hasQ = Boolean(currentQ.trim());
    const effectiveSrt = getEffectiveSort(currentQ, currentSrt);

    if (currentExplicit) {
      if (effectiveSrt !== "newest" || hasQ) {
        params.set("sort", effectiveSrt);
      }
    } else if (effectiveSrt !== (hasQ ? "relevance" : "newest")) {
      if (effectiveSrt !== "newest") {
        params.set("sort", effectiveSrt);
      }
    }

    params.set("page", "1");

    const queryStr = params.toString();
    const targetUrl = queryStr ? `/search?${queryStr}` : "/search";

    startTransition(() => {
      router.push(targetUrl);
    });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    const hasKeyword = newQuery.trim().length > 0;

    let updatedSort = sort;
    let updatedExplicit = isExplicitSort;

    if (!isExplicitSort) {
      updatedSort = hasKeyword ? "relevance" : "newest";
      setSort(updatedSort);
    } else if (!hasKeyword && sort === "relevance") {
      updatedSort = "newest";
      updatedExplicit = false;
      setSort("newest");
      setIsExplicitSort(false);
    }

    if (!mobileFiltersOpen) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        triggerDesktopNavigation({
          q: newQuery,
          sort: updatedSort,
          isExplicitSort: updatedExplicit,
        });
      }, 500);
    }
  };

  const handleSortChange = (newSort: string) => {
    const validSort = newSort as SearchSortOption;
    setSort(validSort);

    const hasKeyword = query.trim().length > 0;
    const isImplicitDefault = hasKeyword ? validSort === "relevance" : validSort === "newest";
    const newExplicit = !isImplicitDefault;

    setIsExplicitSort(newExplicit);

    if (!mobileFiltersOpen) {
      triggerDesktopNavigation({
        sort: validSort,
        isExplicitSort: newExplicit,
      });
    }
  };

  // DESKTOP PRICE RANGE BLUR / ENTER APPLY
  const handlePriceBlurOrEnterDesktop = () => {
    if (mobileFiltersOpen) return;

    const validation = validatePriceInputs(priceMin, priceMax);
    if (!validation.isValid) {
      setPriceError(validation.error);
      return;
    }

    setPriceError(null);

    const { minStr = "", maxStr = "" } = validation;
    const currentMinStr = initialFilters.price_min?.toString() || "";
    const currentMaxStr = initialFilters.price_max?.toString() || "";

    if (minStr === currentMinStr && maxStr === currentMaxStr) return;

    triggerDesktopNavigation({
      price_min: minStr,
      price_max: maxStr,
    });
  };

  // MOBILE DRAWER BATCH SUBMIT
  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePriceInputs(priceMin, priceMax);
    if (!validation.isValid) {
      setPriceError(validation.error);
      return;
    }

    setPriceError(null);

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (locality) params.set("locality", locality);
    if (condition) params.set("condition", condition);

    if (validation.minStr) params.set("price_min", validation.minStr);
    if (validation.maxStr) params.set("price_max", validation.maxStr);

    const effectiveSrt = getEffectiveSort(query, sort);
    const hasQ = Boolean(query.trim());

    if (isExplicitSort) {
      if (effectiveSrt !== "newest" || hasQ) {
        params.set("sort", effectiveSrt);
      }
    } else if (effectiveSrt !== (hasQ ? "relevance" : "newest")) {
      if (effectiveSrt !== "newest") {
        params.set("sort", effectiveSrt);
      }
    }

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
    setIsExplicitSort(false);
    setPriceError(null);

    startTransition(() => {
      router.push("/search");
      setMobileFiltersOpen(false);
    });
  };

  const handleMobileClose = () => {
    const newHasKeyword = Boolean(initialFilters.q && initialFilters.q.trim().length > 0);
    const newEffectiveSort = getEffectiveSort(initialFilters.q, initialFilters.sort);
    const newIsExplicit =
      initialFilters.sort !== undefined &&
      initialFilters.sort !== "" &&
      !(initialFilters.sort === "relevance" && !newHasKeyword);

    setQuery(initialFilters.q || "");
    setCategory(initialFilters.category || "");
    setCity(initialFilters.city || "");
    setLocality(initialFilters.locality || "");
    setCondition(initialFilters.condition || "");
    setPriceMin(initialFilters.price_min?.toString() || "");
    setPriceMax(initialFilters.price_max?.toString() || "");
    setSort(newEffectiveSort);
    setIsExplicitSort(newIsExplicit);
    setPriceError(null);

    setMobileFiltersOpen(false);
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

  // Form Fields Component for sidebar/drawer rendering
  const renderFormContent = (idSuffix: string) => {
    const formPrefix = `${baseId}-${idSuffix}`;

    return (
      <form onSubmit={handleMobileSubmit} className="space-y-5" aria-label="Listing filters">
        {/* Search Query Input */}
        <div>
          <label htmlFor={`${formPrefix}-search-q`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Keywords
          </label>
          <div className="relative mt-1">
            <input
              id={`${formPrefix}-search-q`}
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!mobileFiltersOpen) {
                    triggerDesktopNavigation({ q: query });
                  }
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
          <label htmlFor={`${formPrefix}-filter-category`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Category
          </label>
          <select
            id={`${formPrefix}-filter-category`}
            value={category}
            onChange={(e) => {
              const val = e.target.value;
              setCategory(val);
              if (!mobileFiltersOpen) {
                triggerDesktopNavigation({ category: val });
              }
            }}
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
          <label htmlFor={`${formPrefix}-filter-city`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            District
          </label>
          <select
            id={`${formPrefix}-filter-city`}
            value={city}
            onChange={(e) => {
              const val = e.target.value;
              setCity(val);
              setLocality(""); // Clear locality when district changes
              if (!mobileFiltersOpen) {
                triggerDesktopNavigation({ city: val, locality: "" });
              }
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
            <label htmlFor={`${formPrefix}-filter-locality`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Locality / Area
            </label>
            <select
              id={`${formPrefix}-filter-locality`}
              value={locality}
              onChange={(e) => {
                const val = e.target.value;
                setLocality(val);
                if (!mobileFiltersOpen) {
                  triggerDesktopNavigation({ locality: val });
                }
              }}
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
          <label htmlFor={`${formPrefix}-filter-condition`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Condition
          </label>
          <select
            id={`${formPrefix}-filter-condition`}
            value={condition}
            onChange={(e) => {
              const val = e.target.value;
              setCondition(val);
              if (!mobileFiltersOpen) {
                triggerDesktopNavigation({ condition: val });
              }
            }}
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
              id={`${formPrefix}-filter-price-min`}
              type="number"
              min="0"
              max={MAX_PRICE}
              step="1"
              placeholder="Min ₹"
              value={priceMin}
              onChange={(e) => {
                setPriceMin(e.target.value);
                setPriceError(null);
              }}
              onBlur={handlePriceBlurOrEnterDesktop}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!mobileFiltersOpen) {
                    handlePriceBlurOrEnterDesktop();
                  }
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
              aria-label="Minimum price in rupees"
            />
            <input
              id={`${formPrefix}-filter-price-max`}
              type="number"
              min="0"
              max={MAX_PRICE}
              step="1"
              placeholder="Max ₹"
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value);
                setPriceError(null);
              }}
              onBlur={handlePriceBlurOrEnterDesktop}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!mobileFiltersOpen) {
                    handlePriceBlurOrEnterDesktop();
                  }
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
              aria-label="Maximum price in rupees"
            />
          </div>
          {priceError && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{priceError}</span>
            </div>
          )}
        </div>

        {/* Sort Order */}
        <div>
          <label htmlFor={`${formPrefix}-filter-sort`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Sort By
          </label>
          <select
            id={`${formPrefix}-filter-sort`}
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
        {renderFormContent("desktop")}
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
            {renderFormContent("mobile")}
          </div>
        </div>
      )}
    </div>
  );
}
