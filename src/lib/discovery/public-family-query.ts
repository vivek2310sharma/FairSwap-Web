import {createClient} from "@/lib/supabase/server";
import {tabletDetailsSchema,tabletFacts} from "@/lib/listings/tablets/public";
import { wearableCardFacts, wearableDetailsSchema } from "@/lib/listings/wearables/public";
import { DEVICE_TYPES } from "@/lib/listings/wearables/contract";
import {accessoryDetailsSchema,accessoryFacts} from "@/lib/listings/accessories/public";
import {publicPriceFallback} from "./family-display";
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
  const tablets=listings.filter(l=>l.category?.slug==="tablets");
  if(tablets.length){
    const client=await createClient();
    const response=await client.from("listing_tablet_contexts").select("listing_id,category_id,brand_name,model_name,details").in("listing_id",tablets.map(l=>l.id));
    if(!response.error)for(const row of response.data??[]){const item=tablets.find(l=>l.id===row.listing_id&&l.category.id===row.category_id);const p=tabletDetailsSchema.safeParse(row.details);if(item&&p.success&&typeof row.brand_name==="string"&&typeof row.model_name==="string")results.set(item.id,{family:"tablets",priceLabel:publicPriceFallback(item.category.slug,item.price_type,item.price_paise),specifications:tabletFacts({...p.data,brand_name:row.brand_name,model_name:row.model_name}).filter(f=>["model","storage","connectivity","condition","touch","battery"].includes(f.field))});}
  }
  const wearables=listings.filter(l=>l.category?.slug==="wearables");
  if(wearables.length){
    const client=await createClient();
    const response=await client.from("listing_wearable_contexts_v1").select("listing_id,category_id,device_type,brand_name,model_name,other_model,pairing_status,transfer_ready,details").in("listing_id",wearables.map(l=>l.id));
    if(!response.error)for(const r of response.data??[]){const item=wearables.find(l=>l.id===r.listing_id&&l.category.id===r.category_id);const p=wearableDetailsSchema.safeParse(r.details);if(item&&p.success&&DEVICE_TYPES.includes(r.device_type)&&["reset_ready","signed_out","still_paired","unknown"].includes(r.pairing_status))results.set(item.id,{family:"wearables",priceLabel:publicPriceFallback(item.category.slug,item.price_type,item.price_paise),specifications:wearableCardFacts({device_type:r.device_type,brand_name:r.brand_name,model_name:r.model_name,other_model:!!r.other_model,pairing_status:r.pairing_status,transfer_ready:!!r.transfer_ready,details:p.data})});}
  }
  const accessories=listings.filter(l=>l.category?.slug==="mobile-accessories");
  if(accessories.length){
    const client=await createClient();
    const response=await client.from("listing_accessory_contexts").select("listing_id,category_id,details").in("listing_id",accessories.map(l=>l.id));
    if(!response.error)for(const row of response.data??[]){const item=accessories.find(l=>l.id===row.listing_id&&l.category.id===row.category_id);const p=accessoryDetailsSchema.safeParse(row.details);if(item&&p.success)results.set(item.id,{family:"accessories",priceLabel:publicPriceFallback(item.category.slug,item.price_type,item.price_paise),specifications:accessoryFacts(p.data)});}
  }
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
