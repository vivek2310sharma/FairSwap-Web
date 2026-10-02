import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import {
  mediaApiError,
  mapRpcErrorToMediaError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
  ReorderMediaRequestSchema,
} from "@/lib/media/api-contract";

/**
 * POST /api/listings/[id]/media/reorder
 *
 * Transactional seller media reorder route.
 * Calls `public.seller_reorder_listing_media` using the user-scoped authenticated client.
 * Enforces atomic reorder, complete membership of ready media, and re-review semantics.
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
      authResult.failure.message
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
  const { data: rpcData, error: rpcError } = await client.rpc("seller_reorder_listing_media", {
    listing_id: listingId,
    media_ids: parseResult.data.mediaIds,
  });

  if (rpcError) {
    return mapRpcErrorToMediaError(rpcError, "MEDIA_REORDER_FAILED");
  }

  const isChanged =
    typeof rpcData === "object" &&
    rpcData !== null &&
    "changed" in rpcData
      ? Boolean((rpcData as { changed?: boolean }).changed)
      : true;

  // 5. Mutation is COMMITTED. Attempt authoritative safe snapshot reconciliation.
  const snapshotResult = await buildSafeMediaSnapshot(client, listingId);
  const refreshRequired = !snapshotResult.ok;
  const snapshot = snapshotResult.ok ? snapshotResult.snapshot : null;

  return NextResponse.json(
    {
      success: true,
      committed: true,
      changed: isChanged,
      refreshRequired,
      snapshot,
      ...(snapshot || {}),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
