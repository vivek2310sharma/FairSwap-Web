"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function ChatV2Thumbnail({ listingId, photoId, label }: { listingId: string; photoId: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
    {photoId && !failed
      // The existing guarded media route authenticates access; never use storage URLs.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={`/api/listings/${listingId}/media/${photoId}/thumb`} width={56} height={56} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      : <ImageOff aria-label={label} role="img" className="h-5 w-5 text-muted" />}
  </span>;
}
