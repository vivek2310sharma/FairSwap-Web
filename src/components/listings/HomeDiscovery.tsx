"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { Category, SearchFilters } from "@/types/listing";
import { discoveryHref, homeAreaHref, type PublicArea } from "@/lib/location/discovery";
import { buttonVariants } from "@/components/ui/button";
import { CategoryBento } from "@/components/home/CategoryBento";
import { FairSwapHeroArtwork, FairSwapHeroPair } from "@/components/home/FairSwapHeroArtwork";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

const SAFETY_REMINDERS = ["Meet in a public place", "Inspect the item first", "Never pay advance UPI fees"];

/**
 * The selected public area lives in the homepage URL (`/?city=&locality=`) so the server-rendered
 * "Fresh Finds" feed and this hero always agree. Keyword and category searches still go to /search.
 */
export function HomeDiscovery({ categories, initialArea = null, initialFilters = {}, restoreSaved = true }: {
  categories: Pick<Category, "id" | "slug" | "name">[];
  initialArea?: PublicArea | null;
  initialFilters?: SearchFilters;
  restoreSaved?: boolean;
}) {
  const router = useRouter();
  const area = initialArea;
  const [query, setQuery] = useState(initialFilters.q || "");
  const href = (category = initialFilters.category) => discoveryHref({ q: query, category }, area);
  return <section className="fs-hero">
    <div className="mx-auto max-w-7xl px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-8 lg:px-8 lg:pb-8 lg:pt-10">
      <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <div className="min-w-0">
          <h1 className="wrap-break-word text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">Find more. Share more. <span className="text-primary">Trust more.</span></h1>
          <p className="mt-2 text-sm text-muted sm:text-base">Pre-loved finds from people near you, across India.</p>
          <div className="mt-4 rounded-3xl border border-border bg-card p-2.5 shadow-sm sm:p-3">
            <form action="/search" onSubmit={event => { event.preventDefault(); router.push(href()); }} className="flex min-h-12 min-w-0 items-center rounded-2xl border border-border bg-background transition-colors focus-within:border-(--fs-focus) focus-within:outline-2 focus-within:outline-(--fs-focus)" role="search">
              {area && <><input type="hidden" name="city" value={area.city} />{area.locality && <input type="hidden" name="locality" value={area.locality} />}</>}
              <label htmlFor="home-keywords" className="sr-only">Search items</label>
              <input id="home-keywords" type="search" name="q" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Phone, bike, sofa..." className="min-h-12 min-w-0 flex-1 rounded-l-2xl bg-transparent px-4 text-base text-foreground placeholder:text-muted focus:outline-none" />
              <button type="submit" aria-label="Search" className={buttonVariants({ variant: "primary", size: "lg", className: "m-1 min-h-11 min-w-[48px] rounded-xl px-3 sm:px-6" })}><Search className="h-5 w-5 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline" aria-hidden="true">Search</span></button>
            </form>
            <div className="mt-2">
              <DiscoveryLocationSelector
                summaryId="location"
                area={area}
                restoreSaved={restoreSaved}
                onRestore={value => router.replace(homeAreaHref(value), { scroll: false })}
                onConfirm={value => router.push(homeAreaHref(value), { scroll: false })}
              />
            </div>
          </div>
          <ul aria-label="Safety reminders" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted sm:text-sm">
            {SAFETY_REMINDERS.map(text => <li key={text} className="flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{text}</li>)}
          </ul>
          <FairSwapHeroPair />
        </div>
        <div className="hidden items-end justify-center gap-3 lg:flex">
          <FairSwapHeroArtwork side="left" />
          <FairSwapHeroArtwork side="right" />
        </div>
      </div>
      <div id="categories" className="mt-4 scroll-mt-20 rounded-3xl border border-border bg-card p-3 shadow-sm sm:mt-6 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">Browse Categories</h2>
          <Link href={discoveryHref({}, area)} className={buttonVariants({ variant: "link", className: "shrink-0 px-2" })}>All ads</Link>
        </div>
        {categories.length
          ? <CategoryBento categories={categories} hrefFor={slug => href(slug)} />
          : <p className="py-4 text-sm text-muted">Categories are unavailable right now. <Link href="/search" className="text-link underline">Browse all ads</Link></p>}
      </div>
    </div>
  </section>;
}
