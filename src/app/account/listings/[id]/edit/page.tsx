import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingForm from "@/components/listings/ListingForm";
import { Category, CategoryAttribute, City, Listing, ListingMedia, PincodeLookupResult } from "@/types/listing";
import { lookupPincodeServer } from "@/lib/location/pincode";
import {
  isSellerWriteMaintenanceEnabled,
  SELLER_WRITE_MAINTENANCE_MESSAGE,
} from "@/lib/maintenance/seller-writes";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isMaintenanceActive = isSellerWriteMaintenanceEnabled();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=/account/listings/${id}/edit`);
  }

  // Fetch listing
  const { data: baseListing, error: listingError } = await supabase
    .from("listings")
    .select(`
      id,
      seller_id,
      slug,
      category_id,
      city_id,
      locality_id,
      title,
      description,
      condition,
      price_type,
      price_paise,
      category_attributes,
      status,
      revision,
      renewal_count,
      rejection_reason,
      removal_reason,
      removed_by,
      cover_photo_id,
      created_at,
      updated_at,
      submitted_at,
      published_at,
      expires_at,
      sold_at
    `)
    .eq("id", id)
    .single();

  if (listingError || !baseListing) {
    notFound();
  }

  if (baseListing.seller_id !== user.id) {
    redirect("/account/listings");
  }

  // Fetch private location fields via owner-private path
  const { data: privLocData } = await supabase.rpc(
    "get_seller_listing_location_private",
    { p_listing_id: id }
  );
  const privateLoc = Array.isArray(privLocData) ? privLocData[0] : privLocData;

  const listing: Listing = {
    ...(baseListing as Omit<Listing, "pin_code" | "landmark">),
    pin_code: privateLoc?.pin_code ?? null,
    landmark: privateLoc?.landmark ?? null,
  };

  // Fetch photos
  const { data: media } = await supabase
    .from("listing_media")
    .select("*")
    .eq("listing_id", id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  // Fetch reference data (excluding nationwide localities)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: allAttributes } = await supabase
    .from("category_attributes")
    .select("*")
    .order("sort_order", { ascending: true });

  const { data: cities } = await supabase
    .from("cities")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Server-hydrate location lookup for this listing's specific PIN code
  let initialLocationLookup: PincodeLookupResult | null = null;
  if (listing.pin_code) {
    initialLocationLookup = await lookupPincodeServer(listing.pin_code, supabase);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/account/listings"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Back to My Listings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Listing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your item details, manage photos, and submit for review.
        </p>
      </div>

      <ListingForm
        categories={(categories as Category[]) || []}
        allAttributes={(allAttributes as CategoryAttribute[]) || []}
        cities={(cities as City[]) || []}
        initialListing={listing}
        initialMedia={(media as ListingMedia[]) || []}
        initialLocationLookup={initialLocationLookup}
        isMaintenanceActive={isMaintenanceActive}
        maintenanceMessage={isMaintenanceActive ? SELLER_WRITE_MAINTENANCE_MESSAGE : undefined}
      />
    </div>
  );
}
