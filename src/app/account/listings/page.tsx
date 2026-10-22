import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingStatus } from "@/types/listing";
import { ModerationStatusBadge } from "./ModerationStatusBadge";
import { ShareButton } from "@/components/listings/ShareButton";
import { ListingThumbnail } from "./ListingThumbnail";
import { isPropertyEnabled } from "@/lib/listings/property/server";
import {
  propertyFinancialSchema,
  propertyRentSummary,
  isPropertyRentalCategory,
} from "@/lib/listings/property/contract";
import { twoWheelerV1 } from "@/lib/listings/two-wheeler/contract";
import { carsV1 } from "@/lib/listings/cars/contract";
import { isTwoWheelerEnabled, isCarsEnabled } from "@/lib/listings/two-wheeler/server";
import { isVerifiedSubmissionTestEnvironment } from "@/lib/listings/test-runtime";
import { resolveListingActions } from "@/lib/listings/action-matrix";
import { ListingActionsContainer } from "./ListingActionsContainer";
import { MyAdsStatusTabs } from "@/components/account/MyAdsStatusTabs";
import {
  fetchMyListingCounts,
  getStatusesForTab,
  MY_ADS_TABS,
  parseMyAdsTab,
} from "@/lib/listings/my-ads";
import { Pagination } from "@/components/listings/Pagination";

const PER_PAGE = 10;

interface ListingsDashboardPageProps {
  searchParams?: Promise<{
    status?: string | string[];
    page?: string | string[];
  }>;
}

function getStatusBadge(status: ListingStatus, testFamily = false) {
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
      {testFamily && status === "pending_review"
        ? "Review — Not Live"
        : labels[status] || status}
    </span>
  );
}

export default async function ListingsDashboardPage({
  searchParams = Promise.resolve({}),
}: ListingsDashboardPageProps = {}) {
  const resolvedSearchParams = await searchParams;
  const activeTab = parseMyAdsTab(resolvedSearchParams?.status);
  const rawPage = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams?.page;
  const currentPage = Math.max(1, parseInt(rawPage || "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/account/listings");
  }

  const statuses = getStatusesForTab(activeTab);

  let query = supabase
    .from("listings")
    .select(
      `
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
        expires_at,
        created_at,
        updated_at,
        categories(name,slug),
        cities(name)
      `,
      { count: "exact" }
    )
    .eq("seller_id", user.id);

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const from = (currentPage - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  query = query.order("updated_at", { ascending: false }).range(from, to);

  const [{ data: listings, count, error }, counts] = await Promise.all([
    query,
    fetchMyListingCounts(supabase, user.id),
  ]);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const propertyIds = (listings ?? []).map((l) => l.id);
  const propertyResult =
    isPropertyEnabled() && propertyIds.length
      ? await (async () => {
          try {
            return await supabase
              .from("listing_property_contexts")
              .select("listing_id,category_id,financial")
              .in("listing_id", propertyIds);
          } catch {
            return {
              data: null,
              error: { message: "Saved Property references could not be loaded." },
            };
          }
        })()
      : null;
  const rentals = new Map(
    (propertyResult?.error ? [] : propertyResult?.data ?? [])
      .filter((p) =>
        listings?.some((l) => l.id === p.listing_id && l.category_id === p.category_id)
      )
      .map((p) => [p.listing_id, p.financial])
  );

  const unresolvedIds = (listings ?? [])
    .filter((l) => {
      const category = Array.isArray(l.categories)
        ? l.categories[0]
        : l.categories;
      return (
        ["draft", "pending_review"].includes(l.status) &&
        !category?.slug?.trim() &&
        !rentals.has(l.id)
      );
    })
    .map((l) => l.id);

  const loadVehicleContexts = async (
    table: "listing_vehicle_contexts" | "listing_car_contexts",
    enabled: boolean
  ) => {
    if (!enabled || !unresolvedIds.length)
      return { ids: new Set<string>(), failed: false };
    try {
      const result = await supabase
        .from(table)
        .select("listing_id,category_id")
        .in("listing_id", unresolvedIds);
      if (result.error) return { ids: new Set<string>(), failed: true };
      return {
        ids: new Set(
          (result.data ?? [])
            .filter((c) =>
              listings?.some(
                (l) => l.id === c.listing_id && l.category_id === c.category_id
              )
            )
            .map((c) => c.listing_id)
        ),
        failed: false,
      };
    } catch {
      return { ids: new Set<string>(), failed: true };
    }
  };

  const [motorcycleContexts, carContexts] = await Promise.all([
    loadVehicleContexts("listing_vehicle_contexts", isTwoWheelerEnabled()),
    loadVehicleContexts("listing_car_contexts", isCarsEnabled()),
  ]);
  const contextLookupFailed =
    !!propertyResult?.error || motorcycleContexts.failed || carContexts.failed;

  const activeListingIds = (listings ?? [])
    .filter((l) => l.status === "active")
    .map((l) => l.id);

  const visibilityChecks = await Promise.all(
    activeListingIds.map(async (id) => {
      try {
        const { data } = await supabase.rpc("is_listing_publicly_visible", {
          listing_id: id,
        });
        return [id, !!data] as const;
      } catch {
        return [id, false] as const;
      }
    })
  );

  const publicListingIds = new Set(
    visibilityChecks.filter(([, isVis]) => isVis).map(([id]) => id)
  );

  const currentTabMeta = MY_ADS_TABS.find((t) => t.key === activeTab);

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
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          + Create New Listing
        </Link>
      </div>

      <div className="mt-6">
        <MyAdsStatusTabs activeTab={activeTab} counts={counts} />
      </div>

      {error && (
        <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          Failed to load listings: {error.message}
        </div>
      )}

      {listings && listings.length === 0 ? (
        <div className="mt-12 text-center rounded-lg border-2 border-dashed border-gray-300 p-12">
          <span className="text-4xl">📦</span>
          <h3 className="mt-2 text-base font-semibold text-gray-900">
            {activeTab === "all"
              ? "No listings yet"
              : `No ${currentTabMeta?.label.toLowerCase() || activeTab} listings`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === "all"
              ? "Get started by creating your first listing on FairSwap."
              : `You don't have any listings in "${currentTabMeta?.label || activeTab}".`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {activeTab !== "all" && (
              <Link
                href="/account/listings"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
              >
                View All Listings
              </Link>
            )}
            <Link
              href="/account/listings/new"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500"
            >
              + Create Listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {listings?.map((listing) => {
            const propertyDraft =
              isPropertyRentalCategory(listing.categories) || rentals.has(listing.id);
            const categoryReference = Array.isArray(listing.categories)
              ? listing.categories[0]
              : listing.categories;
            const vehicleDraft =
              motorcycleContexts.ids.has(listing.id) ||
              carContexts.ids.has(listing.id) ||
              [...twoWheelerV1.paths, ...carsV1.paths].some(
                (path) => path.slug === categoryReference?.slug
              );
            const unresolvedFamily =
              !propertyDraft && !vehicleDraft && !categoryReference?.slug?.trim();
            const financial = propertyFinancialSchema.safeParse(
              rentals.get(listing.id)
            );
            const priceDisplay = propertyDraft
              ? financial.success
                ? propertyRentSummary(financial.data)
                : "Rental details unavailable"
              : listing.price_type === "free"
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

            const isPublic = publicListingIds.has(listing.id);

            const actions = resolveListingActions({
              id: listing.id,
              slug: listing.slug,
              status: listing.status,
              renewal_count: listing.renewal_count,
              propertyDraft,
              vehicleDraft,
              unresolvedFamily,
            });

            return (
              <div
                key={listing.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs transition hover:border-gray-300"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <ListingThumbnail
                      listingId={listing.id}
                      coverPhotoId={listing.cover_photo_id}
                      title={listing.title}
                    />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          {listing.title}
                        </h2>
                        {listing.status === "pending_review" &&
                        !propertyDraft &&
                        !vehicleDraft ? (
                          <ModerationStatusBadge
                            listingId={listing.id}
                            initialStatus={listing.status}
                          />
                        ) : (
                          getStatusBadge(
                            listing.status,
                            propertyDraft || vehicleDraft
                          )
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="font-semibold text-gray-900 text-sm">
                          {priceDisplay}
                        </span>
                        <span>•</span>
                        <span>{categoryName || "Uncategorized"}</span>
                        <span>•</span>
                        <span>{cityName || "No city"}</span>
                        <span>•</span>
                        <span>
                          Updated{" "}
                          {new Date(listing.updated_at).toLocaleDateString("en-IN")}
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

                      {listing.status === "draft" &&
                        (propertyDraft || vehicleDraft) && (
                          <p className="mt-2 text-xs text-amber-800 font-medium">
                            {isVerifiedSubmissionTestEnvironment(process.env)
                              ? "Open the saved draft to check Test submission availability. Approval and publication remain disabled."
                              : "Draft only. This category is not yet open for submission or publication."}
                          </p>
                        )}

                      {listing.status === "pending_review" &&
                        (propertyDraft || vehicleDraft) && (
                          <p className="mt-2 text-xs text-amber-800 font-medium">
                            Automated review can finish while this category is not publicly live. Saved details and photos are read-only; approval and publication remain disabled.
                          </p>
                        )}

                      {listing.status === "draft" && unresolvedFamily && (
                        <p role="status" className="mt-2 text-xs text-amber-800 font-medium">
                          {contextLookupFailed
                            ? "Category references could not be loaded. Submission is unavailable. Try again later."
                            : "Category information is unavailable. Submission is unavailable until this draft’s category is verified."}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions according to simplified single primary + overflow menu contract */}
                  <div className="shrink-0 flex items-center gap-2 sm:self-start">
                    {listing.status === "active" && isPublic && (
                      <ShareButton
                        slug={listing.slug}
                        title={listing.title}
                        price_type={listing.price_type}
                        price_paise={listing.price_paise}
                        variant="inline"
                      />
                    )}
                    <ListingActionsContainer
                      listingId={listing.id}
                      actions={actions}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            perPage={PER_PAGE}
            searchParams={{
              status: activeTab === "all" ? undefined : activeTab,
            }}
            baseUrl="/account/listings"
          />
        </div>
      )}
    </div>
  );
}
