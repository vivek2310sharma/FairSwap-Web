import { SearchFilters, searchFiltersSchema } from "@/types/listing";

export function serializeSearchFilters(filters: SearchFilters): string {
  // Convert the numeric/optional fields to strings explicitly to avoid Record<string, string> cast errors
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.locality) params.set("locality", filters.locality);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.sort) params.set("sort", filters.sort);

  // Convert numbers to strings
  if (filters.page !== undefined && filters.page !== null) params.set("page", filters.page.toString());
  if (filters.price_min !== undefined && filters.price_min !== null) params.set("price_min", filters.price_min.toString());
  if (filters.price_max !== undefined && filters.price_max !== null) params.set("price_max", filters.price_max.toString());

  return params.toString();
}

export function getBackToSearchHref(ctxParam?: string): string {
  if (!ctxParam) return "/search";
  if (ctxParam.length > 2000) return "/search";

  try {
    const rawParams = new URLSearchParams(ctxParam);
    const flatParams: Record<string, string> = {};

    // Deduplicate keys by taking only the first one
    for (const [key, value] of rawParams.entries()) {
      if (!(key in flatParams) && value !== undefined && value !== "undefined") {
        flatParams[key] = value;
      }
    }

    // Validate with Zod
    const parsed = searchFiltersSchema.safeParse(flatParams);
    if (!parsed.success) {
      return "/search";
    }

    const validParams = new URLSearchParams();
    const data = parsed.data;

    if (data.q) validParams.set("q", data.q);
    if (data.category) validParams.set("category", data.category);
    if (data.city) validParams.set("city", data.city);
    if (data.locality) validParams.set("locality", data.locality);
    if (data.condition) validParams.set("condition", data.condition);
    if (data.sort) validParams.set("sort", data.sort);
    if (data.page !== undefined && data.page !== null) validParams.set("page", data.page.toString());
    if (data.price_min !== undefined && data.price_min !== null) validParams.set("price_min", data.price_min.toString());
    if (data.price_max !== undefined && data.price_max !== null) validParams.set("price_max", data.price_max.toString());

    const queryString = validParams.toString();
    return queryString ? `/search?${queryString}` : "/search";
  } catch (e) {
    return "/search";
  }
}
