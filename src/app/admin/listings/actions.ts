"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type ModerationActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function moderateListingAction(
  listingId: string,
  action: "approve" | "reject" | "remove",
  reason?: string
): Promise<ModerationActionResult> {
  const supabase = await createClient();

  logger.info("moderation.action_initiated", {
    operation: "moderate_listing",
    extra: { listing_id: listingId, action },
  });

  const { error } = await supabase.rpc("moderate_listing", {
    listing_id: listingId,
    action,
    reason: reason || null,
  });

  if (error) {
    logger.warn("moderation.action_failed", {
      operation: "moderate_listing",
      error_code: error.code || "RPC_ERROR",
    });
    return { error: error.message };
  }

  logger.info("moderation.action_completed", {
    operation: "moderate_listing",
    extra: { listing_id: listingId, action },
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  return { success: true, message: `Listing successfully ${action}d.` };
}
