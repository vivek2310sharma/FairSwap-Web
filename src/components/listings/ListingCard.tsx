import Link from "next/link";
import Image from "next/image";
import { MapPin, Tag } from "lucide-react";
import { PublicListingCard } from "@/types/listing";
import { publicPriceFallback, type PublicFamilyDisplay } from "@/lib/discovery/family-display";
import { FavouriteButton } from "./FavouriteButton";

interface ListingCardProps {
  listing: PublicListingCard;
  isFavourited?: boolean;
  searchContext?: string;
  variant?: "default" | "compact";
  familyDisplay?: PublicFamilyDisplay;
}

export function ListingCard({
  listing,
  isFavourited = false,
  searchContext,
  variant = "default",
  familyDisplay,
}: ListingCardProps) {
  const listingPath = `/listings/${listing.slug}`;
  const listingHref = searchContext
    ? listingPath + "?" + new URLSearchParams({ ctx: searchContext }).toString()
    : listingPath;

  const formattedPrice = familyDisplay?.priceLabel ?? publicPriceFallback(listing.category?.slug, listing.price_type, listing.price_paise);

  const conditionLabels: Record<string, string> = {
    new: "Brand New",
    like_new: "Like New",
    good: "Good Condition",
    fair: "Fair",
    poor: "For Parts",
  };

  const coverUrl = listing.cover_photo?.id
    ? `/api/listings/${listing.id}/media/${listing.cover_photo.id}/thumb`
    : null;

  const isCompact = variant === "compact";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
      {/* Thumbnail Container */}
      <div className="relative z-10 aspect-4/3 w-full overflow-hidden bg-subtle">
        <Link href={listingHref} tabIndex={-1} aria-hidden="true" className="block h-full w-full focus:outline-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={listing.title}
              fill
              sizes={
                isCompact
                  ? "(max-width: 360px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              }
              className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
              unoptimized={true}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <Tag className="h-10 w-10 stroke-1 opacity-50" aria-hidden="true" />
            </div>
          )}
        </Link>

        {/* Condition Tag */}
        {listing.condition && (
          <span
            className={`absolute rounded-lg bg-black/65 font-semibold text-white backdrop-blur-xs truncate max-w-[calc(100%-3.25rem)] pointer-events-none ${
              isCompact
                ? "top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] sm:top-2 sm:left-2 sm:px-2 sm:text-xs"
                : "top-2 left-2 px-2 py-0.5 text-xs"
            }`}
          >
            {conditionLabels[listing.condition] || listing.condition}
          </span>
        )}

        {/* Favourite Button */}
        <div className={`absolute z-20 ${isCompact ? "top-1.5 right-1.5 sm:top-2 sm:right-2" : "top-2 right-2"}`}>
          <FavouriteButton listingId={listing.id} initialIsFavourited={isFavourited} />
        </div>
      </div>

      {/* Card Content */}
      <div className={`relative z-0 flex flex-1 flex-col ${isCompact ? "p-2.5 sm:p-4" : "p-4"}`}>
        <div className="flex items-baseline justify-between gap-1.5 sm:gap-2">
          <span className={`fs-price text-foreground ${isCompact ? "text-base min-[360px]:text-lg sm:text-xl" : "text-xl"}`}>
            {formattedPrice}
          </span>
          {listing.category?.name && (
            <span
              className={`truncate font-medium text-muted ${
                isCompact ? "text-[11px] sm:text-xs max-w-[45%]" : "text-xs"
              }`}
            >
              {listing.category.name}
            </span>
          )}
        </div>

        {familyDisplay?.specifications.length ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted">
            {familyDisplay.specifications.slice(0, 3).map(spec => `${spec.label}: ${spec.value}`).join(" · ")}
          </p>
        ) : null}

        <h3
          className={`line-clamp-2 font-semibold text-foreground group-hover:text-primary ${
            isCompact ? "mt-1 sm:mt-1.5 text-sm" : "mt-1.5 text-sm"
          }`}
        >
          <Link href={listingHref} className="focus:outline-hidden">
            <span className="absolute inset-0" aria-hidden="true" />
            {listing.title}
          </Link>
        </h3>

        <div
          className={`mt-auto text-muted flex items-center gap-1 sm:gap-1.5 ${
            isCompact ? "pt-2 sm:pt-3 text-[11px] sm:text-xs" : "pt-3 text-xs"
          }`}
        >
          <MapPin
            className={`shrink-0 ${isCompact ? "h-3 w-3 sm:h-3.5 sm:w-3.5" : "h-3.5 w-3.5"}`}
            aria-hidden="true"
          />
          <span className="truncate">
            {listing.locality?.name
              ? `${listing.locality.name}, ${listing.city?.name}`
              : listing.city?.name}
          </span>
        </div>
      </div>
    </div>
  );
}
