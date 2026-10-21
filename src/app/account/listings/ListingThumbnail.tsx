"use client";

import { useState } from "react";
import Image from "next/image";
import { Tag } from "lucide-react";

interface ListingThumbnailProps {
  listingId: string;
  coverPhotoId: string | null;
  title: string;
}

export function ListingThumbnail({
  listingId,
  coverPhotoId,
  title,
}: ListingThumbnailProps) {
  const [hasError, setHasError] = useState(false);

  const thumbUrl =
    coverPhotoId && !hasError
      ? `/api/listings/${listingId}/media/${coverPhotoId}/thumb`
      : null;

  if (!thumbUrl) {
    return (
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
        aria-label={`Placeholder for ${title}`}
        role="img"
      >
        <Tag className="h-6 w-6 stroke-1 opacity-60" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
      <Image
        src={thumbUrl}
        alt={`Thumbnail for ${title}`}
        fill
        sizes="80px"
        className="object-cover object-center"
        unoptimized={true}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
