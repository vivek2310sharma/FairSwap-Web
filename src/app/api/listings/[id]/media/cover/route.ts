import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import {
  mediaApiError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
  SetCoverPhotoRequestSchema,
} from "@/lib/media/api-contract";

/**
 * PUT /api/listings/[id]/media/cover
 *
 * Transactional seller cover photo selection route.
 * Calls `public.seller_set_listing_cover_photo` using the user-scoped authenticated client.
 * Enforces ownership, active status, policy acceptance, and ready media validation.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  // 1. Parse and validate JSON request body with Zod
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return mediaApiError("INVALID_MEDIA_REQUEST", "Invalid JSON payload.");
  }

  const parseResult = SetCoverPhotoRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return mediaApiError(
      "INVALID_MEDIA_REQUEST",
      parseResult.error.issues[0]?.message ?? "Invalid cover photo request."
    );
  }

  // 2. Authenticate caller (Bearer authoritative; falls back to cookie)
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return mediaApiError(
      authResult.failure.error,
      authResult.failure.message,
      authResult.failure.status
    );
  }

  const { client, user } = authResult.context;

  // 3. Comprehensive preflight mutation guard
  // (maintenance, account status, policy acceptance, owner, editable status)
  const guard = await verifySellerMediaMutationGuard(client, user, listingId);
  if (!guard.allowed) {
    return guard.response;
  }

  // 4. Call transactional user-scoped RPC
  const { error: rpcError } = await client.rpc("seller_set_listing_cover_photo", {
    listing_id: listingId,
    media_id: parseResult.data.mediaId,
  });

  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("MEDIA_NOT_FOUND")) {
      return mediaApiError("MEDIA_NOT_FOUND");
    }
    if (msg.includes("LISTING_MEDIA_NOT_EDITABLE")) {
      return mediaApiError("LISTING_MEDIA_NOT_EDITABLE");
    }
    if (msg.includes("COVER_UPDATE_FAILED") || msg.includes("not ready")) {
      return mediaApiError(
        "COVER_UPDATE_FAILED",
        "Selected photo is not ready to be set as cover."
      );
    }
    return mediaApiError("COVER_UPDATE_FAILED");
  }

  // 5. Build and return updated safe snapshot
  const snapshot = await buildSafeMediaSnapshot(client, listingId);
  if (!snapshot) {
    return mediaApiError("LISTING_NOT_FOUND");
  }

  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
