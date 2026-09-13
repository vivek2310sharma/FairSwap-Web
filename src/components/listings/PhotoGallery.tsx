"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  thumbnail_storage_path: string | null;
  medium_storage_path: string | null;
  large_storage_path: string | null;
  width: number | null;
  height: number | null;
  display_order: number;
}

interface PhotoGalleryProps {
  listingId: string;
  title: string;
  media: MediaItem[];
}

export function PhotoGallery({ listingId, title, media }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const nextPhoto = useCallback(() => {
    if (media.length > 1) {
      setSelectedIndex((prev) => (prev + 1) % media.length);
    }
  }, [media.length]);

  const prevPhoto = useCallback(() => {
    if (media.length > 1) {
      setSelectedIndex((prev) => (prev - 1 + media.length) % media.length);
    }
  }, [media.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPhoto, prevPhoto]);

  if (!media || media.length === 0) {
    return (
      <div className="flex aspect-4/3 w-full items-center justify-center rounded-2xl border border-border bg-neutral-100 text-muted dark:bg-neutral-800">
        <div className="text-center">
          <ImageIcon className="mx-auto h-12 w-12 opacity-50" aria-hidden="true" />
          <p className="mt-2 text-sm">No photographs provided</p>
        </div>
      </div>
    );
  }

  const currentMedia = media[selectedIndex];
  const mainPhotoUrl = `/api/listings/${listingId}/media/${currentMedia.id}/large`;

  return (
    <div className="flex flex-col gap-3">
      {/* Main Large Photo Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-black/5 dark:bg-black/40">
        <Image
          src={mainPhotoUrl}
          alt={`${title} - Photo ${selectedIndex + 1} of ${media.length}`}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-contain object-center"
          unoptimized={true}
          priority={selectedIndex === 0}
        />

        {/* Carousel controls if multi-photo */}
        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevPhoto}
              aria-label="Previous photograph"
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-opacity hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={nextPhoto}
              aria-label="Next photograph"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white transition-opacity hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Photo Counter */}
            <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-xs">
              {selectedIndex + 1} / {media.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {media.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
          role="tablist"
          aria-label="Photo thumbnails"
        >
          {media.map((item, idx) => {
            const thumbUrl = `/api/listings/${listingId}/media/${item.id}/thumb`;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`View photo ${idx + 1}`}
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus:outline-none ${
                  isSelected
                    ? "border-brand-600 ring-2 ring-brand-500/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover object-center"
                  unoptimized={true}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
