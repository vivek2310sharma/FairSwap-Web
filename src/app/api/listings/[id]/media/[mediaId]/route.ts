import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { planLegacyMediaStorageCleanup } from "@/lib/media/legacy-storage-cleanup";
import {
  mediaApiError,
  mapRpcErrorToMediaError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
} from "@/lib/media/api-contract";

/**
 * DELETE /api/listings/[id]/media/[mediaId]
 *
 * Hardened seller media deletion route.
 * Supports unified cookie and Bearer authentication.
 *
 * Architecture & Failure Ordering:
 * 1. Authenticate (cookie or Bearer).
 * 2. Preflight guards: maintenance, active account, current policy, listing owner, mutable status.
 * 3. Lookup private storage paths before DB deletion using server-only service client.
 *    - Database lookup error returns 422 MEDIA_DELETE_FAILED (never reported as success).
 * 4. Refuse sealed or unexpected keys BEFORE DB deletion.
 * 5. Execute authoritative transactional deletion via user-scoped RPC `seller_delete_listing_media`.
 *    - Idempotent: If media row is already absent for the owner's listing, returns success with deleted=false.
 *    - Automatically falls back cover_photo_id to the next ready media item.
 *    - Re-review trigger fires ONLY if deleted media was 'ready'.
 * 6. DB deletion commits first.
 * 7. Best-effort private Storage cleanup runs after committed DB deletion.
 *    - If Storage cleanup fails, the DB row remains deleted; an orphaned private object is
 *      preferable to a visible DB row or active cover pointing at a destroyed object.
 * 8. Returns safe media snapshot.
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
      authResult.failure.message
    );
  }

  const { client, user } = authResult.context;

  // 2. Comprehensive preflight mutation guard
  // (maintenance, account status, policy acceptance, owner, editable status)
  const guard = await verifySellerMediaMutationGuard(client, user, listingId);
  if (!guard.allowed) {
    return guard.response;
  }

  // 3. Server-only lookup of storage paths before DB deletion
  const serviceClient = createServiceRoleClient();
  const lookupClient = typeof serviceClient?.from === "function" ? serviceClient : client;
  const { data: mediaRow, error: mediaLookupError } = await lookupClient
    .from("listing_media")
    .select("id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status")
    .eq("id", mediaId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (mediaLookupError) {
    // Database query error during lookup is NOT success
    return mediaApiError("MEDIA_DELETE_FAILED");
  }

  // Only known legacy paths may be removed by this privileged route.
  // V2 sealed/unknown paths are retired through a separate trusted workflow.
  const cleanupPlan = planLegacyMediaStorageCleanup(listingId, mediaId, {
    original_storage_path: mediaRow?.original_storage_path,
    thumbnail_storage_path: mediaRow?.thumbnail_storage_path,
    medium_storage_path: mediaRow?.medium_storage_path,
    large_storage_path: mediaRow?.large_storage_path,
  });

  // Fail closed BEFORE the DB mutation. This is an app-level fence;
  // Backend must independently enforce this against races and other writers.
  if (mediaRow && cleanupPlan.kind === "deferred") {
    logger.warn("media.storage_cleanup_deferred", {
      operation: "delete_media_storage_cleanup",
      listing_id: listingId,
      media_id: mediaId,
      stage: "sealed_or_unrecognized_path",
    });
    return mediaApiError(
      "LISTING_MEDIA_NOT_EDITABLE",
      "This photo requires review before it can be removed."
    );
  }

  // 4. Authenticated user-scoped RPC deletion (DB-first)
  const { data: deleteResult, error: rpcError } = await client.rpc("seller_delete_listing_media", {
    listing_id: listingId,
    media_id: mediaId,
  });

  if (rpcError) {
    return mapRpcErrorToMediaError(rpcError, "MEDIA_DELETE_FAILED");
  }

  // 5. Best-effort private Storage cleanup after committed DB mutation
  const isDeleted =
    typeof deleteResult === "object" &&
    deleteResult !== null &&
    (deleteResult as { deleted?: boolean }).deleted === true;

  if (isDeleted && cleanupPlan.kind === "legacy") {
    try {
      let cleanupErrorOccurred = false;

      if (cleanupPlan.originals.length > 0) {
        const { error: origErr } = await serviceClient.storage
          .from("listing-originals")
          .remove(cleanupPlan.originals);
        if (origErr) {
          cleanupErrorOccurred = true;
        }
      }

      if (cleanupPlan.derivatives.length > 0) {
        const { error: derivErr } = await serviceClient.storage
          .from("listing-derivatives")
          .remove(cleanupPlan.derivatives);
        if (derivErr) {
          cleanupErrorOccurred = true;
        }
      }

      if (cleanupErrorOccurred) {
        logger.warn("media.storage_cleanup_failed", {
          operation: "delete_media_storage_cleanup",
          listing_id: listingId,
          media_id: mediaId,
          stage: "storage_remove_error",
        });
      }
    } catch (cleanupErr) {
      // Best-effort cleanup: log sanitized warning, never expose storage details to client
      logger.warn("media.storage_cleanup_failed", {
        operation: "delete_media_storage_cleanup",
        listing_id: listingId,
        media_id: mediaId,
        stage: cleanupErr instanceof Error ? cleanupErr.name : "exception",
      });
    }
  }

  // 6. Mutation is COMMITTED. Attempt authoritative safe snapshot reconciliation.
  const snapshotResult = await buildSafeMediaSnapshot(client, listingId);
  const refreshRequired = !snapshotResult.ok;
  const snapshot = snapshotResult.ok ? snapshotResult.snapshot : null;

  const deletedMediaId = isDeleted
    ? ((deleteResult as { deleted_media_id?: string | null }).deleted_media_id ?? mediaId)
    : null;

  const newCoverId =
    typeof deleteResult === "object" &&
    deleteResult !== null &&
    "new_cover_id" in deleteResult
      ? ((deleteResult as { new_cover_id?: string | null }).new_cover_id ?? null)
      : null;

  return NextResponse.json(
    {
      success: true,
      committed: true,
      deleted: isDeleted,
      deleted_media_id: deletedMediaId,
      new_cover_id: newCoverId,
      refreshRequired,
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
