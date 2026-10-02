import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
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
 * 4. Execute authoritative transactional deletion via user-scoped RPC `seller_delete_listing_media`.
 *    - Idempotent: If media row is already absent for the owner's listing, returns success with deleted=false.
 *    - Automatically falls back cover_photo_id to the next ready media item.
 *    - Re-review trigger fires ONLY if deleted media was 'ready'.
 * 5. DB deletion commits first.
 * 6. Best-effort private Storage cleanup runs after committed DB deletion.
 *    - If Storage cleanup fails, the DB row remains deleted; an orphaned private object is
 *      preferable to a visible DB row or active cover pointing at a destroyed object.
 * 7. Returns safe media snapshot.
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

  // Capture paths for subsequent Storage cleanup if media exists
  const originalPath = mediaRow?.original_storage_path;
  const derivativePaths = [
    mediaRow?.thumbnail_storage_path,
    mediaRow?.medium_storage_path,
    mediaRow?.large_storage_path,
  ].filter((p): p is string => Boolean(p));

  // 4. Authenticated user-scoped RPC deletion (DB-first)
  const { data: deleteResult, error: rpcError } = await client.rpc("seller_delete_listing_media", {
    listing_id: listingId,
    media_id: mediaId,
  });

  if (rpcError) {
    return mapRpcErrorToMediaError(rpcError, "MEDIA_DELETE_FAILED");
  }

  // 5. Best-effort private Storage cleanup after committed DB mutation
  const wasDeleted =
    typeof deleteResult === "object" &&
    deleteResult !== null &&
    (deleteResult as { deleted?: boolean }).deleted === true;

  if (wasDeleted) {
    try {
      if (originalPath) {
        await serviceClient.storage.from("listing-originals").remove([originalPath]);
      }
      if (derivativePaths.length > 0) {
        await serviceClient.storage.from("listing-derivatives").remove(derivativePaths);
      }
    } catch {
      // Best-effort cleanup: log warning internally, never expose storage details to client
    }
  }

  // 6. Return safe snapshot of remaining media
  const snapshot = await buildSafeMediaSnapshot(client, listingId);
  if (!snapshot) {
    return mediaApiError("MEDIA_DELETE_FAILED");
  }

  return NextResponse.json(
    {
      success: true,
      deleted: typeof deleteResult === "object" && deleteResult !== null && "deleted" in deleteResult ? Boolean((deleteResult as { deleted?: boolean }).deleted) : false,
      deleted_media_id: mediaId,
      new_cover_id: typeof deleteResult === "object" && deleteResult !== null && "new_cover_id" in deleteResult ? ((deleteResult as { new_cover_id?: string | null }).new_cover_id ?? null) : null,
      snapshot,
    },
    {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
