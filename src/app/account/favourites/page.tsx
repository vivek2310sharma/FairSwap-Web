import { redirect } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { ClearUnavailableButton } from "./ClearUnavailableButton";
import { createClient } from "@/lib/supabase/server";
import { getUserFavourites } from "@/lib/discovery/queries";
import { Heart, Search, AlertCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Favourites — FairSwap",
  description: "View and manage your saved local classifieds advertisements.",
};

export default async function FavouritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/sign-in?next=/account/favourites");
  }

  const { activeListings, unavailableIds } = await getUserFavourites(user.id);

  return (
    <>
      <main className="flex-1 bg-surface/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Saved Favourites
              </h1>
              <p className="mt-1 text-xs text-muted">
                Keep track of items you are interested in exploring or purchasing.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-link hover:underline"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Browse more listings &rarr;
            </Link>
          </div>

          {/* Unavailable Items Notice if any */}
          {unavailableIds.length > 0 && (
            <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50/80 p-5 shadow-xs dark:border-amber-700 dark:bg-amber-950/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      {unavailableIds.length} saved {unavailableIds.length === 1 ? "item is" : "items are"} no longer available
                    </h2>
                    <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                      Some items were marked sold, expired, paused by the seller, or removed by moderation.
                      Their details are withheld to protect seller privacy.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 sm:ml-auto">
                  <ClearUnavailableButton unavailableIds={unavailableIds} />
                </div>
              </div>
            </div>
          )}

          {/* Active Favourites Grid */}
          {activeListings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {activeListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} isFavourited={true} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
                <Heart className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">
                No active favourites saved
              </h2>
              <p className="mt-2 text-xs text-muted max-w-sm mx-auto leading-relaxed">
                When you find an item you like, tap the heart icon on its card or detail page to save it here for quick access.
              </p>
              <div className="mt-6">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 rounded-lg bg-action-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-action-700"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  Explore Classifieds
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
