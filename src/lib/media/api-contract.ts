import { NextResponse } from "next/server";
import { z } from "zod";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { isSellerWriteMaintenanceEnabled, SELLER_WRITE_MAINTENANCE_MESSAGE } from "@/lib/maintenance/seller-writes";
import { checkPolicyAcceptanceStatus } from "@/lib/compliance/policy-acceptance";
import { logger } from "@/lib/logger";
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
  "MEDIA_SERVICE_UNAVAILABLE",
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
  MEDIA_UPLOAD_FAILED: 500,
  MEDIA_PROCESSING_FAILED: 422,
  MEDIA_DELETE_FAILED: 500,
  MEDIA_REORDER_FAILED: 422,
  COVER_UPDATE_FAILED: 422,
  SELLER_WRITES_DISABLED: 503,
  MEDIA_SERVICE_UNAVAILABLE: 503,
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
  MEDIA_SERVICE_UNAVAILABLE: "Media service is temporarily unavailable. Please try again later.",
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
  mediaIds: z
    .array(z.string().uuid("Invalid media ID format"))
    .min(1, "At least one media ID is required")
    .max(8, "Cannot exceed 8 media items"),
});

export const SetCoverPhotoRequestSchema = z.object({
  mediaId: z.string().uuid("Invalid media ID format"),
});

export interface MediaApiErrorResponse {
  code: MediaErrorCode;
  message: string;
  error?: string;
  media?: {
    id: string;
    processingStatus: "failed";
  };
}

/**
 * Creates a sanitized, typed JSON error response.
 * Strictly guarantees that no Postgres SQLSTATE, table names, storage paths,
 * bucket names, or tokens are leaked to clients.
 */
export function mediaApiError(
  code: MediaErrorCode,
  customMessage?: string,
  extraOrStatus?: number | { media?: { id: string; processingStatus: "failed" } }
): NextResponse<MediaApiErrorResponse> {
  const status =
    typeof extraOrStatus === "number"
      ? extraOrStatus
      : ERROR_CODE_TO_HTTP_STATUS[code] || 500;
  let safeMessage = customMessage || DEFAULT_ERROR_MESSAGES[code] || "An unexpected error occurred.";

  // Defensive sanitization: scrub SQLSTATE codes, table names, and internal paths.
  // Uses precise patterns to avoid false positives on normal error text.
  if (
    /SQLSTATE\b|\b[0-9]{2}[A-Z0-9]{3}\b|public\.|auth\.|storage\.|listing-originals|listing-derivatives|sb_secret_|\bBearer\s|\beyJ[A-Za-z0-9]/i.test(
      safeMessage
    )
  ) {
    safeMessage = DEFAULT_ERROR_MESSAGES[code] || "An unexpected error occurred.";
  }

  const body: MediaApiErrorResponse = {
    code,
    message: safeMessage,
    error: safeMessage,
  };

  if (typeof extraOrStatus === "object" && extraOrStatus?.media) {
    body.media = extraOrStatus.media;
  }

  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Centralized RPC sentinel mapper.
 * Maps known stable database sentinels to appropriate MediaErrorCodes.
 * Unknown or unclassified errors fall back to the operation-specific fallbackCode.
 */
export function mapRpcErrorToMediaError(
  rpcError: { message?: string; code?: string } | null,
  fallbackCode: MediaErrorCode
): NextResponse<MediaApiErrorResponse> {
  const msg = rpcError?.message || "";
  for (const code of MEDIA_ERROR_CODES) {
    if (msg.includes(code)) {
      return mediaApiError(code);
    }
  }
  return mediaApiError(fallbackCode);
}

export type SellerMediaGuardResult =
  | { allowed: true; listing: { id: string; seller_id: string; status: string; revision: number; cover_photo_id: string | null } }
  | { allowed: false; response: NextResponse<MediaApiErrorResponse> };

/**
 * Shared mutation guard for all media write operations.
 * Enforces:
 * 1. Seller-write maintenance mode check
 * 2. Active user account check (outages map to 503 MEDIA_SERVICE_UNAVAILABLE)
 * 3. Current legal policy acceptance (outages map to 503 MEDIA_SERVICE_UNAVAILABLE)
 * 4. Listing ownership and existence (conceals non-owner as 404 LISTING_NOT_FOUND)
 * 5. Mutable listing status matrix
 */
export async function verifySellerMediaMutationGuard(
  client: SupabaseClient<Database>,
  user: User,
  listingId: string
): Promise<SellerMediaGuardResult> {
  // 1. Seller write maintenance check
  if (isSellerWriteMaintenanceEnabled()) {
    return {
      allowed: false,
      response: mediaApiError("SELLER_WRITES_DISABLED"),
    };
  }

  // 2. Active account status check (column is `account_status`, not `status`)
  const { data: userAccount, error: accountError } = await client
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) {
    return {
      allowed: false,
      response: mediaApiError("MEDIA_SERVICE_UNAVAILABLE"),
    };
  }

  if (!userAccount || userAccount.account_status !== "active") {
    return {
      allowed: false,
      response: mediaApiError("ACCOUNT_RESTRICTED"),
    };
  }

  // 3. Current policy acceptance check
  const policyStatus = await checkPolicyAcceptanceStatus(client);
  if (policyStatus.status === "error") {
    return {
      allowed: false,
      response: mediaApiError("MEDIA_SERVICE_UNAVAILABLE"),
    };
  }
  if (policyStatus.status === "stale") {
    return {
      allowed: false,
      response: mediaApiError("POLICY_ACCEPTANCE_REQUIRED"),
    };
  }

  // 4. Listing ownership and existence
  //    Separate error semantics: DB/infrastructure error -> 503, missing/RLS-miss -> 404
  const listingQuery = client
    .from("listings")
    .select("id, seller_id, status, revision, cover_photo_id")
    .eq("id", listingId);

  const { data: listing, error: listingError } =
    typeof (listingQuery as unknown as { maybeSingle?: () => Promise<unknown> }).maybeSingle === "function"
      ? await (listingQuery as unknown as { maybeSingle: () => Promise<{ data: { id: string; seller_id: string; status: string; revision: number; cover_photo_id: string | null } | null; error: unknown }> }).maybeSingle()
      : await (listingQuery as unknown as { single: () => Promise<{ data: { id: string; seller_id: string; status: string; revision: number; cover_photo_id: string | null } | null; error: unknown }> }).single();

  if (listingError) {
    // Infrastructure / DB query failure -> 503, not 404
    logger.warn("media.listing_lookup_failed", {
      operation: "verifySellerMediaMutationGuard",
      error_code: typeof listingError === "object" && listingError !== null && "code" in listingError ? String((listingError as { code: string }).code) : "UNKNOWN",
    });
    return {
      allowed: false,
      response: mediaApiError("MEDIA_SERVICE_UNAVAILABLE"),
    };
  }

  if (!listing || listing.seller_id !== user.id) {
    // Genuinely absent or non-owner -> 404
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

export type SafeMediaSnapshotResult =
  | {
      ok: true;
      snapshot: SafeMediaSnapshotResponse;
    }
  | {
      ok: false;
      code: "LISTING_NOT_FOUND" | "MEDIA_SERVICE_UNAVAILABLE";
    };

/**
 * Builds an authoritative, safe seller media snapshot.
 * Fails closed on database / infrastructure errors (MEDIA_SERVICE_UNAVAILABLE).
 * Returns LISTING_NOT_FOUND if the listing does not exist under caller RLS.
 * Never includes storage paths, uploader_id, processing_error, bucket names,
 * pin_code, landmark, or service metadata.
 */
export async function buildSafeMediaSnapshot(
  client: SupabaseClient<Database>,
  listingId: string,
  uploadedMediaId?: string
): Promise<SafeMediaSnapshotResult> {
  const listingQuery = client
    .from("listings")
    .select("id, status, revision, cover_photo_id")
    .eq("id", listingId);

  const { data: listing, error: listingError } =
    typeof (listingQuery as unknown as { maybeSingle?: () => Promise<unknown> }).maybeSingle === "function"
      ? await (listingQuery as unknown as { maybeSingle: () => Promise<{ data: { id: string; status: string; revision: number; cover_photo_id: string | null } | null; error: unknown }> }).maybeSingle()
      : await (listingQuery as unknown as { single: () => Promise<{ data: { id: string; status: string; revision: number; cover_photo_id: string | null } | null; error: unknown }> }).single();

  if (listingError) {
    logger.warn("media.snapshot_listing_lookup_failed", {
      operation: "buildSafeMediaSnapshot",
      error_code: typeof listingError === "object" && listingError !== null && "code" in listingError ? String((listingError as { code: string }).code) : "UNKNOWN",
    });
    return { ok: false, code: "MEDIA_SERVICE_UNAVAILABLE" };
  }

  if (!listing) {
    return { ok: false, code: "LISTING_NOT_FOUND" };
  }

  const mediaQuery = client
    .from("listing_media")
    .select("id, listing_id, width, height, display_order, processing_status, created_at")
    .eq("listing_id", listingId);

  const orderedQuery =
    typeof (mediaQuery as unknown as { order?: (...args: unknown[]) => unknown }).order === "function"
      ? (mediaQuery as unknown as { order: (col: string, opt: { ascending: boolean }) => { order: (col: string, opt: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> } })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true })
      : mediaQuery;

  const { data: mediaRows, error: mediaError } = await (orderedQuery as unknown as Promise<{ data: unknown[] | null; error: unknown }>);

  if (mediaError) {
    logger.warn("media.snapshot_media_lookup_failed", {
      operation: "buildSafeMediaSnapshot",
      error_code: typeof mediaError === "object" && mediaError !== null && "code" in mediaError ? String((mediaError as { code: string }).code) : "UNKNOWN",
    });
    return { ok: false, code: "MEDIA_SERVICE_UNAVAILABLE" };
  }

  const safeRows = Array.isArray(mediaRows) ? mediaRows : [];

  const safeMedia: SafeMediaItem[] = (safeRows as Array<Record<string, unknown>>).map((m) => ({
    id: String(m.id),
    listingId: String(m.listing_id),
    width: typeof m.width === "number" ? m.width : null,
    height: typeof m.height === "number" ? m.height : null,
    displayOrder: Number(m.display_order ?? 0),
    processingStatus: String(m.processing_status),
    createdAt: String(m.created_at),
    isCover: listing.cover_photo_id === m.id,
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

  return { ok: true, snapshot: response };
}
