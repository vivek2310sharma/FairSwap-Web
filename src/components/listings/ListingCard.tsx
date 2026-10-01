import Link from "next/link";
import Image from "next/image";
import { MapPin, Tag } from "lucide-react";
import { PublicListingCard } from "@/types/listing";
import { FavouriteButton } from "./FavouriteButton";

interface ListingCardProps {
  listing: PublicListingCard;
  isFavourited?: boolean;
}

export function ListingCard({ listing, isFavourited = false }: ListingCardProps) {
  const formattedPrice =
    listing.price_type === "free"
      ? "Free"
      : listing.price_paise !== null && listing.price_paise !== undefined
      ? `₹${(listing.price_paise / 100).toLocaleString("en-IN")}`
      : "Price on request";

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

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-all hover:border-brand-300 hover:shadow-md dark:hover:border-brand-700">
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
            unoptimized={true}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <Tag className="h-10 w-10 stroke-1 opacity-50" aria-hidden="true" />
          </div>
        )}

        {/* Condition Tag */}
        {listing.condition && (
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
            {conditionLabels[listing.condition] || listing.condition}
          </span>
        )}

        {/* Favourite Button */}
        <div className="absolute top-2 right-2">
          <FavouriteButton listingId={listing.id} initialIsFavourited={isFavourited} />
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-foreground">{formattedPrice}</span>
          {listing.category?.name && (
            <span className="truncate text-xs font-medium text-muted">
              {listing.category.name}
            </span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-brand-600">
          <Link href={`/listings/${listing.slug}`} className="focus:outline-hidden">
            <span className="absolute inset-0" aria-hidden="true" />
            {listing.title}
          </Link>
        </h3>

        <div className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
