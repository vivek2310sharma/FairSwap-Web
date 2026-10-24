import { z } from "zod";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "reserved"
  | "sold"
  | "rejected"
  | "paused"
  | "expired"
  | "removed";

export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";

export type ListingPriceType = "fixed" | "negotiable" | "free";

export type AttributeValueType = "text" | "number" | "select" | "boolean";

export type MediaProcessingStatus = "uploading" | "processing" | "ready" | "failed";

export type TransitionActorKind = "seller" | "moderator" | "system";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryAttribute {
  id: string;
  category_id: string;
  name: string;
  label: string;
  value_type: AttributeValueType;
  is_required: boolean;
  is_filterable: boolean;
  options: string[] | null;
  validation_rules: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

// Form/reference projections also accept the owner-scoped minimal RPC result.
// Full database rows remain assignable; no missing timestamps/flags are fabricated.
export type ListingCategoryReference = Pick<Category, "id" | "name" | "is_active">;
export type ListingAttributeReference = Pick<CategoryAttribute,
  "id" | "category_id" | "name" | "label" | "value_type" | "is_required" |
  "options" | "validation_rules" | "sort_order">;

export interface City {
  id: string;
  name: string;
  state: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Locality {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface PostalOfficeInfo {
  office_name: string;
  office_type: string | null;
  delivery_status: string | null;
  division: string | null;
  region: string | null;
  circle: string | null;
  taluk: string | null;
  district: string;
  state: string;
}

export interface PincodeDistrictInfo {
  name: string;
  city_id: string | null;
}

export interface PincodeLocalityInfo {
  id: string;
  name: string;
  slug: string;
  city_id: string;
  city_name: string;
  district: string;
  state: string;
}

export interface PincodeLookupSuccess {
  success: true;
  pincode: string;
  state: string;
  district: string | null;
  city: string | null;
  city_id: string | null;
  districts: PincodeDistrictInfo[];
  localities: PincodeLocalityInfo[];
  postal_offices: PostalOfficeInfo[];
}

export interface PincodeLookupFailure {
  success: false;
  error:
    | "INVALID_PINCODE"
    | "PINCODE_NOT_FOUND"
    | "CONFLICTING_POSTAL_STATES"
    | "PINCODE_ADMIN_DATA_UNAVAILABLE"
    | "FETCH_ERROR";
  message: string;
}

export type PincodeLookupResult = PincodeLookupSuccess | PincodeLookupFailure;

export interface Listing {
  id: string;
  seller_id: string;
  slug: string;
  category_id: string;
  city_id: string;
  locality_id: string | null;
  title: string;
  description: string | null;
  condition: ListingCondition | null;
  price_type: ListingPriceType | null;
  price_paise: number | null;
  pin_code: string | null;
  landmark: string | null;
  category_attributes: Record<string, unknown>;
  status: ListingStatus;
  revision: number;
  renewal_count: number;
  rejection_reason: string | null;
  removal_reason: string | null;
  removed_by: string | null;
  cover_photo_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  sold_at: string | null;
}

export interface ListingMedia {
  id: string;
  listing_id: string;
  uploader_id: string;
  original_storage_path: string | null;
  thumbnail_storage_path: string | null;
  medium_storage_path: string | null;
  large_storage_path: string | null;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  display_order: number;
  processing_status: MediaProcessingStatus;
  processing_error: string | null;
  created_at: string;
}

export interface ListingStatusTransition {
  id: string;
  listing_id: string;
  from_status: ListingStatus | null;
  to_status: ListingStatus;
  actor_id: string | null;
  actor_kind: TransitionActorKind;
  reason: string | null;
  revision_at_transition: number;
  created_at: string;
}

export interface PublicListingCard {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string | null;
  condition: ListingCondition | null;
  price_type: ListingPriceType | null;
  price_paise: number | null;
  category_attributes: Record<string, unknown>;
  status: ListingStatus;
  created_at: string;
  published_at: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
  city: {
    id: string;
    name: string;
    state: string;
  };
  locality: {
    id: string;
    name: string;
  } | null;
  cover_photo: {
    id: string;
    thumbnail_storage_path: string | null;
    medium_storage_path: string | null;
    width: number | null;
    height: number | null;
  } | null;
}

export interface SearchListingsResult {
  items: PublicListingCard[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface Favourite {
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: PublicListingCard | null;
}

// Validation Schemas
export const draftListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title must be at most 150 characters"),
  category_id: z.string().uuid("Invalid category ID"),
  city_id: z.string().uuid("Invalid city ID").optional().nullable(),
  locality_id: z.string().uuid("Invalid locality ID").optional().nullable(),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional().nullable(),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional().nullable(),
  price_type: z.enum(["fixed", "negotiable", "free"]).optional().nullable(),
  price_paise: z.number().int().min(0).max(100000000).optional().nullable(),
  pin_code: z.string().regex(/^\d{6}$/, "PIN code must be exactly 6 digits").optional().nullable(),
  landmark: z.string().max(200, "Landmark must be at most 200 characters").optional().nullable(),
  category_attributes: z.record(z.unknown()).default({}),
});

export const submitListingSchema = draftListingSchema.extend({
  description: z
    .string({ required_error: "Description must be at least 10 characters", invalid_type_error: "Description must be at least 10 characters" })
    .min(10, "Description must be at least 10 characters")
    .max(5000),
  pin_code: z
    .string({ required_error: "PIN code is required", invalid_type_error: "PIN code is required" })
    .regex(/^\d{6}$/, "PIN code must be exactly 6 numeric digits"),
  locality_id: z.string().uuid("Invalid locality ID").optional().nullable(),
  city_id: z
    .string({ required_error: "City is required", invalid_type_error: "City is required" })
    .uuid("City is required"),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"], {
    required_error: "Condition is required",
    invalid_type_error: "Condition is required",
  }),
  price_type: z.enum(["fixed", "negotiable", "free"], {
    required_error: "Price type is required",
    invalid_type_error: "Price type is required",
  }),
  price_paise: z.number().int().min(0).max(100000000).optional().nullable(),
}).refine(
  (data) => {
    if (data.price_type !== "free") {
      return data.price_paise !== null && data.price_paise !== undefined && data.price_paise > 0;
    }
    return true;
  },
  {
    message: "Price in rupees is required unless the item is marked free",
    path: ["price_paise"],
  }
);

export const searchSortOptionSchema = z.enum(["newest", "price_asc", "price_desc", "relevance"]);
export type SearchSortOption = z.infer<typeof searchSortOptionSchema>;

export function getEffectiveSort(q?: string, sortParam?: string): SearchSortOption {
  const hasKeyword = Boolean(q && q.trim().length > 0);

  if (!hasKeyword) {
    // Relevance is not applicable without a keyword.
    // If sortParam is 'relevance', normalize to 'newest'.
    if (sortParam === "price_asc" || sortParam === "price_desc" || sortParam === "newest") {
      return sortParam;
    }
    return "newest";
  }

  if (sortParam === "newest" || sortParam === "price_asc" || sortParam === "price_desc" || sortParam === "relevance") {
    return sortParam;
  }

  return "relevance";
}

export const searchFiltersSchema = z.object({
  q: z.string().max(100).optional().default(""),
  category: z.string().max(100).optional().default(""),
  city: z.string().max(100).optional().default(""),
  locality: z.string().max(100).optional().default(""),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
  price_min: z.coerce.number().min(0).max(100000000).optional(),
  price_max: z.coerce.number().min(0).max(100000000).optional(),
  sort: searchSortOptionSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const SELLER_LISTINGS_PER_PAGE = 12;

const sellerListingsBaseSchema = z.object({
  tab: z.enum(["listings", "ratings"]).catch("listings"),
  sort: z.enum(["newest", "oldest", "price_asc", "price_desc"]).catch("newest"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

// Filters are strict: a malformed filter must never silently widen the result set.
export const sellerListingsParamsSchema = sellerListingsBaseSchema.extend({
  q: z.string().trim().max(100).default(""),
  category: z.string().trim().max(100).regex(/^[a-z0-9-]*$/).default(""),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
  price_min: z.coerce.number().min(0).max(100000000).optional(),
  price_max: z.coerce.number().min(0).max(100000000).optional(),
});

export type SellerListingsParams = z.infer<typeof sellerListingsParamsSchema>;

/**
 * Parses seller-profile search params. Empty values are treated as absent; any malformed
 * filter marks the request `invalid` so callers return no results instead of broadening them.
 */
export function parseSellerListingsParams(raw: Record<string, string | undefined>): {
  params: SellerListingsParams;
  invalid: boolean;
} {
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = sellerListingsParamsSchema.safeParse(cleaned);
  if (parsed.success) {
    const { price_min, price_max } = parsed.data;
    const inverted = price_min !== undefined && price_max !== undefined && price_min > price_max;
    return { params: parsed.data, invalid: inverted };
  }
  return { params: sellerListingsParamsSchema.parse({ tab: cleaned.tab, sort: cleaned.sort, page: cleaned.page }), invalid: true };
}

export interface SellerListingsResult {
  items: PublicListingCard[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
  categories: Array<{ slug: string; name: string }>;
}

export type DraftListingInput = z.infer<typeof draftListingSchema>;
export type SubmitListingInput = z.infer<typeof submitListingSchema>;
export type SearchFilters = z.input<typeof searchFiltersSchema>;
