import Link from "next/link";
import { PublicListingCard } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { buttonVariants } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { searchPublicListings } from "@/lib/discovery/queries";

export async function RecentListingsSection() {
  let listings: PublicListingCard[] = [];

  try {
    const data = await searchPublicListings({ sort: "newest", page: 1 });
    if (data?.items) {
      listings = data.items.slice(0, 8);
    }
  } catch {
    // fail gracefully
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Recently Approved Ads
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Recently approved local classifieds available for purchase
            </p>
          </div>
          <Link
            href="/search"
            className={buttonVariants({ variant: "link", className: "shrink-0 px-2" })}
          >
            View all
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}
