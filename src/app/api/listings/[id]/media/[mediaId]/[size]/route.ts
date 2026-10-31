import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/request-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { mediaApiError } from "@/lib/media/api-contract";
import { planLegacyMediaStorageCleanup } from "@/lib/media/legacy-storage-cleanup";

/**
 * GET /api/listings/[id]/media/[mediaId]/[size]
 *
 * Media derivative delivery route.
 *
 * Modes:
 * 1. Public active derivative:
 *    - Browser/public callers receive 302 redirect with public cache-control.
 * 2. Private seller derivative:
 *    - Authorizes caller via cookie or Bearer (owner or active staff at AAL2).
 *    - Non-owners or unauthenticated callers receive 404 LISTING_NOT_FOUND.
 * 3. V2 sealed or unexpected Storage paths: fail closed until trusted DB-
 *    registered SHA-256 verification is wired into the serving route.
 * 4. Native JSON mode (Accept: application/json):
 *    - Prevents Bearer tokens from being forwarded across redirects to storage origins.
 *    - Returns short-lived (60s) signed URL with Cache-Control: no-store.
 *    - Rejects 'original' requests in JSON mode (only thumb, medium, large permitted).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string; size: string }> }
) {
  const { id: listingId, mediaId, size } = await params;

  const validSizes = ["thumb", "medium", "large", "original"];
  if (!validSizes.includes(size)) {
    return mediaApiError("INVALID_MEDIA_REQUEST", `Invalid size parameter: ${size}`, 400);
  }

  const acceptHeader = request.headers.get("accept") || "";
  const isJsonMode = acceptHeader.includes("application/json");

  // Native mobile JSON contract explicitly forbids access to "original"
  if (isJsonMode && size === "original") {
    return mediaApiError(
      "INVALID_MEDIA_REQUEST",
      "Original media is not accessible via native API.",
      400
    );
  }

  const serviceClient = createServiceRoleClient();

  // Check if listing is publicly visible
  const { data: isPublicVisible, error: visibilityError } = await serviceClient.rpc(
    "is_listing_publicly_visible",
    { listing_id: listingId }
  );

  if (visibilityError) {
    // If error checking visibility, treat as private
  }

  // Original files are NEVER accessible publicly; strictly owner or staff.
  // Private/draft listings require authentication.
  // JSON mode always goes through authorized flow to prevent leaking unauthenticated redirects.
  if (size === "original" || !isPublicVisible || isJsonMode) {
    // Authenticate caller (Bearer authoritative; falls back to cookie)
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      // Conceal private listing existence from unauthenticated callers
      return mediaApiError("LISTING_NOT_FOUND");
    }

    const { user, client } = authResult.context;

    // Check listing ownership
    const { data: listing, error: listingError } = await serviceClient
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return mediaApiError("LISTING_NOT_FOUND");
    }

    const isOwner = listing.seller_id === user.id;
    let isAuthorizedStaff = false;

    if (!isOwner) {
      const { data: staffData, error: staffError } = await client
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: aalData, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      isAuthorizedStaff =
        !staffError && !aalError && !!staffData &&
        ["administrator", "moderator"].includes(staffData.role) &&
        aalData?.currentLevel === "aal2";
    }

    // If caller is neither the owner nor authorized staff, deny with 404
    // Note: if listing is public and caller is just a normal user requesting JSON mode,
    // they can view ready derivatives (thumb/medium/large), but not original.
    if (!isOwner && !isAuthorizedStaff && (size === "original" || !isPublicVisible)) {
      return mediaApiError("LISTING_NOT_FOUND");
    }

    // Restricted delivery uses the same authoritative account-status check as
    // the seller media guard. Public buyer derivatives need no additional query.
    if (isOwner || isAuthorizedStaff) {
      const { data: account, error: accountError } = await client
        .from("user_accounts")
        .select("account_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (accountError || account?.account_status !== "active") {
        return mediaApiError("LISTING_NOT_FOUND");
      }
    }

    // Look up media row
    const { data: media, error: mediaError } = await serviceClient
      .from("listing_media")
      .select(
        "id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status"
      )
      .eq("id", mediaId)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (mediaError || !media) {
      return mediaApiError("MEDIA_NOT_FOUND");
    }

    // Public buyers may only receive ready derivatives, including in JSON mode.
    if (!isOwner && !isAuthorizedStaff && media.processing_status !== "ready") {
      return mediaApiError("MEDIA_NOT_FOUND");
    }

    // B2: an unverified signed URL would bypass exact-byte checks for sealed
    // objects. Until the authoritative V2 registry and verified byte-serving
    // transport are deployed, never sign sealed or unexpected media keys.
    // Validate ALL four paths to reject mixed-version records as well.
    if (planLegacyMediaStorageCleanup(listingId, mediaId, media).kind !== "legacy") {
      return mediaApiError("MEDIA_NOT_FOUND");
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
        return mediaApiError("INVALID_MEDIA_REQUEST");
    }

    if (!path) {
      return mediaApiError("MEDIA_NOT_FOUND", "Media derivative not available.");
    }

    const { data: signedData, error: signError } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(path, expirySeconds);

    if (signError || !signedData?.signedUrl) {
      return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to generate media URL.", 500);
    }

    // Native JSON mode response
    if (isJsonMode) {
      return NextResponse.json(
        {
          url: signedData.signedUrl,
          expiresIn: expirySeconds,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Browser redirect for private/owner access
    return NextResponse.redirect(signedData.signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Publicly visible derivative access (thumb, medium, large) for browser callers
  const { data: media, error: mediaError } = await serviceClient
    .from("listing_media")
    .select(
      "id, listing_id, original_storage_path, thumbnail_storage_path, medium_storage_path, large_storage_path, processing_status"
    )
    .eq("id", mediaId)
    .eq("listing_id", listingId)
    .eq("processing_status", "ready")
    .maybeSingle();

  if (mediaError || !media) {
    return mediaApiError("MEDIA_NOT_FOUND");
  }

  // Public redirects must never bypass V2 registered SHA-256 verification.
  // Fail closed if ANY path is sealed/unfamiliar, including source originals
  // on an otherwise legacy-looking set of derivatives.
  if (planLegacyMediaStorageCleanup(listingId, mediaId, media).kind !== "legacy") {
    return mediaApiError("MEDIA_NOT_FOUND");
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
    return mediaApiError("MEDIA_NOT_FOUND", "Media derivative not available.");
  }

  // Generate 1-hour signed URL for public derivative
  const { data: signedData, error: signError } = await serviceClient.storage
    .from("listing-derivatives")
    .createSignedUrl(derivativePath, 3600);

  if (signError || !signedData?.signedUrl) {
    return mediaApiError("MEDIA_UPLOAD_FAILED", "Failed to generate media URL.", 500);
  }

  return NextResponse.redirect(signedData.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
