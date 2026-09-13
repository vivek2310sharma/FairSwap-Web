import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminListingsQueuePage() {
  const supabase = await createClient();

  // Verify moderator or administrator role with AAL2
  const { data: isStaff } = await supabase.rpc("is_active_staff_aal2", {
    required_role: "moderator",
  });

  if (!isStaff) {
    redirect("/admin");
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      price_type,
      price_paise,
      revision,
      status,
      submitted_at,
      created_at,
      seller_id,
      categories(name),
      cities(name),
      profiles!listings_seller_id_fkey(display_name),
      listing_media(id, processing_status)
    `)
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <Link href="/admin" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
            ← Staff Portal
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Moderation Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve pending listings submitted by sellers.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          {listings?.length || 0} Pending
        </span>
      </div>

      {error && (
        <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load queue: {error.message}
        </div>
      )}

      {listings && listings.length === 0 ? (
        <div className="mt-12 text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <span className="text-4xl">✨</span>
          <h3 className="mt-2 text-base font-semibold text-gray-900">Queue is clear</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are currently no listings awaiting moderator review.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings?.map((listing) => {
            const price =
              listing.price_type === "free"
                ? "Free"
                : listing.price_paise
                ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
                : "Not set";

            const readyCount =
              listing.listing_media?.filter((m) => m.processing_status === "ready").length || 0;

            const categoryName = Array.isArray(listing.categories)
              ? listing.categories[0]?.name
              : (listing.categories as { name?: string } | null)?.name;
            const cityName = Array.isArray(listing.cities)
              ? listing.cities[0]?.name
              : (listing.cities as { name?: string } | null)?.name;
            const sellerName = Array.isArray(listing.profiles)
              ? listing.profiles[0]?.display_name
              : (listing.profiles as { display_name?: string } | null)?.display_name;

            return (
              <div
                key={listing.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 flex flex-col sm:flex-row justify-between gap-4 sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">{listing.title}</h2>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Rev {listing.revision}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-900">{price}</span>
                    <span>•</span>
                    <span>Category: {categoryName || "N/A"}</span>
                    <span>•</span>
                    <span>City: {cityName || "N/A"}</span>
                    <span>•</span>
                    <span>Photos: {readyCount} ready</span>
                    <span>•</span>
                    <span>
                      Seller: {sellerName || listing.seller_id.slice(0, 8)}
                    </span>
                    <span>•</span>
                    <span>
                      Submitted:{" "}
                      {listing.submitted_at
                        ? new Date(listing.submitted_at).toLocaleString("en-IN")
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div>
                  <Link
                    href={`/admin/listings/${listing.id}`}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                  >
                    Review Listing →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
