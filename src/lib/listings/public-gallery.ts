import "server-only";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { loadSellerStatuses, mapWithConcurrency } from "@/lib/favourites/schema-compat";
import { planLegacyMediaStorageCleanup } from "@/lib/media/legacy-storage-cleanup";
import { createAnonymousBudget } from "@/lib/security/anonymous-budget";

export const GALLERY_IDS_LIMIT = 24;
export const GALLERY_PHOTOS_PER_LISTING = 5;
const VISIBILITY_CONCURRENCY = 5;

/** Per-instance, best-effort (see security/anonymous-budget.ts); cost is the number of listing ids. Not a global rate limit. */
export const galleryBudget = createAnonymousBudget({ windowMs: 60_000, maxRequests: 30, maxCost: 360, maxGlobalCost: 6000 });

const idsSchema = z.array(z.string().uuid()).min(1).max(GALLERY_IDS_LIMIT);

/** Parses the untrusted `ids` query value (comma separated). Lower-cased, de-duplicated, at most 24 UUIDs. */
export function parseGalleryIds(raw: string | null): { ok: true; ids: string[] } | { ok: false } {
  if (!raw || raw.length > GALLERY_IDS_LIMIT * 37) return { ok: false };
  const parsed = idsSchema.safeParse(raw.split(","));
  if (!parsed.success) return { ok: false };
  return { ok: true, ids: [...new Set(parsed.data.map((id) => id.toLowerCase()))] };
}

type ListingRow = { id: string; status: string; expires_at: string | null; seller_id: string };
type MediaRow = {
  id: string; listing_id: string; display_order: number | null; processing_status: string | null;
  original_storage_path: string | null; thumbnail_storage_path: string | null; medium_storage_path: string | null; large_storage_path: string | null;
};

/**
 * Server-only. For already-validated listing ids returns `{ [listingId]: mediaId[] }` for publicly visible listings that
 * have more than one photo. A listing appears only when it is active, unexpired, its seller is active and
 * `is_listing_publicly_visible` agrees; a photo only when it belongs to that listing, is `ready`, has a thumbnail and
 * passes the same legacy-path fence as the delivery route. Only media ids leave the server (never storage paths); bytes
 * are still served and re-authorised by `/api/listings/[id]/media/[mediaId]/thumb`. Exactly four bounded queries
 * (listings, sellers, one visibility RPC per candidate at concurrency 5, media), never one query per photo.
 */
export async function getPublicGalleries(ids: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  if (ids.length === 0 || ids.length > GALLERY_IDS_LIMIT) return out;
  const service = createServiceRoleClient();

  const { data: listings, error } = await service.from("listings").select("id, status, expires_at, seller_id").in("id", ids);
  if (error) throw new Error("gallery listing lookup failed");
  const now = Date.now();
  const live = ((listings ?? []) as ListingRow[]).filter((row) => row.status === "active" && (!row.expires_at || new Date(row.expires_at).getTime() > now));
  if (live.length === 0) return out;

  const sellers = await loadSellerStatuses(service, live.map((row) => row.seller_id));
  const candidates = live.filter((row) => sellers.get(row.seller_id) === "active");

  const visible = await mapWithConcurrency(candidates, VISIBILITY_CONCURRENCY, async (row) => {
    const { data: ok, error: rpcError } = await service.rpc("is_listing_publicly_visible", { listing_id: row.id });
    return !rpcError && ok === true ? row.id : null;
  });
  const visibleIds = visible.filter((id): id is string => id !== null);
  if (visibleIds.length === 0) return out;

  const { data: media, error: mediaError } = await service
    .from("listing_media")
    .select("id, listing_id, display_order, processing_status, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path")
    .in("listing_id", visibleIds)
    .eq("processing_status", "ready")
    .not("thumbnail_storage_path", "is", null)
    .order("display_order", { ascending: true })
    .limit(visibleIds.length * 20);
  if (mediaError) throw new Error("gallery media lookup failed");

  const allowed = new Set(visibleIds);
  for (const row of (media ?? []) as MediaRow[]) {
    if (!allowed.has(row.listing_id) || row.processing_status !== "ready" || !row.thumbnail_storage_path) continue;
    if (planLegacyMediaStorageCleanup(row.listing_id, row.id, row).kind !== "legacy") continue;
    const list = (out[row.listing_id] ??= []);
    if (list.length < GALLERY_PHOTOS_PER_LISTING) list.push(row.id);
  }
  for (const id of Object.keys(out)) if (out[id].length < 2) delete out[id]; // 0/1 photo cards keep the static cover
  return out;
}