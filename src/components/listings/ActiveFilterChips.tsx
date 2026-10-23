"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Category, City, Locality, getEffectiveSort } from "@/types/listing";

interface ActiveFilterChipsProps {
  filters: {
    q?: string;
    category?: string;
    city?: string;
    locality?: string;
    condition?: string;
    price_min?: number;
    price_max?: number;
    sort?: string;
  };
  categories: Category[];
  cities: City[];
  localities: Locality[];
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Brand New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "For Parts / Poor",
};

const SORT_LABELS: Record<string, string> = {
  relevance: "Most Relevant",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  newest: "Newest First",
};

export function ActiveFilterChips({
  filters,
  categories,
  cities,
  localities,
}: ActiveFilterChipsProps) {
  const chips: Array<{ id: string; label: string; removeUrl: string }> = [];

  const hasKeyword = Boolean(filters.q && filters.q.trim().length > 0);
  const isExplicitSort =
    filters.sort !== undefined &&
    filters.sort !== "" &&
    !(filters.sort === "relevance" && !hasKeyword);

  // Helper to build URL excluding specific keys and resetting page to 1
  const buildFilterUrl = (omitKeys: string[]) => {
    const params = new URLSearchParams();

    if (!omitKeys.includes("q") && filters.q) {
      params.set("q", filters.q);
    }
    if (!omitKeys.includes("category") && filters.category) {
      params.set("category", filters.category);
    }
    if (!omitKeys.includes("city") && filters.city) {
      params.set("city", filters.city);
    }
    if (
      !omitKeys.includes("locality") &&
      !omitKeys.includes("city") &&
      filters.locality
    ) {
      params.set("locality", filters.locality);
    }
    if (!omitKeys.includes("condition") && filters.condition) {
      params.set("condition", filters.condition);
    }
    if (!omitKeys.includes("price_min") && filters.price_min !== undefined) {
      params.set("price_min", filters.price_min.toString());
    }
    if (!omitKeys.includes("price_max") && filters.price_max !== undefined) {
      params.set("price_max", filters.price_max.toString());
    }
    if (!omitKeys.includes("sort")) {
      const currentKeyword = omitKeys.includes("q") ? "" : filters.q || "";
      const effectiveSrt = getEffectiveSort(currentKeyword, filters.sort);
      const defaultSrt = currentKeyword ? "relevance" : "newest";

      if (isExplicitSort || effectiveSrt !== defaultSrt) {
        if (effectiveSrt !== "newest") {
          params.set("sort", effectiveSrt);
        } else if (isExplicitSort && currentKeyword) {
          // Explicit newest with keyword
          params.set("sort", "newest");
        }
      }
    }

    params.set("page", "1");

    const queryStr = params.toString();
    return queryStr ? `/search?${queryStr}` : "/search";
  };

  // Keyword chip
  if (filters.q && filters.q.trim()) {
    chips.push({
      id: "q",
      label: `Keyword: "${filters.q.trim()}"`,
      removeUrl: buildFilterUrl(["q"]),
    });
  }

  // Category chip
  if (filters.category) {
    const catObj = categories.find((c) => c.slug === filters.category);
    const catLabel = catObj ? catObj.name : filters.category;
    chips.push({
      id: "category",
      label: `Category: ${catLabel}`,
      removeUrl: buildFilterUrl(["category"]),
    });
  }

  // District / City chip
  if (filters.city) {
    const cityObj = cities.find((c) => c.id === filters.city);
    const cityLabel = cityObj ? `${cityObj.name}, ${cityObj.state}` : filters.city;
    chips.push({
      id: "city",
      label: `District: ${cityLabel}`,
      removeUrl: buildFilterUrl(["city"]),
    });
  }

  // Locality chip
  if (filters.locality && filters.city) {
    const locObj = localities.find((l) => l.id === filters.locality);
    const locLabel = locObj ? locObj.name : filters.locality;
    chips.push({
      id: "locality",
      label: `Area: ${locLabel}`,
      removeUrl: buildFilterUrl(["locality"]),
    });
  }

  // Condition chip
  if (filters.condition) {
    const condLabel = CONDITION_LABELS[filters.condition] || filters.condition;
    chips.push({
      id: "condition",
      label: `Condition: ${condLabel}`,
      removeUrl: buildFilterUrl(["condition"]),
    });
  }

  // Price Min / Max chips
  if (filters.price_min !== undefined && filters.price_max !== undefined) {
    chips.push({
      id: "price_range",
      label: `Price: ₹${filters.price_min.toLocaleString("en-IN")} - ₹${filters.price_max.toLocaleString("en-IN")}`,
      removeUrl: buildFilterUrl(["price_min", "price_max"]),
    });
  } else if (filters.price_min !== undefined) {
    chips.push({
      id: "price_min",
      label: `Min ₹${filters.price_min.toLocaleString("en-IN")}`,
      removeUrl: buildFilterUrl(["price_min"]),
    });
  } else if (filters.price_max !== undefined) {
    chips.push({
      id: "price_max",
      label: `Max ₹${filters.price_max.toLocaleString("en-IN")}`,
      removeUrl: buildFilterUrl(["price_max"]),
    });
  }

  // Explicit non-default sort chip OR explicit newest with keyword
  const effectiveSrt = getEffectiveSort(filters.q, filters.sort);
  const defaultSrt = hasKeyword ? "relevance" : "newest";

  if (isExplicitSort && (effectiveSrt !== defaultSrt || (hasKeyword && filters.sort === "newest"))) {
    const sortLabel = SORT_LABELS[filters.sort || effectiveSrt] || filters.sort || effectiveSrt;
    chips.push({
      id: "sort",
      label: `Sort: ${sortLabel}`,
      removeUrl: buildFilterUrl(["sort"]),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">
        Active Filters:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-xs"
        >
          {chip.label}
          <Link
            href={chip.removeUrl}
            className="rounded-full p-0.5 text-muted hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-700"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Link>
        </span>
      ))}

      <Link
        href="/search"
        className="text-xs font-semibold text-brand-link hover:underline ml-1"
      >
        Clear All
      </Link>
    </div>
  );
}
