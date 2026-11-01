"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { getSavedListingsAction } from "@/app/saved/actions";
import { ListingCard } from "@/components/listings/ListingCard";
import { useOptionalAuth } from "@/components/providers/AuthProvider";
import { buttonVariants } from "@/components/ui/button";
import { isGuestStoragePersistent, removeGuestFavourites, useGuestFavourites } from "@/lib/favourites/guest";
import type { SavedListingCard } from "@/lib/favourites/types";

/** Public "Saved on this device" page. Listing data is re-fetched from the server (public fields only); the ids never leave the device except as a lookup. */
export function GuestFavouritesView() {
  const ids = useGuestFavourites();
  const auth = useOptionalAuth();
  const [known, setKnown] = useState<Record<string, SavedListingCard | null>>({});
  const [error, setError] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    const missing = ids.filter((id) => !(id in known));
    if (missing.length === 0) return;
    let cancelled = false;
    getSavedListingsAction(missing)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) { setError(result.error); return; }
        setError(null);
        setKnown((previous) => {
          const next = { ...previous };
          for (const card of result.listings) next[card.id] = card;
          for (const id of result.unavailableIds) next[id] = null;
          return next;
        });
      })
      .catch(() => { if (!cancelled) setError("Saved ads could not be loaded right now."); });
    return () => { cancelled = true; };
    // `key` is the stable identity of `ids`; `ids` itself changes identity only with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, known]);

  const cards = ids.map((id) => known[id]).filter((card): card is SavedListingCard => !!card);
  const unavailable = ids.filter((id) => known[id] === null);
  const loading = !error && ids.some((id) => !(id in known));
  const signedIn = !!auth?.user;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Saved on this device</h1>
          <p className="mt-1 text-sm text-muted">These ads are remembered by this browser only. They are not in a FairSwap account.</p>
        </div>
        <Link href="/search" className={buttonVariants({ variant: "link", className: "px-0" })}><Search className="h-4 w-4" aria-hidden="true" />Browse ads</Link>
      </div>

      {!isGuestStoragePersistent() && ids.length > 0 && (
        <p role="note" className="mb-4 rounded-xl border border-notice-border bg-notice-bg p-3 text-sm text-notice-text">Your browser is blocking device storage, so these saves last only until you close or refresh this page.</p>
      )}

      {signedIn ? (
        <p className="mb-4 text-sm text-muted">You are signed in. <Link href="/account/favourites" className="font-semibold text-link underline">Open your account favourites</Link> to add these to your account.</p>
      ) : ids.length > 0 && (
        <p className="mb-4 text-sm text-muted"><Link href="/auth/sign-in?next=/account/favourites" className="font-semibold text-link underline">Sign in</Link> to add these to your account. Nothing is synced unless you choose to.</p>
      )}

      {error && <p role="alert" className="mb-4 rounded-xl border border-border bg-card p-3 text-sm text-foreground">{error}</p>}

      {unavailable.length > 0 && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-notice-border bg-notice-bg p-3 text-sm text-notice-text">
          <span>{unavailable.length} saved {unavailable.length === 1 ? "ad is" : "ads are"} no longer available.</span>
          <button type="button" onClick={() => removeGuestFavourites(unavailable)} className={buttonVariants({ variant: "secondary", size: "sm" })}>Remove from this device</button>
        </div>
      )}

      {cards.length > 0 ? (
        <ul aria-label="Saved ads" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {cards.map((card) => <li key={card.id}><ListingCard listing={card} variant="editorial" favouriteStore="device" /></li>)}
        </ul>
      ) : loading ? (
        <p role="status" className="text-sm text-muted">Loading your saved ads…</p>
      ) : ids.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-rose-500" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-foreground">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Tap the heart on any ad to keep it here. No account needed.</p>
          <Link href="/search" className={buttonVariants({ variant: "primary", className: "mt-5" })}>Explore ads</Link>
        </div>
      ) : null}
    </div>
  );
}
