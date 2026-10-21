import type { z } from "zod";
import { searchFiltersSchema, getEffectiveSort } from "@/types/listing";

export type ValidatedSearchFilters = z.output<typeof searchFiltersSchema>;

const SEARCH_KEYS = [
  "q",
  "category",
  "city",
  "locality",
  "condition",
  "price_min",
  "price_max",
  "sort",
  "page",
] as const;

type SearchKey = (typeof SEARCH_KEYS)[number];

const MAX_CONTEXT_LENGTH = 2000;
const SEARCH_FALLBACK = "/search";

/** A canonical, bounded query string derived only from validated filters. */
export function serializeSearchFilters(filters: ValidatedSearchFilters): string {
  const params = new URLSearchParams();
  const effectiveSort = getEffectiveSort(filters.q, filters.sort);

  for (const key of SEARCH_KEYS) {
    let value: unknown;
    if (key === "sort") {
      value = filters.sort !== undefined ? filters.sort : effectiveSort;
    } else {
      value = filters[key];
    }

    // 0 is a valid price. Never stringify absent values as "undefined".
    if (value === undefined || value === "") continue;

    params.set(key, String(value));
  }

  const query = params.toString();
  return query.length < MAX_CONTEXT_LENGTH ? query : "";
}

/** ctx is the inner query-string value already unwrapped by Next.js. */
export function getBackToSearchHref(ctxParam: unknown): string {
  if (
    typeof ctxParam !== "string" ||
    ctxParam.length === 0 ||
    ctxParam.length >= MAX_CONTEXT_LENGTH ||
    /%(?![0-9a-fA-F]{2})/.test(ctxParam)
  ) {
    return SEARCH_FALLBACK;
  }

  const params = new URLSearchParams(ctxParam);
  const values: Partial<Record<SearchKey, string>> = {};

  for (const key of SEARCH_KEYS) {
    const entries = params.getAll(key);

    // Fail closed on duplicate recognized keys instead of picking one.
    if (entries.length > 1) return SEARCH_FALLBACK;

    const value = entries[0];
    if (value !== undefined && value !== "") values[key] = value;
  }

  // Unknown keys are ignored, not converted to a default search context.
  if (Object.keys(values).length === 0) return SEARCH_FALLBACK;

  const parsed = searchFiltersSchema.safeParse(values);
  if (!parsed.success) return SEARCH_FALLBACK;

  const query = serializeSearchFilters(parsed.data);
  return query ? SEARCH_FALLBACK + "?" + query : SEARCH_FALLBACK;
}
