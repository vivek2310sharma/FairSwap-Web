"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavouriteAction(listingId: string): Promise<{
  success: boolean;
  isFavourited?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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
      return { success: false, error: "This listing is no longer available to favourite" };
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
}> {
  const supabase = await createClient();
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
}> {
  const supabase = await createClient();
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
