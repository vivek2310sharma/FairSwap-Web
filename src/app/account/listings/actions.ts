"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { draftListingSchema, ListingCondition, ListingPriceType } from "@/types/listing";
import type { Database, Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

export type ListingActionResult = {
  error?: string;
  success?: boolean;
  listingId?: string;
  message?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
};

export async function createDraftListingAction(
  prevState: ListingActionResult | null,
  formData: FormData
): Promise<ListingActionResult> {
  if (isSellerWriteMaintenanceEnabled()) {
    return { error: SELLER_WRITE_MAINTENANCE_MESSAGE };
  }
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/listings");
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a listing." };
  }

  const rawAttributes = formData.get("category_attributes") as string;
  let categoryAttributes: Record<string, unknown> = {};
  try {
    if (rawAttributes) {
      categoryAttributes = JSON.parse(rawAttributes);
    }
  } catch {
    categoryAttributes = {};
  }

  const rawData = {
    title: formData.get("title") as string,
    category_id: formData.get("category_id") as string,
    city_id: (formData.get("city_id") as string) || null,
    locality_id: (formData.get("locality_id") as string) || null,
    description: (formData.get("description") as string) || null,
    condition: (formData.get("condition") as ListingCondition) || null,
    price_type: (formData.get("price_type") as ListingPriceType) || null,
    price_paise: formData.get("price_paise") ? parseInt(formData.get("price_paise") as string, 10) : null,
    pin_code: (formData.get("pin_code") as string) || null,
    landmark: (formData.get("landmark") as string) || null,
    category_attributes: categoryAttributes,
  };

  const validation = draftListingSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  logger.info("listing.draft_save_initiated", {
    operation: "create_draft_listing",
    extra: { title: validation.data.title },
  });

  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: validation.data.title,
      category_id: validation.data.category_id,
      city_id: validation.data.city_id!,
      locality_id: validation.data.locality_id,
      description: validation.data.description,
      condition: validation.data.condition,
      price_type: validation.data.price_type,
      price_paise: validation.data.price_paise,
      pin_code: validation.data.pin_code,
      landmark: validation.data.landmark,
      category_attributes: validation.data.category_attributes as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    logger.warn("listing.draft_save_failed", {
      operation: "create_draft_listing",
      error_code: error?.code || "INSERT_ERROR",
    });
    return { error: error?.message || "Failed to create draft listing." };
  }

  revalidatePath("/account/listings");
  return { success: true, listingId: data.id, message: "Draft listing created successfully." };
}

export async function updateListingAction(
  listingId: string,
  formData: FormData
): Promise<ListingActionResult> {
  if (isSellerWriteMaintenanceEnabled()) {
    return { error: SELLER_WRITE_MAINTENANCE_MESSAGE };
  }
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/account/listings/${listingId}/edit`);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const rawAttributes = formData.get("category_attributes") as string;
  let categoryAttributes: Record<string, unknown> = {};
  try {
    if (rawAttributes) {
      categoryAttributes = JSON.parse(rawAttributes);
    }
  } catch {
    categoryAttributes = {};
  }

  const rawData = {
    title: formData.get("title") as string,
    category_id: formData.get("category_id") as string,
    city_id: (formData.get("city_id") as string) || null,
    locality_id: (formData.get("locality_id") as string) || null,
    description: (formData.get("description") as string) || null,
    condition: (formData.get("condition") as ListingCondition) || null,
    price_type: (formData.get("price_type") as ListingPriceType) || null,
    price_paise: formData.get("price_paise") ? parseInt(formData.get("price_paise") as string, 10) : null,
    pin_code: (formData.get("pin_code") as string) || null,
    landmark: (formData.get("landmark") as string) || null,
    category_attributes: categoryAttributes,
  };

  const validation = draftListingSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  logger.info("listing.update_initiated", {
    operation: "update_listing",
    extra: { listing_id: listingId },
  });

  const { error } = await supabase
    .from("listings")
    .update({
      title: validation.data.title,
      category_id: validation.data.category_id,
      city_id: validation.data.city_id!,
      locality_id: validation.data.locality_id,
      description: validation.data.description,
      condition: validation.data.condition,
      price_type: validation.data.price_type,
      price_paise: validation.data.price_paise,
      pin_code: validation.data.pin_code,
      landmark: validation.data.landmark,
      category_attributes: validation.data.category_attributes as unknown as Json,
    })
    .eq("id", listingId);

  if (error) {
    logger.warn("listing.update_failed", {
      operation: "update_listing",
      error_code: error.code || "UPDATE_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath(`/account/listings/${listingId}/edit`);
  revalidatePath("/account/listings");
  return { success: true, listingId, message: "Listing updated successfully." };
}

export async function submitListingAction(listingId: string): Promise<ListingActionResult> {
  if (isSellerWriteMaintenanceEnabled()) {
    return { error: SELLER_WRITE_MAINTENANCE_MESSAGE };
  }
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/listings");
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  // Server-side location integrity check
  const { data: listingData } = await supabase
    .from("listings")
    .select("locality_id")
    .eq("id", listingId)
    .single();

  const { data: privLocData } = await (
    supabase as SupabaseClient<Database>
  ).rpc("get_seller_listing_location_private", { p_listing_id: listingId });
  const privateLoc = Array.isArray(privLocData) ? privLocData[0] : null;
  const pinCode = privateLoc?.pin_code;

  if (!pinCode || !/^\d{6}$/.test(pinCode)) {
    return { error: "A valid 6-digit Indian PIN code is required to submit a listing." };
  }

  if (listingData?.locality_id) {
    const { data: mapping } = await supabase
      .from("postal_pincode_localities")
      .select("id")
      .eq("pincode", pinCode)
      .eq("locality_id", listingData.locality_id)
      .maybeSingle();

    if (!mapping) {
      return { error: `The selected locality is not valid for PIN code ${pinCode}.` };
    }
  }

  logger.info("listing.submit_initiated", {
    operation: "submit_listing",
    extra: { listing_id: listingId },
  });

  const { error } = await supabase.rpc("seller_submit_listing", {
    listing_id: listingId,
  });

  if (error) {
    logger.warn("listing.submit_failed", {
      operation: "submit_listing",
      error_code: error.code || "RPC_ERROR",
    });
    if (error.message.includes("INVALID_PIN_LOCALITY_MAPPING")) {
      return { error: "The selected locality is not valid for this PIN code." };
    }
    return { error: error.message };
  }

  revalidatePath("/account/listings");
  return {
    success: true,
    listingId,
    message: "Listing submitted. Your ad is being checked automatically.",
  };
}

export async function transitionListingAction(
  listingId: string,
  action: string
): Promise<ListingActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/listings");
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  logger.info("listing.transition_initiated", {
    operation: "transition_listing",
    extra: { listing_id: listingId, action },
  });

  const { error } = await supabase.rpc("seller_transition_listing", {
    listing_id: listingId,
    action,
  });

  if (error) {
    logger.warn("listing.transition_failed", {
      operation: "transition_listing",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  revalidatePath("/account/listings");
  return { success: true, listingId, message: `Listing transition '${action}' successful.` };
}

export async function reorderMediaAction(
  listingId: string,
  items: { id: string; display_order: number }[]
): Promise<ListingActionResult> {
  if (isSellerWriteMaintenanceEnabled()) {
    return { error: SELLER_WRITE_MAINTENANCE_MESSAGE };
  }

  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/account/listings/${listingId}/edit`);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const hasInvalidId = items.some((item) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id));
  if (hasInvalidId) {
    return { error: "Cannot reorder pending or temporary photos." };
  }

  const sortedItems = [...items].sort((a, b) => a.display_order - b.display_order);
  const mediaIds = sortedItems.map((item) => item.id);

  const { error } = await supabase.rpc("seller_reorder_listing_media", {
    listing_id: listingId,
    media_ids: mediaIds,
  });

  if (error) {
    return { error: "Failed to reorder photos. Please try again." };
  }

  revalidatePath(`/account/listings/${listingId}/edit`);
  return { success: true, message: "Photos reordered." };
}

export async function setCoverPhotoAction(
  listingId: string,
  mediaId: string
): Promise<ListingActionResult> {
  if (isSellerWriteMaintenanceEnabled()) {
    return { error: SELLER_WRITE_MAINTENANCE_MESSAGE };
  }

  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, `/account/listings/${listingId}/edit`);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const { error } = await supabase.rpc("seller_set_listing_cover_photo", {
    listing_id: listingId,
    media_id: mediaId,
  });

  if (error) {
    return { error: "Failed to update cover photo. Please try again." };
  }

  revalidatePath(`/account/listings/${listingId}/edit`);
  return { success: true, message: "Cover photo set." };
}
