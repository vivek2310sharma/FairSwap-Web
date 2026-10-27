"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert } from "lucide-react";
import type { Category, SearchFilters } from "@/types/listing";
import { discoveryHref, type PublicArea } from "@/lib/location/discovery";
import { buttonVariants } from "@/components/ui/button";
import { CategoryBento } from "@/components/home/CategoryBento";
import { FairSwapHeroArtwork, FairSwapHeroPair } from "@/components/home/FairSwapHeroArtwork";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

export function HomeDiscovery({ categories, initialArea = null, initialFilters = {}, restoreSaved = true }: {
  categories: Pick<Category, "id" | "slug" | "name">[];
  initialArea?: PublicArea | null;
  initialFilters?: SearchFilters;
  restoreSaved?: boolean;
}) {
  const router = useRouter();
  const [area, setArea] = useState<PublicArea | null>(initialArea);
  const [query, setQuery] = useState(initialFilters.q || "");
  const href = (category = initialFilters.category) => discoveryHref({ q: query, category }, area);
  return <section className="fs-hero">
    <div className="mx-auto max-w-[90rem] px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-10">
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,38rem)_minmax(0,1fr)]">
        <FairSwapHeroArtwork side="left" />
        <div className="mx-auto w-full max-w-2xl pb-2 text-center lg:max-w-none">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">Exchange. Share. <span className="text-primary">Discover.</span></h1>
          <div className="mt-5 rounded-3xl border border-border bg-card/95 p-3 text-left shadow-sm sm:p-4">
            <form action="/search" onSubmit={event => { event.preventDefault(); router.push(href()); }} className="flex min-h-14 min-w-0 items-center rounded-2xl border border-border bg-background transition-colors focus-within:border-(--fs-focus) focus-within:outline-2 focus-within:outline-(--fs-focus)" role="search">
              {area && <><input type="hidden" name="city" value={area.city} />{area.locality && <input type="hidden" name="locality" value={area.locality} />}</>}
              <label htmlFor="home-keywords" className="sr-only">Search items</label>
              <input id="home-keywords" type="search" name="q" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Phone, bike, sofa..." className="min-h-14 min-w-0 flex-1 rounded-l-2xl bg-transparent px-4 text-base text-foreground placeholder:text-muted focus:outline-none" />
              <button type="submit" aria-label="Search" className={buttonVariants({ variant: "primary", size: "lg", className: "m-1.5 min-w-[48px] rounded-xl px-3 sm:px-6" })}><Search className="h-5 w-5 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline" aria-hidden="true">Search</span></button>
            </form>
            <div className="mt-2">
              <DiscoveryLocationSelector area={area} restoreSaved={restoreSaved} onRestore={setArea} onConfirm={value => { setArea(value); router.push(discoveryHref({ q: query, category: initialFilters.category }, value)); }} />
            </div>
          </div>
          <p className="mt-3 flex items-start justify-center gap-2 text-left text-sm text-muted">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>No advance UPI payments, sharing OTPs or QR scans to receive money.</span>
          </p>
          <FairSwapHeroPair />
        </div>
        <FairSwapHeroArtwork side="right" />
      </div>
      <div id="categories" className="mt-6 scroll-mt-20 rounded-3xl border border-border bg-card/90 p-3 shadow-sm sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Browse Categories</h2>
          <Link href="/search" className={buttonVariants({ variant: "link", className: "shrink-0 px-2" })}>All ads</Link>
        </div>
        {categories.length
          ? <CategoryBento categories={categories} hrefFor={slug => href(slug)} />
          : <p className="py-4 text-sm text-muted">Categories are unavailable right now. <Link href="/search" className="text-link underline">Browse all ads</Link></p>}
      </div>
    </div>
  </section>;
}
