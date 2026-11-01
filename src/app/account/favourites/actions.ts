"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { parseSavedIds } from "@/lib/favourites/ids";

export interface FavouriteActionResult {
  success: boolean;
  isFavourited?: boolean;
  error?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
}

export async function toggleFavouriteAction(listingId: string): Promise<FavouriteActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/listings/${listingId}`);
  if (!guard.allowed) {
    return {
      success: false,
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please sign in to save favourites" };
  }

  // Check if existing favourite
  const { data: existing } = await supabase
    .from("favourites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    // Remove favourite
    const { error: deleteError } = await supabase
      .from("favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (deleteError) {
      return { success: false, error: "Failed to remove favourite" };
    }

    revalidatePath("/account/favourites");
    return { success: true, isFavourited: false };
  } else {
    // Check if listing is publicly visible before inserting
    const { data: isVisible } = await supabase.rpc("is_listing_publicly_visible", {
      listing_id: listingId,
    });

    if (!isVisible) {
      return { success: false, error: "This ad is no longer available to favourite" };
    }

    const { error: insertError } = await supabase
      .from("favourites")
      .insert({
        user_id: user.id,
        listing_id: listingId,
      });

    if (insertError) {
      return { success: false, error: "Failed to save favourite" };
    }

    revalidatePath("/account/favourites");
    return { success: true, isFavourited: true };
  }
}

export async function removeFavouriteAction(listingId: string): Promise<{
  success: boolean;
  error?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
}> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/favourites");
  if (!guard.allowed) {
    return {
      success: false,
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId);

  if (error) {
    return { success: false, error: "Failed to remove favourite" };
  }

  revalidatePath("/account/favourites");
  return { success: true };
}

export async function clearUnavailableFavouritesAction(listingIds: string[]): Promise<{
  success: boolean;
  error?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
}> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/favourites");
  if (!guard.allowed) {
    return {
      success: false,
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  if (listingIds.length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", user.id)
    .in("listing_id", listingIds);

  if (error) {
    return { success: false, error: "Failed to clear unavailable favourites" };
  }

  revalidatePath("/account/favourites");
  return { success: true };
}

export interface SyncGuestFavouritesResult {
  success: boolean;
  error?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
  added?: number;
  alreadySaved?: number;
  skipped?: number;
  /** The caller's own ids that are now in the account (safe to drop from the device). */
  syncedIds?: string[];
  /** The caller's own ids that were not public or could not be saved (kept on the device). */
  skippedIds?: string[];
}

/**
 * Explicit, user-triggered sync of device-saved ids into the signed-in account. Never called automatically.
 * Idempotent (existing rows are kept, conflicts ignored), bounded to 50, re-checks public visibility per id and
 * writes only through the user-scoped client so owner RLS stays authoritative.
 */
export async function syncGuestFavouritesAction(ids: unknown): Promise<SyncGuestFavouritesResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/favourites");
  if (!guard.allowed) {
    return { success: false, error: guard.error, requiresPolicyReview: guard.requiresPolicyReview, redirectTo: guard.redirectTo };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Please sign in to sync saved ads" };

  const parsed = parseSavedIds(ids);
  if (!parsed.ok) return { success: false, error: parsed.error };
  if (parsed.ids.length === 0) return { success: true, added: 0, alreadySaved: 0, skipped: 0, syncedIds: [], skippedIds: [] };

  const checks = await Promise.all(parsed.ids.map(async (id) => {
    const { data: visible, error } = await supabase.rpc("is_listing_publicly_visible", { listing_id: id });
    return !error && visible === true ? id : null;
  }));
  const visibleIds = checks.filter((id): id is string => id !== null);

  const { data: existingRows, error: existingError } = visibleIds.length
    ? await supabase.from("favourites").select("listing_id").eq("user_id", user.id).in("listing_id", visibleIds)
    : { data: [], error: null };
  if (existingError) return { success: false, error: "Could not sync saved ads" };
  const existing = new Set((existingRows ?? []).map((row) => row.listing_id));
  const fresh = visibleIds.filter((id) => !existing.has(id));

  if (fresh.length) {
    const { error: insertError } = await supabase
      .from("favourites")
      .upsert(fresh.map((listing_id) => ({ user_id: user.id, listing_id })), { onConflict: "user_id,listing_id", ignoreDuplicates: true });
    if (insertError) return { success: false, error: "Could not sync saved ads" };
  }

  const synced = new Set(visibleIds);
  revalidatePath("/account/favourites");
  return {
    success: true,
    added: fresh.length,
    alreadySaved: existing.size,
    skipped: parsed.ids.length - visibleIds.length,
    syncedIds: visibleIds,
    skippedIds: parsed.ids.filter((id) => !synced.has(id)),
  };
}
