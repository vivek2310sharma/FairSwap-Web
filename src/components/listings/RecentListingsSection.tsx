import Link from "next/link";
import { PublicListingCard } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { searchPublicListings } from "@/lib/discovery/queries";

export async function RecentListingsSection() {
  let listings: PublicListingCard[] = [];

  try {
    const data = await searchPublicListings({ sort: "newest", page: 1 });
    if (data?.items) {
      listings = data.items.slice(0, 7);
    }
  } catch {
    // fail gracefully
  }

  if (listings.length === 0) {
    return null;
  }

  const [lead, ...rest] = listings;

  return (
    <section aria-labelledby="recent-heading" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <p className="fs-eyebrow text-muted">Newest first</p>
            <h2 id="recent-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Recently Approved Ads
            </h2>
            <p className="mt-2 text-sm text-muted">
              Recently approved local classifieds available for purchase
            </p>
            <Link
              href="/search"
              className={buttonVariants({ variant: "primary", size: "lg", className: "group mt-5 rounded-full" })}
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-9 lg:grid-cols-3 lg:gap-5">
          <div className="col-span-2 lg:row-span-2">
            <ListingCard listing={lead} variant="feature" />
          </div>
          {rest.map((listing, index) => (
            <div key={listing.id} className={index === rest.length - 1 && rest.length === 6 ? "lg:hidden" : undefined}>
              <ListingCard listing={listing} variant="editorial" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
