"use client";

import { useState, useRef, useEffect, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
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

interface AppliedFilters {
  q?: string;
  category?: string;
  city?: string;
  locality?: string;
  condition?: string;
  price_min?: number;
  price_max?: number;
  sort?: string;
}

const MAX_PRICE = 100000000;
const localityOptionsSchema = z.array(z.object({
  id: z.string(), city_id: z.string(), name: z.string(),
})).max(100);

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

  // Ref tracking authoritative applied filters on desktop to prevent rapid race conditions
  const appliedFiltersRef = useRef<AppliedFilters>(initialFilters);

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
  const [fetchedLocalities, setFetchedLocalities] = useState<{
    cityId: string; items: Pick<Locality, "id" | "city_id" | "name">[]; nextOffset: number | null;
  } | null>(null);
  const [localityRequest, setLocalityRequest] = useState({ offset: 0, attempt: 0 });
  const [localityError, setLocalityError] = useState(false);
  const [settledLocalityRequest, setSettledLocalityRequest] = useState<{
    city: string; request: typeof localityRequest;
  } | null>(null);
  const [previousCity, setPreviousCity] = useState(city);
  if (previousCity !== city) {
    setPreviousCity(city);
    setLocalityRequest({ offset: 0, attempt: 0 });
    setLocalityError(false);
  }

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

  // Synchronize local form state when initialFilters prop changes (including Back/Forward navigation)
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

  // Update appliedFiltersRef and cancel pending debounce when initialFilters prop changes
  useEffect(() => {
    appliedFiltersRef.current = initialFilters;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [initialFilters]);

  // Compute effective dynamic localities and loading status
  const propLocalitiesMatch = city ? localities.filter((loc) => loc.city_id === city) : [];
  const hasPropMatch = propLocalitiesMatch.length > 0;
  const isFetchingLocalities = Boolean(city && (settledLocalityRequest?.city !== city ||
    settledLocalityRequest.request !== localityRequest));

  const dynamicLocalities = (() => {
    if (!city) return localities;
    if (fetchedLocalities && fetchedLocalities.cityId === city) {
      const selected = propLocalitiesMatch.find((item) => item.id === locality);
      return selected && !fetchedLocalities.items.some((item) => item.id === selected.id)
        ? [selected, ...fetchedLocalities.items] : fetchedLocalities.items;
    }
    if (hasPropMatch) return propLocalitiesMatch;
    return [];
  })();

  // Lazy load localities for newly selected district with AbortController for stale request cancellation
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    const offset = localityRequest.offset;
    fetch(`/api/discovery/localities?city_id=${encodeURIComponent(city)}${offset ? `&offset=${offset}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load areas");
        const data = localityOptionsSchema.parse(await res.json());
        const header = res.headers.get("X-Next-Offset");
        const nextOffset = header === null ? null : Number(header);
        if (data.some((item) => item.city_id !== city) ||
            (nextOffset !== null && (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > 1000000))) {
          throw new Error("Invalid areas response");
        }
        if (!controller.signal.aborted) {
          setLocalityError(false);
          setFetchedLocalities((previous) => ({ cityId: city, nextOffset,
            items: offset && previous?.cityId === city ? [...previous.items, ...data] : data,
          }));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLocalityError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettledLocalityRequest({ city, request: localityRequest });
      });

    return () => {
      controller.abort();
    };
  }, [city, localityRequest]);

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
  // Accumulates changes into appliedFiltersRef to prevent rapid consecutive select dropouts before re-render,
  // completely ignoring uncommitted keyword drafts and invalid price inputs.
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

    const currentApplied = appliedFiltersRef.current;
    const newApplied: AppliedFilters = { ...currentApplied };

    if ("category" in overrides) {
      if (overrides.category) newApplied.category = overrides.category;
      else delete newApplied.category;
    }
    if ("city" in overrides) {
      if (overrides.city) newApplied.city = overrides.city;
      else delete newApplied.city;
    }
    if ("locality" in overrides) {
      if (overrides.locality) newApplied.locality = overrides.locality;
      else delete newApplied.locality;
    }
    if ("condition" in overrides) {
      if (overrides.condition) newApplied.condition = overrides.condition;
      else delete newApplied.condition;
    }
    if ("sort" in overrides) {
      if (overrides.sort) newApplied.sort = overrides.sort;
      else delete newApplied.sort;
    }

    appliedFiltersRef.current = newApplied;

    const params = new URLSearchParams();

    // 1. Preserve APPLIED keyword search
    if (newApplied.q && newApplied.q.trim()) {
      params.set("q", newApplied.q.trim());
    }

    // 2. Category
    if (newApplied.category) params.set("category", newApplied.category);

    // 3. City & Locality
    if (newApplied.city) params.set("city", newApplied.city);
    if (newApplied.city && newApplied.locality) params.set("locality", newApplied.locality);

    // 4. Condition
    if (newApplied.condition) params.set("condition", newApplied.condition);

    // 5. Preserve APPLIED valid price range only
    if (newApplied.price_min !== undefined) {
      params.set("price_min", newApplied.price_min.toString());
    }
    if (newApplied.price_max !== undefined) {
      params.set("price_max", newApplied.price_max.toString());
    }

    // 6. Sort
    const appliedQ = newApplied.q || "";
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

    const trimmedQ = newQ.trim();
    const currentApplied = appliedFiltersRef.current;
    const newApplied: AppliedFilters = {
      ...currentApplied,
      q: trimmedQ || undefined,
    };
    if (!trimmedQ) delete newApplied.q;

    appliedFiltersRef.current = newApplied;

    const params = new URLSearchParams();

    if (trimmedQ) params.set("q", trimmedQ);
    if (newApplied.category) params.set("category", newApplied.category);
    if (newApplied.city) params.set("city", newApplied.city);
    if (newApplied.city && newApplied.locality) params.set("locality", newApplied.locality);
    if (newApplied.condition) params.set("condition", newApplied.condition);
    if (newApplied.price_min !== undefined) params.set("price_min", newApplied.price_min.toString());
    if (newApplied.price_max !== undefined) params.set("price_max", newApplied.price_max.toString());

    const srt = effectiveSortOverride || sort;
    const explicit = explicitSortOverride !== undefined ? explicitSortOverride : isExplicitSort;
    const effectiveSrt = getEffectiveSort(trimmedQ, srt);
    const hasQ = Boolean(trimmedQ);

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
    const currentApplied = appliedFiltersRef.current;
    const currentMinStr = currentApplied.price_min?.toString() || "";
    const currentMaxStr = currentApplied.price_max?.toString() || "";

    if (minStr === currentMinStr && maxStr === currentMaxStr) return;

    const newApplied: AppliedFilters = {
      ...currentApplied,
      price_min: minStr ? Number(minStr) : undefined,
      price_max: maxStr ? Number(maxStr) : undefined,
    };
    if (!minStr) delete newApplied.price_min;
    if (!maxStr) delete newApplied.price_max;

    appliedFiltersRef.current = newApplied;

    const params = new URLSearchParams();
    if (newApplied.q && newApplied.q.trim()) params.set("q", newApplied.q.trim());
    if (newApplied.category) params.set("category", newApplied.category);
    if (newApplied.city) params.set("city", newApplied.city);
    if (newApplied.city && newApplied.locality) params.set("locality", newApplied.locality);
    if (newApplied.condition) params.set("condition", newApplied.condition);

    if (minStr) params.set("price_min", minStr);
    if (maxStr) params.set("price_max", maxStr);

    const appliedQ = newApplied.q || "";
    const effectiveSrt = getEffectiveSort(appliedQ, sort);
    const hasQ = Boolean(appliedQ.trim());

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
    appliedFiltersRef.current = {};
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
    const isDesktop = idSuffix === "desktop";

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isDesktop) {
            applyDesktopQuery(query);
          } else {
            handleMobileSubmit(e);
          }
        }}
        className="space-y-5"
        aria-label="Listing filters"
      >
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
              type={isDesktop ? "button" : "submit"}
              onClick={isDesktop ? () => applyDesktopQuery(query) : undefined}
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
        {city && (
          <div>
            <label htmlFor={`${formPrefix}-filter-locality`} className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Locality / Area
            </label>
            <select
              id={`${formPrefix}-filter-locality`}
              value={locality}
              disabled={isFetchingLocalities}
              onChange={(e) => {
                const val = e.target.value;
                setLocality(val);
                if (!mobileFiltersOpen) {
                  triggerDesktopSelectNavigation({ locality: val });
                }
              }}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-action-500 disabled:opacity-50"
            >
              <option value="">
                {isFetchingLocalities ? "Loading areas..." : "All Areas in District"}
              </option>
              {dynamicLocalities.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {localityError && !isFetchingLocalities ? (
              <div role="alert" className="mt-2 text-sm">
                Unable to load areas. Please try again.
                <button type="button" className="ml-2 underline"
                  onClick={() => setLocalityRequest((value) => ({ ...value, attempt: value.attempt + 1 }))}>
                  Retry areas
                </button>
              </div>
            ) : !isFetchingLocalities && fetchedLocalities?.cityId === city && dynamicLocalities.length === 0 ? (
              <p role="status" className="mt-2 text-sm text-muted">No areas available in this district.</p>
            ) : null}
            {!localityError && fetchedLocalities?.cityId === city && fetchedLocalities.nextOffset !== null && (
              <button type="button" disabled={isFetchingLocalities} className="mt-2 text-sm underline"
                onClick={() => setLocalityRequest({ offset: fetchedLocalities.nextOffset!, attempt: 0 })}>
                {isFetchingLocalities ? "Loading areas..." : "Load more areas"}
              </button>
            )}
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
