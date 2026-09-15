import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import ModerationActions from "./ModerationActions";

export default async function AdminListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=/admin/listings/${id}`);
  }

  // Check moderator/admin with AAL2
  const { data: isStaff } = await supabase.rpc("is_active_staff_aal2", {
    required_role: "moderator",
  });

  if (!isStaff) {
    redirect("/admin");
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .select(`
      *,
      categories(name, slug),
      cities(name, state),
      localities(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("admin.moderation_detail_query_failed", {
      listing_id: id,
      error_code: error.code,
      message: error.message,
    });
    throw new Error("Failed to load listing for moderation review.");
  }

  if (!listing) {
    notFound();
  }

  // Fetch seller profile separately
  let sellerProfile: { display_name: string; avatar_url: string | null } | null = null;
  if (listing.seller_id) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", listing.seller_id)
      .maybeSingle();

    if (profileError) {
      logger.warn("admin.moderation_seller_profile_fetch_failed", {
        listing_id: id,
        seller_id: listing.seller_id,
        error_code: profileError.code,
      });
    } else {
      sellerProfile = profileData;
    }
  }

  // Fetch photos
  const { data: media } = await supabase
    .from("listing_media")
    .select("*")
    .eq("listing_id", id)
    .order("display_order", { ascending: true });

  // Fetch status transitions
  const { data: transitions } = await supabase
    .from("listing_status_transitions")
    .select("*")
    .eq("listing_id", id)
    .order("created_at", { ascending: true });

  const isSelfListing = listing.seller_id === user.id;
  const allMediaReady =
    (media && media.length > 0 && media.every((m) => m.processing_status === "ready")) || false;

  const price =
    listing.price_type === "free"
      ? "Free"
      : listing.price_paise
      ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
      : "Not set";

  const categoryName = Array.isArray(listing.categories)
    ? listing.categories[0]?.name
    : (listing.categories as { name?: string } | null)?.name;
  const cityName = Array.isArray(listing.cities)
    ? listing.cities[0]?.name
    : (listing.cities as { name?: string } | null)?.name;
  const localityName = Array.isArray(listing.localities)
    ? listing.localities[0]?.name
    : (listing.localities as { name?: string } | null)?.name;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
      <div>
        <Link href="/admin/listings" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to Moderation Queue
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
          <span className="rounded bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 uppercase tracking-wider">
            {listing.status} • Rev {listing.revision}
          </span>
        </div>
      </div>

      <ModerationActions
        listingId={listing.id}
        isSelfListing={isSelfListing}
        canApprove={allMediaReady && listing.status === "pending_review"}
      />

      {/* Grid of details */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left column: main details & photos */}
        <div className="space-y-6 md:col-span-2">
          {/* Photos */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900">
              Submitted Photographs ({media?.length || 0})
            </h2>

            {media && media.length === 0 ? (
              <p className="text-xs text-gray-500">No photos uploaded for this listing.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {media?.map((photo) => {
                  const isCover = listing.cover_photo_id === photo.id;
                  return (
                    <div
                      key={photo.id}
                      className={`relative aspect-square overflow-hidden rounded border bg-gray-100 ${
                        isCover ? "border-emerald-500 ring-2 ring-emerald-500" : "border-gray-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/listings/${listing.id}/media/${photo.id}/medium`}
                        alt={photo.original_filename}
                        className="h-full w-full object-cover"
                      />
                      {isCover && (
                        <span className="absolute top-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                          Cover
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {photo.processing_status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-gray-900">Description</h2>
            <p className="whitespace-pre-line text-sm text-gray-700">
              {listing.description || "No description provided."}
            </p>
          </div>

          {/* Category Attributes */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Custom Category Attributes</h2>
            {listing.category_attributes &&
            Object.keys(listing.category_attributes).length > 0 ? (
              <dl className="grid grid-cols-2 gap-4 text-xs">
                {Object.entries(listing.category_attributes).map(([key, val]) => (
                  <div key={key} className="border-b pb-1">
                    <dt className="font-semibold text-gray-500 capitalize">{key.replace("_", " ")}</dt>
                    <dd className="text-gray-900 font-medium">{String(val)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-gray-500">No specific attributes provided.</p>
            )}
          </div>
        </div>

        {/* Right column: metadata & transitions */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Summary</h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">Price</dt>
                <dd className="font-bold text-gray-900">{price}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">Condition</dt>
                <dd className="font-medium text-gray-900 capitalize">{listing.condition || "N/A"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900">{categoryName || "N/A"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">City / Locality</dt>
                <dd className="font-medium text-gray-900">
                  {cityName || "N/A"}
                  {localityName ? ` (${localityName})` : ""}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">PIN Code</dt>
                <dd className="font-medium text-gray-900">{listing.pin_code || "N/A"}</dd>
              </div>
              <div className="flex justify-between border-b pb-1">
                <dt className="text-gray-500">Seller</dt>
                <dd className="font-medium text-gray-900">
                  {sellerProfile?.display_name || "Seller profile unavailable"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Audit & Transition History */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Transition History</h2>
            <div className="space-y-3">
              {transitions?.map((t) => (
                <div key={t.id} className="border-l-2 border-emerald-500 pl-3 text-xs space-y-0.5">
                  <div className="font-semibold text-gray-900">
                    {t.from_status || "origin"} → {t.to_status}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Actor: <span className="font-medium">{t.actor_kind}</span> • Rev{" "}
                    {t.revision_at_transition}
                  </div>
                  {t.reason && (
                    <div className="italic text-gray-600 bg-gray-50 p-1 rounded text-[11px]">
                      &ldquo;{t.reason}&rdquo;
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400">
                    {new Date(t.created_at).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
