import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { loadCoverMedia, loadSellerStatuses, mapWithConcurrency, type CoverMediaRow } from "./schema-compat";
import type { SavedListingCard, SavedListingsResult } from "./types";

/** Visibility RPCs in flight at once. Keeps a 50-id lookup from fanning out 50 simultaneous database calls. */
export const VISIBILITY_CONCURRENCY = 5;

type One<T> = T | T[] | null;
interface Row {
  id: string;
  slug: string;
  title: string;
  condition: SavedListingCard["condition"];
  price_type: SavedListingCard["price_type"];
  price_paise: number | null;
  status: string;
  expires_at: string | null;
  seller_id: string;
  cover_photo_id: string | null;
  category: One<{ name: string; slug: string }>;
  city: One<{ name: string }>;
  locality: One<{ name: string }>;
}
const first = <T,>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

/** Explicit allowlist: every returned field is named here, so a new column can never leak by accident. */
export function toSavedListingCard(row: Row, cover: Pick<CoverMediaRow, "id" | "thumbnail_storage_path" | "processing_status"> | null): SavedListingCard | null {
  const category = first(row.category);
  if (!category) return null;
  const city = first(row.city);
  const locality = first(row.locality);
  // A cover id is exposed only when a ready public thumbnail derivative exists.
  const hasThumbnail = !!cover && !!cover.thumbnail_storage_path && cover.processing_status === "ready";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition,
    price_type: row.price_type,
    price_paise: row.price_paise,
    category: { name: category.name, slug: category.slug },
    city: city ? { name: city.name } : null,
    locality: locality ? { name: locality.name } : null,
    cover_photo: hasThumbnail ? { id: cover.id } : null,
  };
}

/**
 * Server-only. Resolves already-validated, de-duplicated ids (max 50) to public cards.
 *
 * Schema-compatible (no foreign-key-named embeds, so it works on both FairSwapTest and FairSwapProd): scalar listing
 * columns first, then seller status and cover media in separate plain lookups. A listing is returned only when it is
 * active, unexpired, its seller account is active, and `is_listing_publicly_visible` agrees. Everything else, including
 * ids that do not exist, collapses into the same `unavailableIds` bucket so the response never says why.
 */
export async function getPublicSavedListings(ids: string[]): Promise<SavedListingsResult> {
  if (ids.length === 0) return { ok: true, listings: [], unavailableIds: [] };
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("listings")
    .select(`
      id, slug, title, condition, price_type, price_paise, status, expires_at, seller_id, cover_photo_id,
      category:categories(name, slug),
      city:cities(name),
      locality:localities(name)
    `)
    .in("id", ids);
  if (error) return { ok: false, error: "Saved ads could not be loaded right now." };

  const now = Date.now();
  const live = ((data ?? []) as unknown as Row[]).filter((row) => row.status === "active" && (!row.expires_at || new Date(row.expires_at).getTime() > now));

  let sellerStatus: Map<string, string>;
  try {
    sellerStatus = await loadSellerStatuses(service, live.map((row) => row.seller_id));
  } catch {
    return { ok: false, error: "Saved ads could not be loaded right now." };
  }
  const candidates = live.filter((row) => sellerStatus.get(row.seller_id) === "active");

  const visible = await mapWithConcurrency(candidates, VISIBILITY_CONCURRENCY, async (row) => {
    const { data: ok, error: rpcError } = await service.rpc("is_listing_publicly_visible", { listing_id: row.id });
    return !rpcError && ok === true ? row : null;
  });
  const visibleRows = new Map(visible.filter((row): row is Row => row !== null).map((row) => [row.id, row]));

  let covers: Map<string, CoverMediaRow>;
  try {
    covers = await loadCoverMedia(service, [...visibleRows.values()].map((row) => ({ listingId: row.id, coverPhotoId: row.cover_photo_id })));
  } catch {
    covers = new Map(); // photos are optional; the card renders without one
  }

  const listings: SavedListingCard[] = [];
  const unavailableIds: string[] = [];
  for (const id of ids) {
    const row = visibleRows.get(id);
    const card = row ? toSavedListingCard(row, covers.get(id) ?? null) : null;
    if (card) listings.push(card);
    else unavailableIds.push(id);
  }
  return { ok: true, listings, unavailableIds };
}
