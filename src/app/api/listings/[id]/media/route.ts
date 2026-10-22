import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { detectImageMimeFromMagicBytes, processImageBuffer } from "@/lib/media/processor";
import {
  mediaApiError,
  verifySellerMediaMutationGuard,
  buildSafeMediaSnapshot,
} from "@/lib/media/api-contract";

/**
 * GET /api/listings/[id]/media
 *
 * Safe seller media snapshot route.
 * Accessible to authenticated listing owners (cookie or Bearer).
 * Read route: not blocked by seller-write maintenance.
 * Conceals non-owner or non-existent listings with 404 LISTING_NOT_FOUND.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  // 1. Authenticate caller (cookie or Bearer)
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return mediaApiError(
      authResult.failure.error,
      authResult.failure.message,
      authResult.failure.status
    );
  }

  const { client, user } = authResult.context;

  // 2. Listing ownership check
  // Separate error semantics: DB error -> 503, missing/non-owner -> 404
  const listingQuery = client
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId);

  const { data: listing, error: listingError } =
    typeof (listingQuery as unknown as { maybeSingle?: () => Promise<unknown> }).maybeSingle === "function"
      ? await (listingQuery as unknown as { maybeSingle: () => Promise<{ data: { id: string; seller_id: string } | null; error: unknown }> }).maybeSingle()
      : await (listingQuery as unknown as { single: () => Promise<{ data: { id: string; seller_id: string } | null; error: unknown }> }).single();

  if (listingError) {
    logger.warn("media.get_listing_lookup_failed", {
      operation: "GET_seller_media_snapshot",
      error_code: typeof listingError === "object" && listingError !== null && "code" in listingError ? String((listingError as { code: string }).code) : "UNKNOWN",
    });
    return mediaApiError("MEDIA_SERVICE_UNAVAILABLE");
  }

  if (!listing || listing.seller_id !== user.id) {
    return mediaApiError("LISTING_NOT_FOUND");
  }

  // 3. Build safe snapshot
  const snapshotResult = await buildSafeMediaSnapshot(client, listingId);
  if (!snapshotResult.ok) {
    return mediaApiError(snapshotResult.code);
  }

  return NextResponse.json(snapshotResult.snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-cache, no-store",
    },
  });
}

/**
 * POST /api/listings/[id]/media
 *
 * Hardened seller media upload route.
 * Supports unified cookie and Bearer authentication.
 * Enforces preflight mutation guards before heavy multipart processing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  // 1. Early Content-Length gate (max 6 MB request body)
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 6 * 1024 * 1024) {
    return mediaApiError("PAYLOAD_TOO_LARGE");
  }

  // 2. Authenticate caller (Bearer authoritative; falls back to cookie only when no header)
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

  // 4. Verify maximum 8 photos limit before parsing body
  const { count: photoCount, error: countError } = await client
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (!countError && (photoCount ?? 0) >= 8) {
    return mediaApiError("PHOTO_LIMIT_REACHED");
  }

  // 5. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return mediaApiError("INVALID_MEDIA_REQUEST", "Failed to parse form data.");
  }

  const files = formData.getAll("file") as File[];
  if (!files || files.length !== 1) {
    return mediaApiError(
      "INVALID_MEDIA_REQUEST",
      "Exactly one image file is required per upload request."
    );
  }

  const file = files[0];

  // 6. Source file size boundary check (max 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    return mediaApiError("FILE_TOO_LARGE");
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // 7. Magic-byte inspection using initial 12-byte slice
  const initialSlice = new Uint8Array(arrayBuffer, 0, Math.min(12, arrayBuffer.byteLength));
  const detectedMime = detectImageMimeFromMagicBytes(initialSlice);

  if (!detectedMime) {
    return mediaApiError("INVALID_IMAGE_FORMAT");
  }

  // 8. Storage authorization/bucket probe via service-role client
  let serviceClient: ReturnType<typeof createServiceRoleClient>;
  try {
    serviceClient = createServiceRoleClient();
  } catch {
    return mediaApiError("MEDIA_SERVICE_UNAVAILABLE", "Storage service is temporarily unavailable.");
  }

  const { error: probeError } = await serviceClient.storage.getBucket("listing-originals");
  if (probeError) {
    return mediaApiError("MEDIA_SERVICE_UNAVAILABLE", "Media storage is temporarily unavailable. Please try again later.");
  }

  // 9. Authenticated client INSERT into public.listing_media
  // Executes as user to uphold auth.uid() trigger and listing_media RLS
  const { data: mediaRecord, error: insertError } = await client
    .from("listing_media")
    .insert({
      listing_id: listingId,
      original_filename: file.name.slice(0, 255),
      content_type: detectedMime,
      file_size_bytes: file.size,
    })
    .select("id, display_order, processing_status")
    .single();

  if (insertError || !mediaRecord) {
    if (insertError?.message?.includes("PHOTO_LIMIT_REACHED")) {
      return mediaApiError("PHOTO_LIMIT_REACHED");
    }
    return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to create media record.");
  }

  const mediaId = mediaRecord.id;
  const ext = detectedMime === "image/jpeg" ? "jpg" : detectedMime === "image/png" ? "png" : "webp";
  const originalPath = `${listingId}/${mediaId}/original.${ext}`;
  const thumbPath = `${listingId}/${mediaId}/thumb.webp`;
  const mediumPath = `${listingId}/${mediaId}/medium.webp`;
  const largePath = `${listingId}/${mediaId}/large.webp`;

  let originalUploaded = false;
  const uploadedDerivatives: string[] = [];

  try {
    // 10. Upload original to private bucket listing-originals
    const { error: uploadOrigError } = await serviceClient.storage
      .from("listing-originals")
      .upload(originalPath, fileBuffer, {
        contentType: detectedMime,
        upsert: true,
      });

    if (uploadOrigError) {
      if(guard.newFamily)await serviceClient.rpc('record_media_processing_result',{media_id:mediaId,paths:{},dimensions:{},status:'failed',error:'Failed to upload original image'});
      if (!guard.newFamily) await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});
      try { if (!guard.newFamily) await serviceClient.from("listing_media").delete().eq("id", mediaId); } catch {}
      return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to upload image. Please try again.");
    }

    originalUploaded = true;

    // Update status to processing
    await serviceClient.rpc("record_media_processing_result", {
      media_id: mediaId,
      paths: { original: originalPath },
      dimensions: { width: 0, height: 0 },
      status: "processing",
      error: undefined,
    });

    // 11. Sharp processing
    let derivatives;
    try {
      derivatives = await processImageBuffer(fileBuffer);
    } catch {
      if (!guard.newFamily) await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});
      await serviceClient.rpc("record_media_processing_result", {
        media_id: mediaId,
        paths: { original: originalPath },
        dimensions: { width: 0, height: 0 },
        status: "failed",
        error: "Image derivative processing failed",
      });

      return mediaApiError(
        "MEDIA_PROCESSING_FAILED",
        "Image processing failed. Please try a different image.",
        { media: { id: mediaId, processingStatus: "failed" } }
      );
    }

    // 12. Upload derivatives to private bucket listing-derivatives
    const [uThumb, uMedium, uLarge] = await Promise.all([
      serviceClient.storage.from("listing-derivatives").upload(thumbPath, derivatives.thumb, {
        contentType: "image/webp",
        upsert: true,
      }),
      serviceClient.storage.from("listing-derivatives").upload(mediumPath, derivatives.medium, {
        contentType: "image/webp",
        upsert: true,
      }),
      serviceClient.storage.from("listing-derivatives").upload(largePath, derivatives.large, {
        contentType: "image/webp",
        upsert: true,
      }),
    ]);

    if (!uThumb.error) uploadedDerivatives.push(thumbPath);
    if (!uMedium.error) uploadedDerivatives.push(mediumPath);
    if (!uLarge.error) uploadedDerivatives.push(largePath);

    if (uThumb.error || uMedium.error || uLarge.error) {
      if (uploadedDerivatives.length > 0) {
        if (!guard.newFamily) await serviceClient.storage.from("listing-derivatives").remove(uploadedDerivatives).catch(() => {});
      }
      if (!guard.newFamily) await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});

      await serviceClient.rpc("record_media_processing_result", {
        media_id: mediaId,
        paths: { original: originalPath },
        dimensions: { width: 0, height: 0 },
        status: "failed",
        error: "Failed to store image derivatives",
      });

      return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to store image derivatives.", { media: { id: mediaId, processingStatus: "failed" } });
    }

    // 13. Complete processing via service-role RPC
    const { error: readyError } = await serviceClient.rpc("record_media_processing_result", {
      media_id: mediaId,
      paths: {
        original: originalPath,
        thumbnail: thumbPath,
        medium: mediumPath,
        large: largePath,
      },
      dimensions: {
        width: derivatives.width,
        height: derivatives.height,
      },
      status: "ready",
      error: undefined,
    });

    if (readyError) {
      if(guard.newFamily)await serviceClient.rpc('record_media_processing_result',{media_id:mediaId,paths:{},dimensions:{},status:'failed',error:'Failed to finalize accepted attachment'});
      if (!guard.newFamily) await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});
      if (!guard.newFamily) await serviceClient.storage.from("listing-derivatives").remove([thumbPath, mediumPath, largePath]).catch(() => {});
      try { if (!guard.newFamily) await serviceClient.from("listing_media").delete().eq("id", mediaId); } catch {}
      return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to finalize media processing.");
    }

    // 14. Mutation is COMMITTED. Attempt authoritative safe snapshot reconciliation.
    const snapshotResult = await buildSafeMediaSnapshot(client, listingId, mediaId);
    const refreshRequired = !snapshotResult.ok;
    const snapshot = snapshotResult.ok ? snapshotResult.snapshot : null;

    return NextResponse.json(
      {
        success: true,
        committed: true,
        uploadedMediaId: mediaId,
        processingStatus: "ready",
        refreshRequired,
        snapshot,
        // Backward-compatibility properties for existing Web MediaUploader
        id: mediaId,
        display_order: mediaRecord.display_order,
        processing_status: "ready",
        ...(snapshot || {}),
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    if(guard.newFamily)await serviceClient.rpc('record_media_processing_result',{media_id:mediaId,paths:{},dimensions:{},status:'failed',error:'Accepted attachment processing encountered an unexpected error'});
    if (originalUploaded) {
      if (!guard.newFamily) await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});
    }
    if (uploadedDerivatives.length > 0) {
      if (!guard.newFamily) await serviceClient.storage.from("listing-derivatives").remove(uploadedDerivatives).catch(() => {});
    }
    try {
      if (!guard.newFamily) await serviceClient.from("listing_media").delete().eq("id", mediaId);
    } catch {
      // Ignored
    }

    return mediaApiError("MEDIA_UPLOAD_FAILED", "Image processing encountered an unexpected error.");
  }
}
