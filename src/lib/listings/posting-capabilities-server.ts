import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const binding = z.object({ category_id: z.string().uuid(), enabled: z.literal(true) });

/** Small independently owned release bindings; no brand/model catalogue fanout. */
export async function loadSpecialistBindings(client: SupabaseClient, env: Readonly<Record<string, string | undefined>> = process.env) {
  const phone = env.POST_AD_MOBILES_V2_ENABLED === "true";
  const families = [
    { flow: "specialist:phone", enabled: phone, table: "posting_category_definitions", column: "listing_category_id" },
    { flow: "specialist:tablet", enabled: phone && env.POST_AD_TABLETS_V1_ENABLED === "true", table: "tablet_release_v1", column: "category_id" },
    { flow: "specialist:wearable", enabled: env.POST_AD_WEARABLES_V1_ENABLED === "true", table: "wearable_release_v1", column: "category_id" },
  ];
  const results = await Promise.all(families.map(async family => {
    if (!family.enabled) return null;
    try {
      let query = client.from(family.table).select(`${family.column},enabled`).eq("enabled", true);
      if (family.flow === "specialist:phone") query = query.eq("category_key", "mobiles").eq("subcategory_key", "mobile-phones").eq("version", 2);
      const result = await query.maybeSingle();
      if (result.error || !result.data) return null;
      const row = result.data as unknown as Record<string, unknown>;
      const parsed = binding.safeParse({ category_id: row[family.column], enabled: row.enabled });
      return parsed.success ? [family.flow, parsed.data.category_id] as const : null;
    } catch { return null; }
  }));
  return Object.fromEntries(results.filter((result): result is readonly [string, string] => result !== null));
}
