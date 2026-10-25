"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, Smartphone, Monitor, Sofa, Shirt, Baby, BookOpen, Bike, Car, House, Dumbbell, Refrigerator, Camera, Music } from "lucide-react";
import type { Category, SearchFilters } from "@/types/listing";
import { discoveryHref, type PublicArea } from "@/lib/location/discovery";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

function categoryIcon(slug: string) {
  if (/mobile|tablet|phone/.test(slug)) return Smartphone;
  if (/computer|laptop|electronic/.test(slug)) return Monitor;
  if (/furniture|decor|kitchen/.test(slug)) return Sofa;
  if (/fashion|cloth|footwear|accessor/.test(slug)) return Shirt;
  if (/kids|baby|toy/.test(slug)) return Baby;
  if (/book|stationer/.test(slug)) return BookOpen;
  if (/sport|fitness/.test(slug)) return Dumbbell;
  if (/appliance/.test(slug)) return Refrigerator;
  if (/camera/.test(slug)) return Camera;
  if (/music|hobb/.test(slug)) return Music;
  if (/^tw-|bike|cycle/.test(slug)) return Bike;
  if (/^car-|vehicle/.test(slug)) return Car;
  if (/rental|property/.test(slug)) return House;
  return ShoppingBag;
}

export function HomeDiscovery({ categories, initialArea = null, initialFilters = {}, restoreSaved = true }: {
  categories: Pick<Category, "id" | "slug" | "name">[];
  initialArea?: PublicArea | null;
  initialFilters?: SearchFilters;
  restoreSaved?: boolean;
}) {
  const router = useRouter();
  const [area, setArea] = useState<PublicArea | null>(initialArea);
  const [query, setQuery] = useState(initialFilters.q || "");
  const [expanded, setExpanded] = useState(false);
  const href = (category = initialFilters.category) => discoveryHref({ q: query, category }, area);
  return <section className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pt-8 lg:px-8">
    <h1 className="sr-only">Buy &amp; sell locally on FairSwap.in</h1>
    <div className="grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_2fr]">
      <DiscoveryLocationSelector area={area} restoreSaved={restoreSaved} onRestore={setArea} onConfirm={value => { setArea(value); router.push(discoveryHref({ q: query, category: initialFilters.category }, value)); }} />
      <form action="/search" onSubmit={event => { event.preventDefault(); router.push(href()); }} className="flex min-h-12 min-w-0 items-center rounded-lg border border-border bg-background focus-within:outline-2 focus-within:outline-action-500" role="search">
        {area && <><input type="hidden" name="city" value={area.city} />{area.locality && <input type="hidden" name="locality" value={area.locality} />}</>}
        <label htmlFor="home-keywords" className="sr-only">Search items</label>
        <input id="home-keywords" type="search" name="q" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search mobiles, bikes, furniture and more" className="min-h-12 min-w-0 flex-1 rounded-l-lg bg-transparent px-3 text-sm text-foreground placeholder:text-muted focus:outline-none" />
        <button type="submit" aria-label="Search" className="m-1 flex min-h-11 min-w-11 items-center justify-center rounded-md bg-action-600 px-3 text-white hover:bg-action-700"><Search className="h-5 w-5" aria-hidden="true" /></button>
      </form>
    </div>
    <div id="categories" className="mt-7 scroll-mt-20">
      <h2 className="text-lg font-semibold text-foreground">Browse Categories</h2>
      {categories.length ? <>
        <ul id="home-category-grid" className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3 min-[360px]:grid-cols-4 sm:grid-cols-6 lg:grid-cols-7">
          {categories.map((category, index) => {
            const Icon = categoryIcon(category.slug);
            const visibility = expanded || index < 8 ? "" : index < 12 ? "hidden sm:block" : index < 14 ? "hidden lg:block" : "hidden";
            return <li key={category.id} className={visibility}>
              <Link href={href(category.slug)} prefetch={false} className="flex min-h-28 flex-col items-center justify-start gap-2 rounded-lg px-1 py-3 text-center text-xs font-medium text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-action-500 sm:text-sm">
                <span className="fs-category-icon shrink-0"><Icon strokeWidth={1.75} className="h-6 w-6" aria-hidden="true" /></span>
                <span className="break-words">{category.name}</span>
              </Link>
            </li>;
          })}
        </ul>
        <div className="mt-2 text-center"><button type="button" aria-expanded={expanded} aria-controls="home-category-grid" onClick={() => setExpanded(!expanded)} className="min-h-11 px-4 text-sm font-semibold text-brand-link">{expanded ? "Show fewer categories" : "View all categories"}</button></div>
      </> : <p className="py-4 text-sm text-muted">Categories are unavailable right now. <Link href="/search" className="underline">Browse all ads</Link></p>}
    </div>
  </section>;
}
