import { z } from "zod";
import { searchFiltersSchema, type SearchFilters } from "@/types/listing";
import { serializeSearchFilters } from "@/lib/navigation/search-context";

export const publicAreaSchema = z.object({
  city: z.string().uuid(),
  locality: z.string().uuid().optional(),
  label: z.string().min(1).max(300),
});
export type PublicArea = z.infer<typeof publicAreaSchema>;
export const areaResponseSchema = z.object({
  items: z.array(publicAreaSchema).max(24),
  message: z.string().max(300).optional(),
});
export const LOCATION_PREFERENCE_KEY = "fairswap.public-area.v1";
export const locationPreferenceSchema = z.object({
  city: z.string().uuid(), locality: z.string().uuid().optional(),
  expires: z.number().finite(),
});

/** Homepage URL for a public area; `null` (All India) is the bare `/`, which drops both URL parameters. */
export function homeAreaHref(area: PublicArea | null) {
  if (!area) return "/";
  const params = new URLSearchParams({ city: area.city });
  if (area.locality) params.set("locality", area.locality);
  return `/?${params}`;
}

/** Changed discovery filters always start at the first page. */
export function discoveryHref(filters: Partial<SearchFilters>, area?: PublicArea | null) {
  const values = { ...filters, q: filters.q?.trim(), page: undefined };
  if (area !== undefined) {
    values.city = area?.city || "";
    values.locality = area?.locality || "";
  }
  const parsed = searchFiltersSchema.safeParse(values);
  if (!parsed.success) return "/search";
  const params = new URLSearchParams(serializeSearchFilters(parsed.data));
  params.delete("page");
  return params.size ? `/search?${params}` : "/search";
}
