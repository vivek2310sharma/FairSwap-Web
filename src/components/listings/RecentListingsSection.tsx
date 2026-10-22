"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicListingCard } from "@/types/listing";
import { ListingCard } from "./ListingCard";
import { Sparkles } from "lucide-react";

export function RecentListingsSection() {
  const [listings, setListings] = useState<PublicListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings/recent")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items) {
          setListings(data.items.slice(0, 8));
        }
      })
      .catch(() => {
        // fail gracefully
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="border-t border-border bg-surface/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-link" aria-hidden="true" />
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Recent Verified Listings
            </h2>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl border border-border bg-card/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-link" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Recent Verified Listings
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Recently approved local classifieds available for purchase
            </p>
          </div>
          <Link
            href="/search"
            className="text-xs font-semibold text-brand-link hover:underline flex items-center gap-1"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  );
}
