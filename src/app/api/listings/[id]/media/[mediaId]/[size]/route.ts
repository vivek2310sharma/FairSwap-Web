import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string; size: string }> }
) {
  const { id: listingId, mediaId, size } = await params;

  // 1. Authentication required (No anonymous access in 1.3)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Authorization: Caller must be owner or staff with moderator/administrator role
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const isOwner = listing.seller_id === user.id;

  // Check if staff if not owner
  let isAuthorizedStaff = false;
  if (!isOwner) {
    const { data: staffData } = await supabase.rpc("is_active_staff_aal2", {
      required_role: "moderator",
    });
    isAuthorizedStaff = !!staffData;
  }

  if (!isOwner && !isAuthorizedStaff) {
    return NextResponse.json({ error: "Forbidden: Not authorized to access media" }, { status: 403 });
  }

  // 3. Fetch media record
  const { data: media, error: mediaError } = await supabase
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
      if (!isAuthorizedStaff && !isOwner) {
        return NextResponse.json({ error: "Forbidden: Original access restricted" }, { status: 403 });
      }
      bucket = "listing-originals";
      path = media.original_storage_path;
      break;
    default:
      return NextResponse.json({ error: `Invalid size parameter: ${size}` }, { status: 400 });
  }

  if (!path) {
    return NextResponse.json({ error: "Media path not ready or available" }, { status: 404 });
  }

  // 4. Generate signed URL via service-role client
  const serviceClient = createServiceRoleClient();
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
