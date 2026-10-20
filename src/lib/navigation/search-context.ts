import { SearchFilters } from "@/types/listing";

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
    const searchParams = new URLSearchParams(ctxParam);

    // Safely rebuild to avoid weird duplicate parameters
    const safeParams = new URLSearchParams();

    // Whitelist allowed keys to prevent injection
    const allowedKeys = ['q', 'category', 'city', 'locality', 'condition', 'sort', 'page', 'price_min', 'price_max'];

    for (const [key, value] of searchParams.entries()) {
      if (allowedKeys.includes(key)) {
        safeParams.set(key, value);
      }
    }

    const queryString = safeParams.toString();
    return queryString ? `/search?${queryString}` : "/search";
  } catch (e) {
    return "/search";
  }
}
