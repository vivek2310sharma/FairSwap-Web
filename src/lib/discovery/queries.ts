import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  Category,
  City,
  Locality,
  PublicListingCard,
  SearchFilters,
  SearchListingsResult,
  ListingCondition,
  ListingPriceType,
  ListingStatus,
} from "@/types/listing";

export interface PublicListingDetail {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string | null;
  condition: ListingCondition | null;
  price_type: ListingPriceType | null;
  price_paise: number | null;
  pin_code: string | null;
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
  seller: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    state: string | null;
    created_at: string;
  };
  media: Array<{
    id: string;
    thumbnail_storage_path: string | null;
    medium_storage_path: string | null;
    large_storage_path: string | null;
    width: number | null;
    height: number | null;
    display_order: number;
  }>;
}

interface RawListingItem {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string | null;
  condition: ListingCondition | null;
  price_type: ListingPriceType | null;
  price_paise: number | null;
  pin_code: string | null;
  category_attributes: Record<string, unknown>;
  status: ListingStatus;
  created_at: string;
  published_at: string | null;
  category: { id: string; name: string; slug: string; icon: string | null } | Array<{ id: string; name: string; slug: string; icon: string | null }>;
  city: { id: string; name: string; state: string } | Array<{ id: string; name: string; state: string }>;
  locality: { id: string; name: string } | Array<{ id: string; name: string }> | null;
  cover_photo: { id: string; thumbnail_storage_path: string | null; medium_storage_path: string | null; width: number | null; height: number | null } | Array<{ id: string; thumbnail_storage_path: string | null; medium_storage_path: string | null; width: number | null; height: number | null }> | null;
}

interface FavListingRow extends RawListingItem {
  expires_at: string | null;
  user_accounts: { account_status: string } | null;
}

export async function searchPublicListings(filters: Partial<SearchFilters> = {}): Promise<SearchListingsResult> {
  const supabase = await createClient();

  const priceMinPaise = filters.price_min !== undefined ? Math.round(filters.price_min * 100) : null;
  const priceMaxPaise = filters.price_max !== undefined ? Math.round(filters.price_max * 100) : null;

  const { data, error } = await supabase.rpc("search_public_listings", {
    query: filters.q ? filters.q.trim() : null,
    category_slug: filters.category ? filters.category.trim() : null,
    city_id: filters.city ? filters.city : null,
    locality_id: filters.locality ? filters.locality : null,
    condition: filters.condition || null,
    price_min: priceMinPaise,
    price_max: priceMaxPaise,
    sort: filters.sort || "newest",
    page: filters.page || 1,
    per_page: 12,
  });

  if (error || !data) {
    return {
      items: [],
      total_count: 0,
      page: 1,
      per_page: 12,
      total_pages: 0,
    };
  }

  return data as SearchListingsResult;
}

export async function getPublicCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description, icon, sort_order, is_active, created_at, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (data || []) as Category[];
}

export async function getPublicCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cities")
    .select("id, name, state, slug, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (data || []) as City[];
}

export async function getPublicLocalities(cityId?: string): Promise<Locality[]> {
  const supabase = await createClient();
  let query = supabase
    .from("localities")
    .select("id, city_id, name, slug, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (cityId) {
    query = query.eq("city_id", cityId);
  }

  const { data } = await query;
  return (data || []) as Locality[];
}

export async function getPublicListingBySlugOrId(slugOrId: string): Promise<{
  listing: PublicListingDetail | null;
  redirectSlug: string | null;
  isOwnerOrStaffPreview?: boolean;
}> {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  // 1. If UUID, check directly by id
  if (isUuid) {
    const { data: listingData } = await serviceClient
      .from("listings")
      .select("id, slug")
      .eq("id", slugOrId)
      .maybeSingle();

    if (listingData) {
      // Check visibility
      const { data: isVisible } = await serviceClient.rpc("is_listing_publicly_visible", {
        listing_id: listingData.id,
      });

      if (isVisible) {
        // Redirect to canonical slug URL
        return { listing: null, redirectSlug: listingData.slug };
      }
    }
  }

  // 2. Check by current slug
  const { data: listing } = await serviceClient
    .from("listings")
    .select(`
      id,
      seller_id,
      slug,
      title,
      description,
      condition,
      price_type,
      price_paise,
      pin_code,
      category_attributes,
      status,
      created_at,
      published_at,
      category:categories(id, name, slug, icon),
      city:cities(id, name, state),
      locality:localities(id, name)
    `)
    .eq("slug", slugOrId)
    .maybeSingle();

  // 3. If not found by current slug, check listing_slug_history
  if (!listing) {
    const { data: history } = await serviceClient
      .from("listing_slug_history")
      .select("listing_id")
      .eq("slug", slugOrId)
      .maybeSingle();

    if (history) {
      // Check visibility of this listing before redirecting!
      const { data: isVisible } = await serviceClient.rpc("is_listing_publicly_visible", {
        listing_id: history.listing_id,
      });

      if (isVisible) {
        // Fetch new current slug
        const { data: currentListing } = await serviceClient
          .from("listings")
          .select("slug")
          .eq("id", history.listing_id)
          .single();

        if (currentListing?.slug) {
          return { listing: null, redirectSlug: currentListing.slug };
        }
      }

      // Old slug exists but listing is NOT publicly visible: return 404, DO NOT redirect!
      return { listing: null, redirectSlug: null };
    }

    return { listing: null, redirectSlug: null };
  }

  // 4. Listing found by slug: check public visibility
  const { data: isVisible } = await serviceClient.rpc("is_listing_publicly_visible", {
    listing_id: listing.id,
  });

  let isOwnerOrStaffPreview = false;

  if (!isVisible) {
    // Check if caller is owner or staff
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const isOwner = listing.seller_id === user.id;
      let isStaff = false;
      if (!isOwner) {
        const { data: staffData } = await supabase.rpc("is_active_staff_aal2", {
          required_role: "moderator",
        });
        isStaff = !!staffData;
      }

      if (isOwner || isStaff) {
        isOwnerOrStaffPreview = true;
      } else {
        return { listing: null, redirectSlug: null };
      }
    } else {
      return { listing: null, redirectSlug: null };
    }
  }

  // Fetch seller profile
  const { data: sellerProfile } = await serviceClient
    .from("profiles")
    .select("id, display_name, avatar_url, bio, city, state, created_at")
    .eq("id", listing.seller_id)
    .single();

  // Fetch media derivatives
  const { data: mediaItems } = await serviceClient
    .from("listing_media")
    .select("id, thumbnail_storage_path, medium_storage_path, large_storage_path, width, height, display_order")
    .eq("listing_id", listing.id)
    .eq("processing_status", "ready")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const detail: PublicListingDetail = {
    id: listing.id,
    seller_id: listing.seller_id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    price_type: listing.price_type,
    price_paise: listing.price_paise,
    pin_code: listing.pin_code,
    category_attributes: listing.category_attributes as Record<string, unknown>,
    status: listing.status,
    created_at: listing.created_at,
    published_at: listing.published_at,
    category: Array.isArray(listing.category) ? listing.category[0] : listing.category,
    city: Array.isArray(listing.city) ? listing.city[0] : listing.city,
    locality: Array.isArray(listing.locality) ? listing.locality[0] : listing.locality,
    seller: sellerProfile || {
      id: listing.seller_id,
      display_name: "Seller",
      avatar_url: null,
      bio: null,
      city: null,
      state: null,
      created_at: listing.created_at,
    },
    media: mediaItems || [],
  };

  return { listing: detail, redirectSlug: null, isOwnerOrStaffPreview };
}

export async function getSellerPublicListings(
  sellerId: string,
  excludeListingId?: string
): Promise<PublicListingCard[]> {
  const serviceClient = createServiceRoleClient();

  let query = serviceClient
    .from("listings")
    .select(`
      id,
      seller_id,
      slug,
      title,
      description,
      condition,
      price_type,
      price_paise,
      pin_code,
      category_attributes,
      status,
      created_at,
      published_at,
      category:categories(id, name, slug, icon),
      city:cities(id, name, state),
      locality:localities(id, name),
      cover_photo:listing_media!listings_cover_photo_id_fkey(id, thumbnail_storage_path, medium_storage_path, width, height)
    `)
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  if (excludeListingId) {
    query = query.neq("id", excludeListingId);
  }

  const { data } = await query;
  if (!data) return [];

  return (data as unknown as RawListingItem[]).map((item) => ({
    id: item.id,
    seller_id: item.seller_id,
    slug: item.slug,
    title: item.title,
    description: item.description,
    condition: item.condition,
    price_type: item.price_type,
    price_paise: item.price_paise,
    pin_code: item.pin_code,
    category_attributes: item.category_attributes,
    status: item.status,
    created_at: item.created_at,
    published_at: item.published_at,
    category: Array.isArray(item.category) ? item.category[0] : item.category,
    city: Array.isArray(item.city) ? item.city[0] : item.city,
    locality: Array.isArray(item.locality) ? item.locality[0] : item.locality,
    cover_photo: Array.isArray(item.cover_photo) ? item.cover_photo[0] : item.cover_photo,
  }));
}

export async function getUserFavourites(userId: string): Promise<{
  activeListings: PublicListingCard[];
  unavailableIds: string[];
}> {
  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  // 1. Get user's favourite listing IDs
  const { data: favs } = await supabase
    .from("favourites")
    .select("listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!favs || favs.length === 0) {
    return { activeListings: [], unavailableIds: [] };
  }

  const listingIds = favs.map((f) => f.listing_id);

  // 2. Query listings using service client, filtering ONLY active, publicly visible ones
  const { data: listings } = await serviceClient
    .from("listings")
    .select(`
      id,
      seller_id,
      slug,
      title,
      description,
      condition,
      price_type,
      price_paise,
      pin_code,
      category_attributes,
      status,
      created_at,
      published_at,
      expires_at,
      category:categories(id, name, slug, icon),
      city:cities(id, name, state),
      locality:localities(id, name),
      cover_photo:listing_media!listings_cover_photo_id_fkey(id, thumbnail_storage_path, medium_storage_path, width, height),
      user_accounts!listings_seller_id_fkey(account_status)
    `)
    .in("id", listingIds);

  const activeListings: PublicListingCard[] = [];
  const unavailableIds: string[] = [];

  const listingMap = new Map<string, FavListingRow>();
  if (listings) {
    for (const rawListing of listings) {
      const l = rawListing as unknown as FavListingRow;
      listingMap.set(l.id, l);
    }
  }

  const now = new Date();

  for (const fav of favs) {
    const l = listingMap.get(fav.listing_id);
    const isSellerActive = l?.user_accounts?.account_status === "active";
    const isNotExpired = !l?.expires_at || new Date(l.expires_at) > now;
    const isPublic = l && l.status === "active" && isSellerActive && isNotExpired;

    if (isPublic) {
      activeListings.push({
        id: l.id,
        seller_id: l.seller_id,
        slug: l.slug,
        title: l.title,
        description: l.description,
        condition: l.condition,
        price_type: l.price_type,
        price_paise: l.price_paise,
        pin_code: l.pin_code,
        category_attributes: l.category_attributes,
        status: l.status,
        created_at: l.created_at,
        published_at: l.published_at,
        category: Array.isArray(l.category) ? l.category[0] : l.category,
        city: Array.isArray(l.city) ? l.city[0] : l.city,
        locality: Array.isArray(l.locality) ? l.locality[0] : l.locality,
        cover_photo: Array.isArray(l.cover_photo) ? l.cover_photo[0] : l.cover_photo,
      });
    } else {
      unavailableIds.push(fav.listing_id);
    }
  }

  return { activeListings, unavailableIds };
}
