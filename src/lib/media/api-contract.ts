import { NextResponse } from "next/server";
import { z } from "zod";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { isSellerWriteMaintenanceEnabled, SELLER_WRITE_MAINTENANCE_MESSAGE } from "@/lib/maintenance/seller-writes";
import { checkPolicyAcceptanceStatus } from "@/lib/compliance/policy-acceptance";
import type { Database } from "@/types/database";

export const MEDIA_ERROR_CODES = [
  "UNAUTHENTICATED",
  "ACCOUNT_RESTRICTED",
  "POLICY_ACCEPTANCE_REQUIRED",
  "LISTING_NOT_FOUND",
  "MEDIA_NOT_FOUND",
  "LISTING_MEDIA_NOT_EDITABLE",
  "PHOTO_LIMIT_REACHED",
  "PAYLOAD_TOO_LARGE",
  "FILE_TOO_LARGE",
  "INVALID_IMAGE_FORMAT",
  "INVALID_MEDIA_REQUEST",
  "MEDIA_UPLOAD_FAILED",
  "MEDIA_PROCESSING_FAILED",
  "MEDIA_DELETE_FAILED",
  "MEDIA_REORDER_FAILED",
  "COVER_UPDATE_FAILED",
  "SELLER_WRITES_DISABLED",
] as const;

export type MediaErrorCode = (typeof MEDIA_ERROR_CODES)[number];

export const ERROR_CODE_TO_HTTP_STATUS: Record<MediaErrorCode, number> = {
  UNAUTHENTICATED: 401,
  ACCOUNT_RESTRICTED: 403,
  POLICY_ACCEPTANCE_REQUIRED: 403,
  LISTING_NOT_FOUND: 404,
  MEDIA_NOT_FOUND: 404,
  LISTING_MEDIA_NOT_EDITABLE: 409,
  PHOTO_LIMIT_REACHED: 409,
  PAYLOAD_TOO_LARGE: 413,
  FILE_TOO_LARGE: 413,
  INVALID_IMAGE_FORMAT: 415,
  INVALID_MEDIA_REQUEST: 400,
  MEDIA_PROCESSING_FAILED: 422,
  MEDIA_UPLOAD_FAILED: 500,
  MEDIA_DELETE_FAILED: 500,
  MEDIA_REORDER_FAILED: 400,
  COVER_UPDATE_FAILED: 400,
  SELLER_WRITES_DISABLED: 503,
};

export const DEFAULT_ERROR_MESSAGES: Record<MediaErrorCode, string> = {
  UNAUTHENTICATED: "Authentication required.",
  ACCOUNT_RESTRICTED: "Your account is currently restricted from managing listings.",
  POLICY_ACCEPTANCE_REQUIRED: "Policy acceptance required before managing media.",
  LISTING_NOT_FOUND: "Listing not found.",
  MEDIA_NOT_FOUND: "Media asset not found.",
  LISTING_MEDIA_NOT_EDITABLE: "Photos cannot be modified in the listing's current status.",
  PHOTO_LIMIT_REACHED: "Maximum 8 photos allowed per listing.",
  PAYLOAD_TOO_LARGE: "Payload too large. Maximum request size is 6 MB.",
  FILE_TOO_LARGE: "File size exceeds 5 MB limit.",
  INVALID_IMAGE_FORMAT: "Invalid image format. Only JPEG, PNG, and WebP images are allowed.",
  INVALID_MEDIA_REQUEST: "Invalid media request.",
  MEDIA_UPLOAD_FAILED: "Failed to upload image. Please try again.",
  MEDIA_PROCESSING_FAILED: "Image processing failed. Please try a different image.",
  MEDIA_DELETE_FAILED: "Failed to delete media asset. Please try again.",
  MEDIA_REORDER_FAILED: "Failed to reorder photos. Please try again.",
  COVER_UPDATE_FAILED: "Failed to update cover photo. Please try again.",
  SELLER_WRITES_DISABLED: SELLER_WRITE_MAINTENANCE_MESSAGE,
};

export interface SafeMediaItem {
  id: string;
  listingId: string;
  width: number | null;
  height: number | null;
  displayOrder: number;
  processingStatus: string;
  createdAt: string;
  isCover: boolean;
}

export interface SafeListingSnapshot {
  id: string;
  status: string;
  revision: number;
  coverPhotoId: string | null;
}

export interface SafeMediaSnapshotResponse {
  listing: SafeListingSnapshot;
  media: SafeMediaItem[];
  uploadedMediaId?: string;
}

export const ALLOWED_MEDIA_MUTATION_STATUSES = [
  "draft",
  "rejected",
  "active",
  "reserved",
  "paused",
  "pending_review",
] as const;

export const DENIED_MEDIA_MUTATION_STATUSES = [
  "expired",
  "sold",
  "removed",
] as const;

export const ReorderMediaRequestSchema = z.object({
  mediaIds: z.array(z.string().uuid("Invalid media ID format")).min(1, "At least one media ID is required").max(8, "Cannot exceed 8 media items"),
});

export const SetCoverPhotoRequestSchema = z.object({
  mediaId: z.string().uuid("Invalid media ID format"),
});

/**
 * Creates a sanitized, typed JSON error response.
 * Strictly guarantees that no Postgres SQLSTATE, table names, storage paths,
 * bucket names, or tokens are leaked to clients.
 */
export function mediaApiError(
  code: MediaErrorCode,
  customMessage?: string,
  statusOverride?: number,
  extra?: Record<string, unknown>
) {
  const status = statusOverride ?? ERROR_CODE_TO_HTTP_STATUS[code] ?? 500;
  let message = customMessage ?? DEFAULT_ERROR_MESSAGES[code] ?? "An error occurred";

  // Sanitize message to never leak raw internals
  if (
    message.includes("SQLSTATE") ||
    message.includes("PostgREST") ||
    message.includes("listing-originals") ||
    message.includes("listing-derivatives") ||
    message.includes("service_role") ||
    message.includes("Bearer") ||
    message.includes("eyJ")
  ) {
    message = DEFAULT_ERROR_MESSAGES[code] ?? "A server error occurred. Please try again.";
  }

  return NextResponse.json(
    {
      code,
      message,
      error: message,
      ...(extra || {}),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export interface SellerMediaGuardSuccess {
  allowed: true;
  listing: {
    id: string;
    seller_id: string | null;
    status: string;
    revision: number;
    cover_photo_id: string | null;
  };
}

export interface SellerMediaGuardFailure {
  allowed: false;
  response: NextResponse;
}

export type SellerMediaGuardResult = SellerMediaGuardSuccess | SellerMediaGuardFailure;

/**
 * Comprehensive preflight mutation guard for seller media operations:
 * 1. Seller-write maintenance mode check
 * 2. Active account status check
 * 3. Current policy acceptance check
 * 4. Listing ownership check (returns 404 for missing or non-owner to conceal existence)
 * 5. Media-editable status check
 */
export async function verifySellerMediaMutationGuard(
  client: SupabaseClient<Database>,
  user: User,
  listingId: string
): Promise<SellerMediaGuardResult> {
  // 1. Seller-write maintenance
  if (isSellerWriteMaintenanceEnabled()) {
    return {
      allowed: false,
      response: mediaApiError("SELLER_WRITES_DISABLED"),
    };
  }

  // 2. Active account status
  const { data: accountData, error: accountError } = await client
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError || !accountData || accountData.account_status !== "active") {
    return {
      allowed: false,
      response: mediaApiError("ACCOUNT_RESTRICTED"),
    };
  }

  // 3. Current policy acceptance
  const policyCheck = await checkPolicyAcceptanceStatus(client);
  if (policyCheck.status !== "current") {
    return {
      allowed: false,
      response: mediaApiError("POLICY_ACCEPTANCE_REQUIRED"),
    };
  }

  // 4. Listing ownership and existence
  const { data: listing, error: listingError } = await client
    .from("listings")
    .select("id, seller_id, status, revision, cover_photo_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing || listing.seller_id !== user.id) {
    // Conceal non-owner listings as 404 LISTING_NOT_FOUND
    return {
      allowed: false,
      response: mediaApiError("LISTING_NOT_FOUND"),
    };
  }

  // 5. Allowed listing status check
  const isAllowedStatus = (ALLOWED_MEDIA_MUTATION_STATUSES as readonly string[]).includes(
    listing.status
  );

  if (!isAllowedStatus) {
    return {
      allowed: false,
      response: mediaApiError("LISTING_MEDIA_NOT_EDITABLE"),
    };
  }

  return {
    allowed: true,
    listing,
  };
}

/**
 * Builds an authoritative, safe seller media snapshot.
 * Never includes storage paths, uploader_id, processing_error, bucket names,
 * pin_code, landmark, or service metadata.
 */
export async function buildSafeMediaSnapshot(
  client: SupabaseClient<Database>,
  listingId: string,
  uploadedMediaId?: string
): Promise<SafeMediaSnapshotResponse | null> {
  const { data: listing, error: listingError } = await client
    .from("listings")
    .select("id, status, revision, cover_photo_id")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return null;
  }

  const { data: mediaRows, error: mediaError } = await client
    .from("listing_media")
    .select("id, listing_id, width, height, display_order, processing_status, created_at")
    .eq("listing_id", listingId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (mediaError || !mediaRows) {
    return null;
  }

  const safeMedia: SafeMediaItem[] = mediaRows.map((m) => ({
    id: m.id,
    listingId: m.listing_id,
    width: m.width,
    height: m.height,
    displayOrder: m.display_order,
    processingStatus: m.processing_status,
    createdAt: m.created_at,
    isCover: m.id === listing.cover_photo_id,
  }));

  const response: SafeMediaSnapshotResponse = {
    listing: {
      id: listing.id,
      status: listing.status,
      revision: listing.revision,
      coverPhotoId: listing.cover_photo_id,
    },
    media: safeMedia,
  };

  if (uploadedMediaId) {
    response.uploadedMediaId = uploadedMediaId;
  }

  return response;
}
