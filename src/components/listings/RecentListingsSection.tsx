import Link from "next/link";
import { PublicListingCard } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { Sparkles } from "lucide-react";
import { searchPublicListings } from "@/lib/discovery/queries";

export async function RecentListingsSection() {
  let listings: PublicListingCard[] = [];

  try {
    const data = await searchPublicListings({ sort: "newest", page: 1 });
    if (data?.items) {
      listings = data.items.slice(0, 8);
    }
  } catch (error) {
    // fail gracefully
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-link" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Recent Verified Listings
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Recently approved local classifieds available for purchase
            </p>
          </div>
          <Link
            href="/search"
            className="text-xs font-semibold text-brand-link hover:underline flex items-center gap-1"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}
