import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  mediaApiError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
} from "@/lib/media/api-contract";

/**
 * DELETE /api/listings/[id]/media/[mediaId]
 *
 * Hardened seller media deletion route.
 * Supports unified cookie and Bearer authentication.
 *
 * Failure windows & idempotency design:
 * - If the media row is already absent for the authorized owner's listing,
 *   returns idempotent 200 OK with the current safe snapshot.
 * - Does not reveal whether a media ID belongs to another listing/user.
 * - Storage removal of original + derivative files executes first.
 *   If storage removal fails, the DB row is preserved and 500 is returned,
 *   enabling clean retry.
 * - Server DB deletion executes via service-role RPC `delete_listing_media_internal`
 *   which atomically clears or falls back cover_photo_id to the next ready media
 *   and triggers material re-review if the listing is active/reserved/paused.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const { id: listingId, mediaId } = await params;

  // 1. Authenticate caller (Bearer authoritative; falls back to cookie)
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return mediaApiError(
      authResult.failure.error,
      authResult.failure.message,
      authResult.failure.status
    );
  }

  const { client, user } = authResult.context;

  // 2. Comprehensive preflight mutation guard
  // (maintenance, account status, policy acceptance, owner, editable status)
  const guard = await verifySellerMediaMutationGuard(client, user, listingId);
  if (!guard.allowed) {
    return guard.response;
  }

  // 3. Check if media row exists for this listing
  const { data: media, error: mediaError } = await client
    .from("listing_media")
    .select("id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status")
    .eq("id", mediaId)
    .eq("listing_id", listingId)
    .maybeSingle();

  // Retry-safe idempotency: if media row is already absent, return success with current snapshot
  if (mediaError || !media) {
    const snapshot = await buildSafeMediaSnapshot(client, listingId);
    return NextResponse.json(
      {
        success: true,
        message: "Media deleted successfully.",
        snapshot,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const serviceClient = createServiceRoleClient();

  // 4. Storage removal of original + derivative objects
  // If storage removal fails before DB mutation, preserve DB row and fail closed
  if (media.original_storage_path) {
    const { error: removeOrigError } = await serviceClient.storage
      .from("listing-originals")
      .remove([media.original_storage_path]);
    if (removeOrigError) {
      return mediaApiError("MEDIA_DELETE_FAILED");
    }
  }

  const objectsToDeleteFromDerivatives: string[] = [];
  if (media.thumbnail_storage_path) objectsToDeleteFromDerivatives.push(media.thumbnail_storage_path);
  if (media.medium_storage_path) objectsToDeleteFromDerivatives.push(media.medium_storage_path);
  if (media.large_storage_path) objectsToDeleteFromDerivatives.push(media.large_storage_path);

  if (objectsToDeleteFromDerivatives.length > 0) {
    const { error: removeDerivError } = await serviceClient.storage
      .from("listing-derivatives")
      .remove(objectsToDeleteFromDerivatives);
    if (removeDerivError) {
      return mediaApiError("MEDIA_DELETE_FAILED");
    }
  }

  // 5. Server-controlled DB deletion via service-role RPC
  // Atomically updates cover_photo_id if this was the cover, deletes row,
  // and fires AFTER DELETE trigger which re-reviews if active/reserved/paused.
  const { data: rpcResult, error: rpcError } = await serviceClient.rpc("delete_listing_media_internal", {
    listing_id: listingId,
    media_id: mediaId,
  });

  if (rpcError) {
    return mediaApiError("MEDIA_DELETE_FAILED");
  }

  // 6. Return safe snapshot of remaining media
  const snapshot = await buildSafeMediaSnapshot(client, listingId);

  return NextResponse.json(
    {
      success: true,
      result: rpcResult,
      snapshot,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
