import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Schema-compatible helpers for the favourites read paths.
 *
 * FairSwapTest and FairSwapProd name (and target) some listings foreign keys differently:
 *   - `listings_seller_id_fkey` -> user_accounts(user_id) in Test, auth.users(id) in Production.
 *   - the cover-photo FK is `listings_cover_photo_id_fkey` in Test and `fk_listings_cover_photo` in Production.
 * PostgREST embeds that name an FK (`table!fk_name(...)`) therefore fail on one of the two. These helpers read
 * only scalar columns (`seller_id`, `cover_photo_id`) and resolve seller status and cover media with separate
 * plain `.in()` lookups, which behave identically on both schemas and need no migration.
 *
 * Server-only. Callers must pass a client appropriate to their security contract and never return raw rows.
 */

// The loose client type avoids coupling these helpers to the generated Database shape.
type Client = Pick<SupabaseClient, "from">;

const IN_LIMIT = 200; // generous cap; callers already bound ids to 50

export interface CoverMediaRow {
  id: string;
  listing_id: string;
  thumbnail_storage_path: string | null;
  medium_storage_path: string | null;
  width: number | null;
  height: number | null;
  processing_status: string | null;
}

/** account_status by seller id. A seller with no `user_accounts` row is simply absent (callers fail closed). */
export async function loadSellerStatuses(client: Client, sellerIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(sellerIds)].slice(0, IN_LIMIT);
  const statuses = new Map<string, string>();
  if (ids.length === 0) return statuses;
  const { data, error } = await client.from("user_accounts").select("user_id, account_status").in("user_id", ids);
  if (error) throw new Error("seller status lookup failed");
  for (const row of (data ?? []) as Array<{ user_id: string; account_status: string }>) statuses.set(row.user_id, row.account_status);
  return statuses;
}

/**
 * Cover media by id. Each row is kept only if it really belongs to the listing that names it as cover
 * (`listing_id` match), so a forged or stale pointer cannot surface another listing's photo.
 */
export async function loadCoverMedia(
  client: Client,
  covers: Array<{ listingId: string; coverPhotoId: string | null }>,
): Promise<Map<string, CoverMediaRow>> {
  const wanted = covers.filter((c): c is { listingId: string; coverPhotoId: string } => !!c.coverPhotoId).slice(0, IN_LIMIT);
  const byListing = new Map<string, CoverMediaRow>();
  if (wanted.length === 0) return byListing;
  const { data, error } = await client
    .from("listing_media")
    .select("id, listing_id, thumbnail_storage_path, medium_storage_path, width, height, processing_status")
    .in("id", [...new Set(wanted.map((c) => c.coverPhotoId))]);
  if (error) throw new Error("cover media lookup failed");
  const media = new Map(((data ?? []) as CoverMediaRow[]).map((row) => [row.id, row]));
  for (const { listingId, coverPhotoId } of wanted) {
    const row = media.get(coverPhotoId);
    if (row && row.listing_id === listingId) byListing.set(listingId, row);
  }
  return byListing;
}

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
