import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import {
  mediaApiError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
  ReorderMediaRequestSchema,
} from "@/lib/media/api-contract";

/**
 * POST /api/listings/[id]/media/reorder
 *
 * Transactional seller media reorder route.
 * Calls `public.seller_reorder_listing_media` using the user-scoped authenticated client.
 * Enforces atomic reorder, complete membership of non-failed media, and re-review semantics.
 */
export async function POST(
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

  const parseResult = ReorderMediaRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return mediaApiError(
      "INVALID_MEDIA_REQUEST",
      parseResult.error.issues[0]?.message ?? "Invalid media reorder request."
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
  const { error: rpcError } = await client.rpc("seller_reorder_listing_media", {
    listing_id: listingId,
    media_ids: parseResult.data.mediaIds,
  });

  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("PHOTO_LIMIT_REACHED")) {
      return mediaApiError("PHOTO_LIMIT_REACHED");
    }
    if (msg.includes("LISTING_MEDIA_NOT_EDITABLE")) {
      return mediaApiError("LISTING_MEDIA_NOT_EDITABLE");
    }
    if (
      msg.includes("INVALID_MEDIA_REQUEST") ||
      msg.includes("membership") ||
      msg.includes("Duplicate")
    ) {
      return mediaApiError(
        "INVALID_MEDIA_REQUEST",
        "Reorder list must contain all existing photos for the listing without duplicates."
      );
    }
    return mediaApiError("MEDIA_REORDER_FAILED");
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
