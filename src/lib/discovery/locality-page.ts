import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Locality } from "@/types/listing";

export const localityOptionSchema = z.object({
  id: z.string(),
  city_id: z.string(),
  name: z.string(),
});

export const LOCALITY_PAGE_SIZE = 100;

// Hydrate only the applied chip/option, including an area beyond the first page.
export async function getAppliedLocality(cityId: string, localityId: string): Promise<Locality[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("localities")
    .select("id, city_id, name, slug, is_active, created_at")
    .eq("is_active", true).eq("city_id", cityId).eq("id", localityId).limit(1);
  const parsed = z.array(localityOptionSchema.extend({
    slug: z.string(), is_active: z.boolean(), created_at: z.string(),
  })).max(1).safeParse(data);
  // Chip enrichment is optional; the interactive API displays retryable failures.
  return !error && parsed.success ? parsed.data : [];
}

// A separate search-only query preserves the contract of shared discovery callers.
// Use the request-scoped client: RLS remains authoritative.
export async function getLocalityPage(cityId: string, offset: number, signal?: AbortSignal) {
  const supabase = await createClient();
  const query = supabase.from("localities")
    .select("id, city_id, name", { count: "exact" })
    .eq("is_active", true)
    .eq("city_id", cityId)
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + LOCALITY_PAGE_SIZE - 1);
  const { data, error, count } = await (signal ? query.abortSignal(signal) : query);
  const parsed = z.array(localityOptionSchema).max(LOCALITY_PAGE_SIZE).safeParse(data);
  if (error || !parsed.success || count === null ||
      parsed.data.some((item) => item.city_id !== cityId) ||
      (parsed.data.length === 0 && offset < count)) {
    throw new Error("Unable to load areas");
  }
  // Advance by actual rows, even when PostgREST's configured cap is below 100.
  const nextOffset = offset + parsed.data.length;
  return { items: parsed.data, nextOffset: nextOffset < count ? nextOffset : null };
}
