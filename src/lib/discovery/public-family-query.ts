import { createServiceRoleClient } from "@/lib/supabase/service";
import type { PublicListingCard } from "@/types/listing";
import {
  publicFamilyForSlug, makePublicPropertyDisplay, makePublicVehicleDisplay,
  type PublicFamilyDisplay,
} from "./family-display";

type PublicInput = Pick<PublicListingCard, "id" | "category" | "category_attributes" | "price_type" | "price_paise">;
type ContextRow = {
  listing_id: string; category_id: string; mode?: string;
  brand_text?: string | null; model_text?: string | null;
  financial?: unknown;
};

/**
 * Only call with IDs already validated as publicly visible by the discovery
 * RPC or the listing detail visibility guard. Never use this for owner drafts.
 * No private society, registration, seller contact or raw context escapes.
 */
export async function loadPublicFamilyDisplays(
  listings: PublicInput[],
): Promise<Map<string, PublicFamilyDisplay>> {
  const results = new Map<string, PublicFamilyDisplay>();
  const families = { "two-wheelers": [] as PublicInput[], cars: [] as PublicInput[], property: [] as PublicInput[] };
  for (const listing of listings) {
    const family = publicFamilyForSlug(listing.category?.slug);
    if (family) families[family].push(listing);
  }
  if (Object.values(families).every(rows => rows.length === 0)) return results;
  const client = createServiceRoleClient();
  const tables = {
    "two-wheelers": "listing_vehicle_contexts",
    cars: "listing_car_contexts",
    property: "listing_property_contexts",
  } as const;

  await Promise.all((Object.keys(tables) as Array<keyof typeof tables>).map(async family => {
    const items = families[family];
    if (!items.length) return;
    const columns = family === "property"
      ? "listing_id,category_id,financial"
      : "listing_id,category_id,mode,brand_text,model_text,brand_id,model_id";
    const response = await client.from(tables[family]).select(columns).in("listing_id", items.map(row => row.id));
    if (response.error || !response.data) return;
    const contexts = new Map<string, Record<string, unknown>>();
    for (const context of response.data as unknown as Record<string, unknown>[]) {
      if (typeof context.listing_id === "string") contexts.set(context.listing_id, context);
    }
    for (const item of items) {
      const ctx = contexts.get(item.id) as ContextRow | undefined;
      if (!ctx || ctx.category_id !== item.category.id) continue;
      if (family === "property") {
        const view = makePublicPropertyDisplay(item.category.slug, item.category_attributes, ctx.financial);
        if (view) results.set(item.id, view);
      } else {
        const view = makePublicVehicleDisplay(
          family, item.category.slug, item.category_attributes,
          item.price_type, item.price_paise,
          {
            mode: ctx.mode ?? "",
            brandText: ctx.brand_text ?? null,
            modelText: ctx.model_text ?? null,
          },
        );
        if (view) results.set(item.id, view);
      }
    }
  }));
  return results;
}
