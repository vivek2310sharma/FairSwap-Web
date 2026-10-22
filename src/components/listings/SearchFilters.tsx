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

  // Uncommitted local draft form state
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

  // Dynamic localities state
  const [fetchedLocalities, setFetchedLocalities] = useState<{ cityId: string; items: Locality[] } | null>(null);

  // Ref for debouncing query changes on desktop
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cancel any debounced timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Synchronize local form state and cancel pending debounces when initialFilters prop changes
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

  // Cancel pending debounce in effect when initialFilters prop changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [initialFilters]);

  // Compute effective dynamic localities
  const dynamicLocalities = (() => {
    if (!city) return localities;
    const matchesProp = localities.filter((loc) => loc.city_id === city);
    if (matchesProp.length > 0) return matchesProp;
    if (fetchedLocalities && fetchedLocalities.cityId === city) return fetchedLocalities.items;
    return [];
  })();

  // Lazy load localities for newly selected district if needed
  useEffect(() => {
    if (!city) return;
    const matchesProp = localities.filter((loc) => loc.city_id === city);
    if (matchesProp.length > 0) return;

    let active = true;
    fetch(`/api/discovery/localities?city_id=${encodeURIComponent(city)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Locality[]) => {
        if (active && Array.isArray(data)) {
          setFetchedLocalities({ cityId: city, items: data });
        }
      })
      .catch(() => {
        if (active) setFetchedLocalities({ cityId: city, items: [] });
      });

    return () => {
      active = false;
    };
  }, [city, localities]);

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

  // DESKTOP INSTANT APPLY FOR SELECT CONTROLS
  // Merges ONLY the newly selected control value into currently APPLIED initialFilters,
  // completely ignoring uncommitted query text and invalid price inputs.
  const triggerDesktopSelectNavigation = (overrides: {
    category?: string;
    city?: string;
    locality?: string;
    condition?: string;
    sort?: SearchSortOption;
    isExplicitSort?: boolean;
  }) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const params = new URLSearchParams();

    // 1. Preserve APPLIED keyword search
    if (initialFilters.q && initialFilters.q.trim()) {
      params.set("q", initialFilters.q.trim());
    }

    // 2. Category
    const cat = "category" in overrides ? overrides.category : initialFilters.category;
    if (cat) params.set("category", cat);

    // 3. City & Locality
    const cty = "city" in overrides ? overrides.city : initialFilters.city;
    if (cty) params.set("city", cty);

    const loc = "locality" in overrides ? overrides.locality : initialFilters.locality;
    if (cty && loc) params.set("locality", loc);

    // 4. Condition
    const cond = "condition" in overrides ? overrides.condition : initialFilters.condition;
    if (cond) params.set("condition", cond);

    // 5. Preserve APPLIED valid price range only
    if (initialFilters.price_min !== undefined) {
      params.set("price_min", initialFilters.price_min.toString());
    }
    if (initialFilters.price_max !== undefined) {
      params.set("price_max", initialFilters.price_max.toString());
    }

    // 6. Sort
    const appliedQ = initialFilters.q || "";
    const hasQ = Boolean(appliedQ.trim());
    const srt = overrides.sort !== undefined ? overrides.sort : sort;
    const explicit = overrides.isExplicitSort !== undefined ? overrides.isExplicitSort : isExplicitSort;
    const effectiveSrt = getEffectiveSort(appliedQ, srt);

    if (explicit) {
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

  // DESKTOP DEBOUNCED / ENTER KEYWORD APPLY
  const applyDesktopQuery = (newQ: string, effectiveSortOverride?: SearchSortOption, explicitSortOverride?: boolean) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const params = new URLSearchParams();

    if (newQ.trim()) params.set("q", newQ.trim());
    if (initialFilters.category) params.set("category", initialFilters.category);
    if (initialFilters.city) params.set("city", initialFilters.city);
    if (initialFilters.locality) params.set("locality", initialFilters.locality);
    if (initialFilters.condition) params.set("condition", initialFilters.condition);
    if (initialFilters.price_min !== undefined) params.set("price_min", initialFilters.price_min.toString());
    if (initialFilters.price_max !== undefined) params.set("price_max", initialFilters.price_max.toString());

    const srt = effectiveSortOverride || sort;
    const explicit = explicitSortOverride !== undefined ? explicitSortOverride : isExplicitSort;
    const effectiveSrt = getEffectiveSort(newQ, srt);
    const hasQ = Boolean(newQ.trim());

    if (explicit) {
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
        applyDesktopQuery(newQuery, updatedSort, updatedExplicit);
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
      triggerDesktopSelectNavigation({
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

    const params = new URLSearchParams();
    if (initialFilters.q) params.set("q", initialFilters.q);
    if (initialFilters.category) params.set("category", initialFilters.category);
    if (initialFilters.city) params.set("city", initialFilters.city);
    if (initialFilters.locality) params.set("locality", initialFilters.locality);
    if (initialFilters.condition) params.set("condition", initialFilters.condition);

    if (minStr) params.set("price_min", minStr);
    if (maxStr) params.set("price_max", maxStr);

    const effectiveSrt = getEffectiveSort(initialFilters.q, sort);
    const hasQ = Boolean(initialFilters.q?.trim());

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
                    applyDesktopQuery(query);
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
                triggerDesktopSelectNavigation({ category: val });
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
                triggerDesktopSelectNavigation({ city: val, locality: "" });
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
        {city && dynamicLocalities.length > 0 && (
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
                  triggerDesktopSelectNavigation({ locality: val });
                }
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            >
              <option value="">All Areas in District</option>
              {dynamicLocalities.map((loc) => (
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
                triggerDesktopSelectNavigation({ condition: val });
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
