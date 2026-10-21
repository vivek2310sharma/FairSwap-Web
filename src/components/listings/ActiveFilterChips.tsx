"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Category, City, Locality } from "@/types/listing";

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
    page?: number;
  };
  categories: Category[];
  cities: City[];
  localities: Locality[];
}

interface ChipItem {
  id: string;
  key: string;
  label: string;
}

export function ActiveFilterChips({
  filters,
  categories,
  cities,
  localities,
}: ActiveFilterChipsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const chips: ChipItem[] = [];

  // 1. Keyword Search
  if (filters.q && filters.q.trim()) {
    chips.push({
      id: "q",
      key: "q",
      label: `Keyword: "${filters.q.trim()}"`,
    });
  }

  // 2. Category
  if (filters.category) {
    const catObj = categories.find((c) => c.slug === filters.category);
    chips.push({
      id: "category",
      key: "category",
      label: catObj ? catObj.name : filters.category,
    });
  }

  // 3. District / City
  if (filters.city) {
    const cityObj = cities.find((c) => c.id === filters.city);
    chips.push({
      id: "city",
      key: "city",
      label: cityObj ? cityObj.name : filters.city,
    });
  }

  // 4. Locality
  if (filters.locality) {
    const locObj = localities.find((l) => l.id === filters.locality);
    chips.push({
      id: "locality",
      key: "locality",
      label: locObj ? locObj.name : filters.locality,
    });
  }

  // 5. Condition
  if (filters.condition) {
    const conditionLabels: Record<string, string> = {
      new: "Brand New",
      like_new: "Like New",
      good: "Good",
      fair: "Fair",
      poor: "For Parts / Poor",
    };
    chips.push({
      id: "condition",
      key: "condition",
      label: conditionLabels[filters.condition] || filters.condition,
    });
  }

  // 6. Min Price
  if (filters.price_min !== undefined && filters.price_min !== null) {
    chips.push({
      id: "price_min",
      key: "price_min",
      label: `Min ₹${filters.price_min.toLocaleString("en-IN")}`,
    });
  }

  // 7. Max Price
  if (filters.price_max !== undefined && filters.price_max !== null) {
    chips.push({
      id: "price_max",
      key: "price_max",
      label: `Max ₹${filters.price_max.toLocaleString("en-IN")}`,
    });
  }

  // 8. Sort (non-default)
  if (filters.sort && filters.sort !== "newest") {
    const sortLabels: Record<string, string> = {
      price_asc: "Price: Low to High",
      price_desc: "Price: High to Low",
      relevance: "Most Relevant",
    };
    chips.push({
      id: "sort",
      key: "sort",
      label: sortLabels[filters.sort] || filters.sort,
    });
  }

  if (chips.length === 0) {
    return null;
  }

  const handleRemoveFilter = (keyToRemove: string) => {
    const params = new URLSearchParams();

    if (filters.q && keyToRemove !== "q") params.set("q", filters.q);
    if (filters.category && keyToRemove !== "category") params.set("category", filters.category);

    // If removing city, dependent locality is also removed
    if (keyToRemove === "city") {
      // skip city & locality
    } else {
      if (filters.city && keyToRemove !== "city") params.set("city", filters.city);
      if (filters.locality && keyToRemove !== "locality") params.set("locality", filters.locality);
    }

    if (filters.condition && keyToRemove !== "condition") params.set("condition", filters.condition);
    if (filters.price_min !== undefined && keyToRemove !== "price_min")
      params.set("price_min", filters.price_min.toString());
    if (filters.price_max !== undefined && keyToRemove !== "price_max")
      params.set("price_max", filters.price_max.toString());
    if (filters.sort && filters.sort !== "newest" && keyToRemove !== "sort")
      params.set("sort", filters.sort);

    // Always reset to page 1
    params.set("page", "1");

    const queryStr = params.toString();
    const targetUrl = queryStr ? `/search?${queryStr}` : "/search";

    startTransition(() => {
      router.push(targetUrl);
    });
  };

  const handleClearAll = () => {
    startTransition(() => {
      router.push("/search");
    });
  };

  return (
    <div
      aria-label="Active filters"
      className={`mb-6 flex flex-wrap items-center gap-2 text-xs transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <span className="font-semibold text-muted uppercase tracking-wider mr-1">
        Active Filters:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground shadow-2xs hover:bg-surface transition-colors"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => handleRemoveFilter(chip.key)}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-full p-0.5 text-muted hover:bg-neutral-200 hover:text-foreground dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-action-500"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={handleClearAll}
        className="ml-1 text-xs font-semibold text-action-600 hover:text-action-700 hover:underline dark:text-action-400 focus:outline-none focus:ring-2 focus:ring-action-500 rounded px-1.5 py-0.5"
      >
        Clear All
      </button>
    </div>
  );
}
