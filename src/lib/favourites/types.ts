import type { ListingCondition, ListingPriceType } from "@/types/listing";

/** Hard cap shared by the device store, the public /saved lookup and the account sync action. */
export const SAVED_IDS_LIMIT = 50;

/**
 * The only listing fields /saved may return to an anonymous visitor. No seller id, description, storage paths,
 * exact location or moderation/internal state. `cover_photo.id` is only set when a public thumbnail derivative exists;
 * the browser loads it through the authorised `/api/listings/[id]/media/[mediaId]/thumb` route, never an original.
 */
export interface SavedListingCard {
  id: string;
  slug: string;
  title: string;
  condition: ListingCondition | null;
  price_type: ListingPriceType | null;
  price_paise: number | null;
  category: { name: string; slug: string };
  city: { name: string } | null;
  locality: { name: string } | null;
  cover_photo: { id: string } | null;
}

export type SavedListingsResult =
  | { ok: true; listings: SavedListingCard[]; unavailableIds: string[] }
  | { ok: false; error: string; rateLimited?: true; retryAfterSeconds?: number };
