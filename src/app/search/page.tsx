import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { SearchFilters } from "@/components/listings/SearchFilters";
import { Pagination } from "@/components/listings/Pagination";
import {
  getPublicCategories,
  getPublicCities,
  getPublicLocalities,
  searchPublicListings,
} from "@/lib/discovery/queries";
import { searchFiltersSchema, getEffectiveSort } from "@/types/listing";
import { serializeSearchFilters } from "@/lib/navigation/search-context";
import { loadPublicFamilyDisplays } from "@/lib/discovery/public-family-query";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { SearchX } from "lucide-react";
import Link from "next/link";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  const cat = typeof resolvedParams.category === "string" ? resolvedParams.category : "";

  let title = "Browse & Search Local Listings — FairSwap";
  if (q) {
    title = `"${q}" — Search Listings | FairSwap`;
  } else if (cat) {
    title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} Listings | FairSwap`;
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
  const rawFilters = parsed.success ? parsed.data : searchFiltersSchema.parse({});
  const effectiveSort = getEffectiveSort(rawFilters.q, rawFilters.sort);
  const filters = {
    ...rawFilters,
    sort: effectiveSort,
  };
  const searchContext = serializeSearchFilters(rawFilters);

  const [categories, cities, localities, searchResult] = await Promise.all([
    getPublicCategories(),
    getPublicCities(),
    getPublicLocalities(filters.city || undefined),
    searchPublicListings(filters),
  ]);

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
                {filters.q ? `Search results for "${filters.q}"` : "Discover Local Listings"}
              </h1>
              <p className="mt-1 text-xs text-muted">
                {searchResult.total_count === 1
                  ? "1 listing available"
                  : `${searchResult.total_count} listings available`}
              </p>
            </div>
          </div>

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
                    No listings match your search
                  </h2>
                  <p className="mt-2 text-xs text-muted max-w-md mx-auto leading-relaxed">
                    We couldn&apos;t find any approved advertisements matching your exact filters.
                    Try broadening your search keywords, expanding the price range, or selecting &ldquo;All Categories&rdquo;.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
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
