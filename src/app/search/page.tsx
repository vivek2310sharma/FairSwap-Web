import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { Pagination } from "@/components/listings/Pagination";
import {
  getPublicCategories,
  getPublicCities,
  searchPublicListings,
} from "@/lib/discovery/queries";
import { searchFiltersSchema, getEffectiveSort } from "@/types/listing";
import { getAppliedLocality } from "@/lib/discovery/locality-page";
import { serializeSearchFilters } from "@/lib/navigation/search-context";
import { loadPublicFamilyDisplays } from "@/lib/discovery/public-family-query";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { SearchLocation } from "@/components/listings/SearchLocation";
import { discoveryHref } from "@/lib/location/discovery";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  const cat = typeof resolvedParams.category === "string" ? resolvedParams.category : "";

  let title = "Browse & Search Local Ads — FairSwap";
  if (q) {
    title = `"${q}" — Search Ads | FairSwap`;
  } else if (cat) {
    title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Ads | FairSwap`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    title,
    description: "Search approved classifieds advertisements by category, city, price, and condition across India.",
    alternates: {
      canonical: `${siteUrl}/search`,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawParams = await searchParams;

  // Flatten array params to single string
  const flatParams: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(rawParams)) {
    if (Array.isArray(val)) {
      flatParams[key] = val[0];
    } else {
      flatParams[key] = val;
    }
  }

  const parsed = searchFiltersSchema.safeParse(flatParams);
  const duplicateParams = Object.values(rawParams).some(Array.isArray);
  const rawFilters = parsed.success ? parsed.data : searchFiltersSchema.parse({});
  const effectiveSort = getEffectiveSort(rawFilters.q, rawFilters.sort);
  const filters = {
    ...rawFilters,
    sort: effectiveSort,
  };
  const searchContext = serializeSearchFilters(rawFilters);

  const [categories, cities, localities] = await Promise.all([
    getPublicCategories(),
    getPublicCities(),
    filters.city && filters.locality
      ? getAppliedLocality(filters.city, filters.locality)
      : Promise.resolve([]),
  ]);
  const city = cities.find(c => c.id === filters.city);
  const locality = localities.find(l => l.id === filters.locality && l.city_id === filters.city);
  const invalidFilters = !parsed.success || duplicateParams ||
    Boolean(filters.city && !city) || Boolean(filters.locality && (!city || !locality)) ||
    Boolean(filters.category && !categories.some(c => c.slug === filters.category)) ||
    (filters.price_min !== undefined && filters.price_max !== undefined && filters.price_min > filters.price_max);
  const area = city ? {
    city: city.id,
    ...(locality ? { locality: locality.id } : {}),
    label: `${locality ? `${locality.name}, ` : ""}${city.name} district, ${city.state}`,
  } : null;
  const searchResult = invalidFilters
    ? { items: [], total_count: 0, page: 1, per_page: 12, total_pages: 0 }
    : await searchPublicListings(filters);
  const broaderHref = filters.locality && city
    ? discoveryHref(rawFilters, { city: city.id, label: `${city.name} district, ${city.state}` })
    : discoveryHref(rawFilters, null);

  const familyDisplays = await loadPublicFamilyDisplays(searchResult.items);

  // Check user favourite status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userFavSet = new Set<string>();
  if (user && searchResult.items.length > 0) {
    const listingIds = searchResult.items.map((i) => i.id);
    const { data: favs } = await supabase
      .from("favourites")
      .select("listing_id")
      .eq("user_id", user.id)
      .in("listing_id", listingIds);

    if (favs) {
      for (const f of favs) {
        userFavSet.add(f.listing_id);
      }
    }
  }

  return (
    <>
      <Header />

      <main className="flex-1 bg-surface/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb / Title */}
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {filters.q ? `Search results for "${filters.q}"` : "Discover Local Ads"}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {searchResult.total_count === 1
                  ? "1 ad available"
                  : `${searchResult.total_count} ads available`}
              </p>
            </div>
          </div>

          {invalidFilters && <p role="alert" className="mb-4 text-sm">Some search filters are invalid or unavailable. Change or clear them to continue.</p>}
          <SearchLocation key={searchContext} filters={rawFilters} area={area} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Filter Sidebar */}
            <div className="lg:col-span-1">
              <SearchFilters
                key={searchContext}
                categories={categories}
                cities={cities}
                localities={localities}
                initialFilters={rawFilters}
              />
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-3">
              <ActiveFilterChips
                filters={rawFilters}
                categories={categories}
                cities={cities}
                localities={localities}
              />

              {searchResult.items.length > 0 ? (
                <>
                  <div
                    data-testid="search-results-grid"
                    className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-6 lg:grid-cols-3"
                  >
                    {searchResult.items.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        familyDisplay={familyDisplays.get(listing.id)}
                        isFavourited={userFavSet.has(listing.id)}
                        searchContext={searchContext}
                        variant="compact"
                      />
                    ))}
                  </div>

                  {/* Stable Pagination */}
                  <Pagination
                    currentPage={searchResult.page}
                    totalPages={searchResult.total_pages}
                    totalCount={searchResult.total_count}
                    perPage={searchResult.per_page}
                    searchParams={flatParams}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-muted dark:bg-neutral-800">
                    <SearchX className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-foreground">
                    {searchResult.unavailable ? "Search is temporarily unavailable" : invalidFilters ? "Check your search filters" : "No listings match your search"}
                  </h2>
                  <p className="mt-2 text-xs text-muted max-w-md mx-auto leading-relaxed">
                    {searchResult.unavailable ? "Please try again shortly. Your selected filters are preserved." : "Try changing your keywords or filters. Geographic scope changes only when you choose a wider search."}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {!invalidFilters && !searchResult.unavailable && filters.city && <Link href={broaderHref} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-brand-link">
                      {filters.locality ? "No ads in this area yet. View ads across the district." : "No ads in this district yet. View ads across All India."}
                    </Link>}
                    <Link
                      href="/search"
                      className="rounded-lg bg-action-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-action-700"
                    >
                      Clear All Filters
                    </Link>
                    <Link
                      href="/account/listings/new"
                      className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
                    >
                      Post This Item for Sale
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
