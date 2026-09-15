import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { detectImageMimeFromMagicBytes, processImageBuffer } from "@/lib/media/processor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  // 1. Implementation Hardening: Authenticate and authorize caller BEFORE formData parsing
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify listing ownership and active account status
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: Not listing owner" }, { status: 403 });
  }

  // Verify maximum 8 photos limit
  const { count: photoCount, error: countError } = await supabase
    .from("listing_media")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (!countError && (photoCount ?? 0) >= 8) {
    return NextResponse.json({ error: "Maximum 8 photos allowed per listing" }, { status: 400 });
  }

  // 2. Content-Length Gate: Reject if > 6 MB
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large. Maximum request size is 6 MB." }, { status: 413 });
  }

  // 3. Single-consumption request.formData()
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  // 4. Require exactly one File
  const files: File[] = [];
  formData.forEach((value) => {
    if (
      value instanceof File ||
      (typeof value === "object" &&
        value !== null &&
        typeof (value as Blob).arrayBuffer === "function" &&
        "name" in value)
    ) {
      files.push(value as File);
    }
  });

  if (files.length !== 1) {
    return NextResponse.json(
      { error: "Exactly one image file must be uploaded per request" },
      { status: 400 }
    );
  }

  const file = files[0];

  // 5. File size boundary check (max 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File size exceeds 5 MB limit" },
      { status: 413 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // 6. Magic-byte inspection using initial 12-byte slice
  const initialSlice = new Uint8Array(arrayBuffer, 0, Math.min(12, arrayBuffer.byteLength));
  const detectedMime = detectImageMimeFromMagicBytes(initialSlice);

  if (!detectedMime) {
    return NextResponse.json(
      { error: "Invalid image format. Only JPEG, PNG, and WebP images are allowed." },
      { status: 415 }
    );
  }

  // 7. Validate elevated Storage credential BEFORE committing listing_media row
  let serviceClient: ReturnType<typeof createServiceRoleClient>;
  try {
    serviceClient = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Storage service is temporarily unavailable." },
      { status: 500 }
    );
  }

  // Non-mutating Storage authorization/bucket probe
  const { error: probeError } = await serviceClient.storage.getBucket("listing-originals");
  if (probeError) {
    return NextResponse.json(
      { error: "Media storage is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  // 8. Authenticated client INSERT into public.listing_media
  // This preserves auth.uid() trigger, RLS, and column-level grants
  const { data: mediaRecord, error: insertError } = await supabase
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
    return NextResponse.json(
      { error: insertError?.message || "Failed to create media record" },
      { status: 500 }
    );
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
    // Upload original to private bucket listing-originals
    const { error: uploadOrigError } = await serviceClient.storage
      .from("listing-originals")
      .upload(originalPath, fileBuffer, {
        contentType: detectedMime,
        upsert: true,
      });

    if (uploadOrigError) {
      // Best-effort cleanup of any partially created storage object
      await serviceClient.storage.from("listing-originals").remove([originalPath]);

      // Remove the media record through the privileged server path so no ghost row remains
      await serviceClient.from("listing_media").delete().eq("id", mediaId);

      return NextResponse.json(
        { error: "Failed to upload image. Please try again." },
        { status: 500 }
      );
    }

    originalUploaded = true;

    // Update status to processing
    const { error: procError } = await serviceClient.rpc("record_media_processing_result", {
      media_id: mediaId,
      paths: { original: originalPath },
      dimensions: { width: 0, height: 0 },
      status: "processing",
      error: undefined,
    });
    if (procError) {
      // RPC error recorded
    }

    // Sharp processing
    let derivatives;
    try {
      derivatives = await processImageBuffer(fileBuffer);
    } catch {
      // Remove original from storage
      await serviceClient.storage.from("listing-originals").remove([originalPath]);

      // Deterministically mark media record failed
      await serviceClient.rpc("record_media_processing_result", {
        media_id: mediaId,
        paths: { original: originalPath },
        dimensions: { width: 0, height: 0 },
        status: "failed",
        error: "Image derivative processing failed",
      });

      return NextResponse.json(
        {
          id: mediaId,
          processing_status: "failed",
          error: "Image processing failed. Please try a different image.",
        },
        { status: 422 }
      );
    }

    // Upload derivatives to private bucket listing-derivatives
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
      // Clean up any uploaded derivatives
      if (uploadedDerivatives.length > 0) {
        await serviceClient.storage.from("listing-derivatives").remove(uploadedDerivatives);
      }
      // Clean up original
      await serviceClient.storage.from("listing-originals").remove([originalPath]);

      // Deterministically mark media record failed
      await serviceClient.rpc("record_media_processing_result", {
        media_id: mediaId,
        paths: { original: originalPath },
        dimensions: { width: 0, height: 0 },
        status: "failed",
        error: "Failed to store image derivatives",
      });

      return NextResponse.json(
        {
          id: mediaId,
          processing_status: "failed",
          error: "Failed to store image derivatives",
        },
        { status: 500 }
      );
    }

    // Complete processing via service-role RPC
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
      await serviceClient.storage.from("listing-originals").remove([originalPath]);
      await serviceClient.storage.from("listing-derivatives").remove([thumbPath, mediumPath, largePath]);
      await serviceClient.from("listing_media").delete().eq("id", mediaId);

      return NextResponse.json(
        { error: "Failed to finalize media processing" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: mediaId,
        processing_status: "ready",
        display_order: mediaRecord.display_order,
      },
      { status: 201 }
    );
  } catch {
    // Best-effort cleanup on unexpected exception
    if (originalUploaded) {
      await serviceClient.storage.from("listing-originals").remove([originalPath]).catch(() => {});
    }
    if (uploadedDerivatives.length > 0) {
      await serviceClient.storage.from("listing-derivatives").remove(uploadedDerivatives).catch(() => {});
    }
    try {
      await serviceClient.from("listing_media").delete().eq("id", mediaId);
    } catch {
      // Ignored during best-effort fallback
    }

    return NextResponse.json(
      {
        id: mediaId,
        processing_status: "failed",
        error: "Image processing encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}

