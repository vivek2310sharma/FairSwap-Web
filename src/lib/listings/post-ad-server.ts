import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListingCategoryReference, ListingAttributeReference, City } from "@/types/listing";
import { isVerifiedPostAdTestEnvironment, isVerifiedGoodsProductionEnvironment } from "./test-runtime";
import {classifyCategoryAssignment,loadSavedCategoryContext,savedContextSchema,type SavedContext} from "./saved-category-context";
import type {PostAdLocations} from './post-ad-locations';

export function isGoodsPostAdEnabled() { return isVerifiedPostAdTestEnvironment(process.env) || isVerifiedGoodsProductionEnvironment(process.env); }
const metadata = z.object({ id: z.string().uuid(), is_active: z.boolean(), macro_category: z.string().nullable(), new_listing_enabled: z.boolean() }).passthrough();
export function isEligibleGoodsCategory(value: unknown): boolean {
  const parsed = metadata.safeParse(value);
  return parsed.success && parsed.data.is_active && parsed.data.new_listing_enabled && parsed.data.macro_category === "goods";
}
export type GoodsReferences = { status: "ready"; categories: ListingCategoryReference[]; attributes: ListingAttributeReference[]; cities: City[] } | { status: "error"; message: string };
/** savedContext is the validated owner RPC result, never a submitted field. */
export async function loadGoodsReferences(supabase: SupabaseClient, savedContext?: SavedContext, locations?: Promise<PostAdLocations>): Promise<GoodsReferences> {
  const saved=savedContext===undefined?null:savedContextSchema.safeParse(savedContext);
  if(saved && (!saved.success || saved.data.category.macro_category!=="goods")) return {status:"error",message:"Saved Goods category could not be verified."};
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).eq("macro_category", "goods").eq("new_listing_enabled", true).order("sort_order", { ascending: true });
  if (error || !Array.isArray(data) || data.some(row => !isEligibleGoodsCategory(row))) return { status: "error", message: "Goods categories could not be loaded. Please try again later." };
  const context=saved?.success?saved.data:undefined;
  const categories:ListingCategoryReference[] = data.filter(row=>row.id!==context?.category.id);
  const newCategoryIds=categories.map(row=>row.id);
  if(context) categories.push(context.category);
  const [attributes, cities] = await Promise.all([
    newCategoryIds.length ? supabase.from("category_attributes").select("*").in("category_id", newCategoryIds).order("sort_order", { ascending: true }) : Promise.resolve({data: [], error: null}),
    locations ? locations.then(result=>result.status==='ready'?{data:result.cities,error:null}:{data:null,error:result.message}) : supabase.from("cities").select("*").eq("is_active", true).order("name", { ascending: true }),
  ]);
  if (attributes.error || cities.error || !attributes.data || !cities.data) return { status: "error", message: "Goods form references could not be loaded. Please try again later." };
  const mergedAttributes=new Map<string,ListingAttributeReference>((attributes.data as ListingAttributeReference[]).map(row=>[row.id,row]));
  context?.attributes.forEach(row=>mergedAttributes.set(row.id,row));
  return { status: "ready", categories, attributes: [...mergedAttributes.values()], cities: cities.data as City[] };
}

/** Presentation metadata is not RLS; seller clients and database guards remain authoritative. */
export async function validatePostAdSelection(supabase: SupabaseClient, form: FormData, listingId?: string, userId?: string): Promise<string | null> {
  const entry = form.getAll("post_ad_entry");
  if (!isGoodsPostAdEnabled()) return entry.length ? "The Post Ad flow is unavailable." : null;
  // New drafts must originate in the integrated Goods flow; legacy is an
  // edit-only saved-context compatibility path, not a new-listing choice.
  if (entry.length > 1 || (entry.length === 1 && entry[0] !== "goods" && (entry[0] !== "legacy" || !listingId))) return "Invalid Post Ad context.";
  if (!listingId && entry.length !== 1) return "Choose Goods in the new Post Ad flow.";
  let goods = entry[0] === "goods";
  let savedCategoryId: string | undefined;
  let savedContext: SavedContext | undefined;
  if (listingId) {
    const existing = await supabase.from("listings").select("category_id,seller_id").eq("id", listingId).maybeSingle();
    if (existing.error || !existing.data || existing.data.seller_id !== userId) return "Listing is unavailable or you are not its owner.";
    const persisted = await loadSavedCategoryContext(supabase,listingId);
    if (persisted.status!=="ready" || persisted.context.category.id!==existing.data.category_id) return "Saved category could not be verified.";
    savedContext=persisted.context;
    goods = savedContext.category.macro_category === "goods";
    savedCategoryId = savedContext.category.id;
    if (!goods && entry[0] === "goods") return "Post Ad context does not match the saved category.";
    if (goods && entry[0] === "legacy") return "Post Ad context does not match the saved category.";
  }
  const ids = form.getAll("category_id");
  if (ids.length !== 1 || !z.string().uuid().safeParse(ids[0]).success) return "Select a valid Goods category.";
  // Retaining the authoritative saved category is not a new assignment.
  if (listingId && ids[0] === savedCategoryId && classifyCategoryAssignment("update",savedCategoryId,null,savedContext)==="retention") return null;
  const selected = await supabase.from("categories").select("*").eq("id", ids[0]).maybeSingle();
  if (selected.error) return "Category could not be verified. Please try again later.";
  // Retained legacy editing cannot exempt a newly assigned Goods category.
  if (!goods) {
    const parsed = metadata.safeParse(selected.data);
    if (!parsed.success) return "Category metadata could not be verified.";
    if (parsed.data.macro_category !== "goods") return null;
  }
  return isEligibleGoodsCategory(selected.data) ? null : "Select an active, enabled Goods category.";
}
