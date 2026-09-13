import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string; size: string }> }
) {
  const { id: listingId, mediaId, size } = await params;

  if (!["thumb", "medium", "large", "original"].includes(size)) {
    return NextResponse.json({ error: `Invalid size parameter: ${size}` }, { status: 400 });
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  // Check if listing is publicly visible
  const { data: isPublicVisible } = await serviceClient.rpc("is_listing_publicly_visible", {
    listing_id: listingId,
  });

  // Original files are NEVER accessible publicly; strictly owner or staff
  if (size === "original" || !isPublicVisible) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Do not leak existence of private/draft listing to unauthenticated callers
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { data: listing, error: listingError } = await serviceClient
      .from("listings")
      .select("id, seller_id")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isOwner = listing.seller_id === user.id;
    let isAuthorizedStaff = false;

    if (!isOwner) {
      const { data: staffData } = await supabase.rpc("is_active_staff_aal2", {
        required_role: "moderator",
      });
      isAuthorizedStaff = !!staffData;
    }

    if (!isOwner && !isAuthorizedStaff) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Caller is authorized owner or staff
    const { data: media, error: mediaError } = await serviceClient
      .from("listing_media")
      .select("id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status")
      .eq("id", mediaId)
      .eq("listing_id", listingId)
      .single();

    if (mediaError || !media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    let bucket: string;
    let path: string | null = null;
    const expirySeconds = isAuthorizedStaff ? 300 : 60;

    switch (size) {
      case "thumb":
        bucket = "listing-derivatives";
        path = media.thumbnail_storage_path;
        break;
      case "medium":
        bucket = "listing-derivatives";
        path = media.medium_storage_path;
        break;
      case "large":
        bucket = "listing-derivatives";
        path = media.large_storage_path;
        break;
      case "original":
        bucket = "listing-originals";
        path = media.original_storage_path;
        break;
      default:
        return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: "Media path not ready or available" }, { status: 404 });
    }

    const { data: signedData, error: signError } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(path, expirySeconds);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
    }

    return NextResponse.redirect(signedData.signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Publicly visible derivative access (thumb, medium, large)
  const { data: media, error: mediaError } = await serviceClient
    .from("listing_media")
    .select("id, listing_id, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status")
    .eq("id", mediaId)
    .eq("listing_id", listingId)
    .eq("processing_status", "ready")
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  let derivativePath: string | null = null;
  switch (size) {
    case "thumb":
      derivativePath = media.thumbnail_storage_path;
      break;
    case "medium":
      derivativePath = media.medium_storage_path;
      break;
    case "large":
      derivativePath = media.large_storage_path;
      break;
  }

  if (!derivativePath) {
    return NextResponse.json({ error: "Media derivative not available" }, { status: 404 });
  }

  // Generate 1-hour signed URL for public derivative
  const { data: signedData, error: signError } = await serviceClient.storage
    .from("listing-derivatives")
    .createSignedUrl(derivativePath, 3600);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate media URL" }, { status: 500 });
  }

  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
