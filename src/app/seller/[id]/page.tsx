import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SellerProfileHeader } from "@/components/seller/SellerProfileHeader";
import { SellerTabs } from "@/components/seller/SellerTabs";
import { SellerListingsPanel } from "@/components/seller/SellerListingsPanel";
import { SellerRatingsPlaceholder } from "@/components/seller/SellerRatingsPlaceholder";
import { createClient } from "@/lib/supabase/server";
import { getSellerListingsPage } from "@/lib/discovery/queries";
import { getAccountCopy } from "@/lib/account/copy";
import { parseSellerListingsParams, type SellerListingsResult } from "@/types/listing";
import type { PublicSellerProfile } from "@/types/account";
import { z } from "zod";
import { Metadata } from "next";

interface SellerPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const EMPTY_RESULT: SellerListingsResult = {
  items: [],
  total_count: 0,
  page: 1,
  per_page: 12,
  total_pages: 0,
  categories: [],
};

const sellerIdSchema = z.string().uuid();

// Public profile fields only. Location, phone and email are never selected.
const PUBLIC_PROFILE_COLUMNS = "id, display_name, avatar_url, bio, created_at";

function firstValues(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { id } = await params;
  const fallback = { title: "Seller Profile — FairSwap" };
  if (!sellerIdSchema.safeParse(id).success) return fallback;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio")
    .eq("id", id)
    .maybeSingle();

  if (!profile) return fallback;

  return {
    title: `${profile.display_name} — Seller Profile | FairSwap`,
    description: profile.bio || `View listings posted by ${profile.display_name} on FairSwap.`,
  };
}

export default async function SellerProfilePage({ params, searchParams }: SellerPageProps) {
  const { id } = await params;
  if (!sellerIdSchema.safeParse(id).success) notFound();

  const { params: query, invalid } = parseSellerListingsParams(firstValues(await searchParams));
  const copy = getAccountCopy("en").seller;
  const supabase = await createClient();

  const hasFilters = invalid || Boolean(
    query.q || query.category || query.condition || query.price_min !== undefined || query.price_max !== undefined
  );
  const listingsActive = query.tab === "listings";

  // Profile visibility (suspended / deleted accounts) is enforced by the profiles RLS policy.
  const [{ data: profile, error }, result] = await Promise.all([
    supabase.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq("id", id).maybeSingle<PublicSellerProfile>(),
    // Ratings tab only needs the total for the tab label.
    invalid
      ? Promise.resolve<SellerListingsResult>(EMPTY_RESULT)
      : getSellerListingsPage(id, listingsActive ? query : {}, listingsActive ? undefined : 1),
  ]);

  if (error || !profile) notFound();

  // Tab label shows the seller's total visible listings, not the filtered count.
  const totalResult = listingsActive && hasFilters ? await getSellerListingsPage(id, {}, 1) : result;
  const showAsFiltered = hasFilters;
  const totalCount = totalResult?.total_count ?? 0;

  const basePath = `/seller/${id}`;

  return (
    <>
      <Header />

      <main className="flex-1 bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-6">
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
            >
              {copy.backToListings}
            </Link>
          </div>

          <SellerProfileHeader profile={profile} />

          <SellerTabs
            active={query.tab}
            listingsLabel={totalResult ? `${copy.listingsTab} (${totalCount})` : copy.listingsTab}
            ratingsLabel={copy.ratingsTab}
            comingSoonLabel={copy.comingSoon}
            ariaLabel={copy.tabsLabel}
            listingsHref={basePath}
            ratingsHref={`${basePath}?tab=ratings`}
          />

          <div
            id="seller-tabpanel"
            role="tabpanel"
            aria-labelledby={`seller-tab-${query.tab}`}
            tabIndex={0}
            className="mt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action-600"
          >
            {listingsActive ? (
              <SellerListingsPanel basePath={basePath} params={query} result={result} filtered={showAsFiltered} />
            ) : (
              <SellerRatingsPlaceholder />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
