import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingStatus } from "@/types/listing";
import { transitionListingAction, submitListingAction } from "./actions";
import { ModerationStatusBadge } from "./ModerationStatusBadge";
import {isPropertyEnabled} from '@/lib/listings/property/server';
import {propertyFinancialSchema,propertyRentSummary,isPropertyRentalCategory} from '@/lib/listings/property/contract';
import {twoWheelerV1} from '@/lib/listings/two-wheeler/contract';
import {carsV1} from '@/lib/listings/cars/contract';
import {isTwoWheelerEnabled,isCarsEnabled} from '@/lib/listings/two-wheeler/server';
import {isVerifiedSubmissionTestEnvironment} from '@/lib/listings/test-runtime';


function getStatusBadge(status: ListingStatus, testFamily=false) {
  const styles: Record<ListingStatus, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    pending_review: "bg-amber-100 text-amber-800 border-amber-300",
    active: "bg-emerald-100 text-emerald-800 border-emerald-300",
    reserved: "bg-blue-100 text-blue-800 border-blue-300",
    paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
    sold: "bg-purple-100 text-purple-800 border-purple-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    expired: "bg-orange-100 text-orange-800 border-orange-300",
    removed: "bg-stone-200 text-stone-700 border-stone-300",
  };

  const labels: Record<ListingStatus, string> = {
    draft: "Draft",
    pending_review: "Under Review",
    active: "Active",
    reserved: "Reserved",
    paused: "Paused",
    sold: "Sold",
    rejected: "Rejected",
    expired: "Expired",
    removed: "Removed by Moderator",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] || styles.draft
      }`}
    >
      {testFamily&&status==='pending_review'?'Review — Not Live':labels[status] || status}
    </span>
  );
}

async function onSubmitListing(listingId: string) {
  "use server";
  await submitListingAction(listingId);
}

async function onTransitionListing(listingId: string, action: string) {
  "use server";
  await transitionListingAction(listingId, action);
}

export default async function ListingsDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/account/listings");
  }

  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      id,
      category_id,
      slug,
      title,
      price_type,
      price_paise,
      status,
      revision,
      renewal_count,
      rejection_reason,
      removal_reason,
      cover_photo_id,
      created_at,
      updated_at,
      categories(name,slug),
      cities(name)
    `)
    .eq("seller_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  const propertyIds=(listings??[]).map(l=>l.id);
  const propertyResult=isPropertyEnabled()&&propertyIds.length?await (async()=>{
    try {return await supabase.from('listing_property_contexts').select('listing_id,category_id,financial').in('listing_id',propertyIds);}
    catch {return {data:null,error:{message:'Saved Property references could not be loaded.'}};}
  })():null;
  const rentals=new Map((propertyResult?.error?[]:propertyResult?.data??[]).filter(p=>listings?.some(l=>l.id===p.listing_id&&l.category_id===p.category_id)).map(p=>[p.listing_id,p.financial]));
  // Only displayed, owned drafts with an unresolved ordinary relation need fallback.
  const unresolvedIds=(listings??[]).filter(l=>{
    const category=Array.isArray(l.categories)?l.categories[0]:l.categories;
    return ['draft','pending_review'].includes(l.status)&&!category?.slug?.trim()&&!rentals.has(l.id);
  }).map(l=>l.id);
  const loadVehicleContexts=async(table:'listing_vehicle_contexts'|'listing_car_contexts',enabled:boolean)=>{
    if(!enabled||!unresolvedIds.length)return {ids:new Set<string>(),failed:false};
    try {
      const result=await supabase.from(table).select('listing_id,category_id').in('listing_id',unresolvedIds);
      if(result.error)return {ids:new Set<string>(),failed:true};
      return {ids:new Set((result.data??[]).filter(c=>listings?.some(l=>l.id===c.listing_id&&l.category_id===c.category_id)).map(c=>c.listing_id)),failed:false};
    } catch {return {ids:new Set<string>(),failed:true};}
  };
  const [motorcycleContexts,carContexts]=await Promise.all([
    loadVehicleContexts('listing_vehicle_contexts',isTwoWheelerEnabled()),
    loadVehicleContexts('listing_car_contexts',isCarsEnabled()),
  ]);
  const contextLookupFailed=!!propertyResult?.error||motorcycleContexts.failed||carContexts.failed;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              ← My Account
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create, manage, track, and update your marketplace listings.
          </p>
        </div>
        <Link
          href="/account/listings/new"
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          + Create New Listing
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          Failed to load listings: {error.message}
        </div>
      )}

      {listings && listings.length === 0 ? (
        <div className="mt-12 text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <span className="text-4xl">📦</span>
          <h3 className="mt-2 text-base font-semibold text-gray-900">No listings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first listing on FairSwap.
          </p>
          <div className="mt-6">
            <Link
              href="/account/listings/new"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              + Create Listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings?.map((listing) => {
            const propertyDraft=isPropertyRentalCategory(listing.categories)||rentals.has(listing.id);
            const categoryReference=Array.isArray(listing.categories)?listing.categories[0]:listing.categories;
            const vehicleDraft=motorcycleContexts.ids.has(listing.id)||carContexts.ids.has(listing.id)||[...twoWheelerV1.paths,...carsV1.paths].some(path=>path.slug===categoryReference?.slug);
            const unresolvedFamily=!propertyDraft&&!vehicleDraft&&!categoryReference?.slug?.trim();
            const financial=propertyFinancialSchema.safeParse(rentals.get(listing.id));
            const priceDisplay =
              propertyDraft ? financial.success?propertyRentSummary(financial.data):'Rental details unavailable' : listing.price_type === "free"
                ? "Free"
                : listing.price_paise
                ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
                : "Price not set";

            const categoryName = Array.isArray(listing.categories)
              ? listing.categories[0]?.name
              : (listing.categories as { name?: string } | null)?.name;
            const cityName = Array.isArray(listing.cities)
              ? listing.cities[0]?.name
              : (listing.cities as { name?: string } | null)?.name;

            return (
              <div
                key={listing.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{listing.title}</h2>
                      {listing.status === "pending_review" && !propertyDraft && !vehicleDraft ? (
                        <ModerationStatusBadge
                          listingId={listing.id}
                          initialStatus={listing.status}
                        />
                      ) : (
                        getStatusBadge(listing.status,propertyDraft||vehicleDraft)
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-900 text-sm">{priceDisplay}</span>
                      <span>•</span>
                      <span>{categoryName || "Uncategorized"}</span>
                      <span>•</span>
                      <span>{cityName || "No city"}</span>
                      <span>•</span>
                      <span>
                        Updated {new Date(listing.updated_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    {listing.status === "rejected" && listing.rejection_reason && (
                      <div className="mt-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                        <span className="font-semibold">Rejection reason:</span>{" "}
                        {listing.rejection_reason}
                        <p className="mt-1 text-gray-600">
                          Editing this listing will return it to draft so you can update and resubmit.
                        </p>
                      </div>
                    )}

                    {listing.status === "removed" && listing.removal_reason && (
                      <div className="mt-2 rounded-md bg-stone-100 p-2.5 text-xs text-stone-700 border border-stone-200">
                        <span className="font-semibold">Removed by staff:</span>{" "}
                        {listing.removal_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions according to lifecycle matrix */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/account/listings/${listing.id}/edit`}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {(propertyDraft||vehicleDraft)&&listing.status==='pending_review'?'View saved details':'Edit'}
                    </Link>

                    {listing.status==='draft'&&(propertyDraft||vehicleDraft)&&<p className="text-sm text-amber-800">{isVerifiedSubmissionTestEnvironment(process.env)?'Open the saved draft to check Test submission availability. Approval and publication remain disabled.':'Draft only. This category is not yet open for submission or publication.'}</p>}
                    {listing.status==='pending_review'&&(propertyDraft||vehicleDraft)&&<p className="text-sm text-amber-800">Automated review can finish while this category is not publicly live. Saved details and photos are read-only; approval and publication remain disabled.</p>}
                    {listing.status==='draft'&&unresolvedFamily&&<p role="status" className="text-sm text-amber-800">{contextLookupFailed?'Category references could not be loaded. Submission is unavailable. Try again later.':'Category information is unavailable. Submission is unavailable until this draft’s category is verified.'}</p>}
                    {listing.status === "draft" && !propertyDraft && !vehicleDraft && !unresolvedFamily && (
                      <form action={onSubmitListing.bind(null, listing.id)}>
                        <button
                          type="submit"
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Submit for Review
                        </button>
                      </form>
                    )}

                    {listing.status === "active" && (
                      <>
                        <form action={onTransitionListing.bind(null, listing.id, "pause")}>
                          <button
                            type="submit"
                            className="rounded border border-yellow-300 bg-yellow-50 px-2.5 py-1.5 text-xs font-semibold text-yellow-800 hover:bg-yellow-100"
                          >
                            Pause
                          </button>
                        </form>
                        <form action={onTransitionListing.bind(null, listing.id, "reserve")}>
                          <button
                            type="submit"
                            className="rounded border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                          >
                            Mark Reserved
                          </button>
                        </form>
                        <form action={onTransitionListing.bind(null, listing.id, "mark_sold")}>
                          <button
                            type="submit"
                            className="rounded border border-purple-300 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
                          >
                            Mark Sold
                          </button>
                        </form>
                      </>
                    )}

                    {listing.status === "reserved" && (
                      <>
                        <form action={onTransitionListing.bind(null, listing.id, "unreserve")}>
                          <button
                            type="submit"
                            className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            Unreserve
                          </button>
                        </form>
                        <form action={onTransitionListing.bind(null, listing.id, "mark_sold")}>
                          <button
                            type="submit"
                            className="rounded border border-purple-300 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
                          >
                            Mark Sold
                          </button>
                        </form>
                      </>
                    )}

                    {listing.status === "paused" && (
                      <>
                        <form action={onTransitionListing.bind(null, listing.id, "resume")}>
                          <button
                            type="submit"
                            className="rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            Resume
                          </button>
                        </form>
                        <form action={onTransitionListing.bind(null, listing.id, "mark_sold")}>
                          <button
                            type="submit"
                            className="rounded border border-purple-300 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
                          >
                            Mark Sold
                          </button>
                        </form>
                      </>
                    )}

                    {listing.status === "expired" && listing.renewal_count < 3 && (
                      <form action={onTransitionListing.bind(null, listing.id, "renew")}>
                        <button
                          type="submit"
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Renew ({3 - listing.renewal_count} left)
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
