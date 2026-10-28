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
    else listings = data.items.slice(0, 7);
  } catch {
    failed = true;
  }

  const [lead, ...rest] = listings;
  const secondary = buttonVariants({ variant: "secondary", size: "lg", className: "rounded-full" });

  return (
    <section aria-labelledby="recent-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <p className="fs-eyebrow text-muted">Newest first</p>
            <h2 id="recent-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Fresh Finds Near You
            </h2>
            <p className="mt-2 text-sm text-muted">
              {area ? `Newest approved ads in ${area.label}` : "Newest approved ads from across India"}
            </p>
            <Link
              href={discoveryHref({}, area)}
              className={buttonVariants({ variant: "primary", size: "lg", className: "group mt-5 rounded-full" })}
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {failed ? (
          <div role="alert" className="rounded-3xl border border-border bg-card p-6 lg:col-span-9">
            <p className="font-semibold text-foreground">We couldn&apos;t load ads right now.</p>
            <p className="mt-1 text-sm text-muted">This is a loading problem, not an empty area. Please try again.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={homeAreaHref(area)} className={secondary}>Try again</a>
              <Link href="/search" className={secondary}>Browse all ads</Link>
            </div>
          </div>
        ) : !lead ? (
          <div className="rounded-3xl border border-border bg-card p-6 lg:col-span-9">
            <p className="font-semibold text-foreground">{area ? `No approved ads in ${area.label} yet.` : "No approved ads to show yet."}</p>
            <p className="mt-1 text-sm text-muted">{area ? "Try All India, or post the first ad in this area." : "Check back soon, or post an ad of your own."}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {area && <AllIndiaLink className={secondary}>Show All India</AllIndiaLink>}
              <Link href="/account/listings/new" className={secondary}>Post Ad</Link>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
