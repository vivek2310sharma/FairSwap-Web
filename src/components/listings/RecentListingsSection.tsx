import Link from "next/link";
import { PublicListingCard } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { AllIndiaLink } from "./AllIndiaLink";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { searchPublicListings } from "@/lib/discovery/queries";
import { discoveryHref, homeAreaHref, type PublicArea } from "@/lib/location/discovery";

/** Newest approved public ads for the validated public area (or all of India). Never reads seller-private location. */
export async function RecentListingsSection({ area = null }: { area?: PublicArea | null }) {
  let listings: PublicListingCard[] = [];
  let failed = false;

  try {
    const data = await searchPublicListings({
      sort: "newest",
      page: 1,
      ...(area ? { city: area.city, locality: area.locality } : {}),
    });
    if (!data || data.unavailable) failed = true;
    else listings = data.items.slice(0, 8);
  } catch {
    failed = true;
  }

  const lead = listings[0];
  const secondary = buttonVariants({ variant: "secondary", size: "lg", className: "rounded-full" });

  return (
    <section id="fresh-finds" aria-labelledby="recent-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="fs-eyebrow text-muted">{area ? area.label : "Across India"}</p>
          <h2 id="recent-heading" className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Fresh Finds Near You
          </h2>
          <p className="mt-1 text-sm text-muted">
            {area ? `Newest approved ads in ${area.label}` : "Newest approved ads from across India"}
          </p>
        </div>
        <Link
          href={discoveryHref({}, area)}
          className={buttonVariants({ variant: "primary", size: "lg", className: "group rounded-full" })}
        >
          View all
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
      <div>
        {failed ? (
          <div role="alert" className="rounded-3xl border border-border bg-card p-6">
            <p className="font-semibold text-foreground">We couldn&apos;t load ads right now.</p>
            <p className="mt-1 text-sm text-muted">This is a loading problem, not an empty area. Please try again.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={homeAreaHref(area)} className={secondary}>Try again</a>
              <Link href="/search" className={secondary}>Browse all ads</Link>
            </div>
          </div>
        ) : !lead ? (
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="font-semibold text-foreground">{area ? `No approved ads in ${area.label} yet.` : "No approved ads to show yet."}</p>
            <p className="mt-1 text-sm text-muted">{area ? "Try All India, or post the first ad in this area." : "Check back soon, or post an ad of your own."}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {area && <AllIndiaLink className={secondary}>Show All India</AllIndiaLink>}
              <Link href="/account/listings/new" className={secondary}>Post Ad</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {listings.map((listing) => (
              <div key={listing.id}>
                <ListingCard listing={listing} variant="editorial" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
