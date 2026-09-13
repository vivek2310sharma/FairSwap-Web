"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavouriteAction } from "@/app/account/favourites/actions";

interface FavouriteButtonProps {
  listingId: string;
  initialIsFavourited?: boolean;
  className?: string;
  showText?: boolean;
}

export function FavouriteButton({
  listingId,
  initialIsFavourited = false,
  className = "",
  showText = false,
}: FavouriteButtonProps) {
  const [isFavourited, setIsFavourited] = useState(initialIsFavourited);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic toggle
    const nextState = !isFavourited;
    setIsFavourited(nextState);

    startTransition(async () => {
      const result = await toggleFavouriteAction(listingId);
      if (!result.success) {
        // Revert optimistic update
        setIsFavourited(!nextState);
        if (result.error?.includes("sign in")) {
          router.push(`/auth/sign-in?next=/listings/${listingId}`);
        } else {
          alert(result.error || "Could not update favourite");
        }
      } else if (result.isFavourited !== undefined) {
        setIsFavourited(result.isFavourited);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavourited ? "Remove from favourites" : "Save to favourites"}
      className={`inline-flex items-center gap-1.5 rounded-full p-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        isFavourited
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-400"
          : "bg-surface/80 text-muted hover:bg-surface hover:text-foreground backdrop-blur-xs"
      } ${className}`}
    >
      <Heart
        className={`h-5 w-5 transition-transform ${isFavourited ? "fill-rose-500 text-rose-500 scale-110" : ""}`}
        aria-hidden="true"
      />
      {showText && <span>{isFavourited ? "Saved" : "Save"}</span>}
    </button>
  );
}
