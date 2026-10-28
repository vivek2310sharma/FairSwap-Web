"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Eye, MapPin, Search } from "lucide-react";
import type { Category, SearchFilters } from "@/types/listing";
import { discoveryHref, homeAreaHref, type PublicArea } from "@/lib/location/discovery";
import { buttonVariants } from "@/components/ui/button";
import { CategoryBento } from "@/components/home/CategoryBento";
import { ProductCollage } from "@/components/home/ProductCollage";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

const SAFETY_REMINDERS = [
  { icon: MapPin, text: "Meet in a public place" },
  { icon: Eye, text: "Inspect before paying" },
  { icon: Ban, text: "Avoid advance UPI payments" },
] as const;
const MAP_TEXTURE = "/animations/fairswap-neighbourhood-v4/neighbourhood-map-desktop.svg";

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
  return <>
  <section className="fs-hero relative overflow-hidden">
    {/* Decorative provided map texture, faint, never a real map. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={MAP_TEXTURE} alt="" aria-hidden="true" width={1440} height={820} loading="lazy" decoding="async" data-testid="hero-map-texture" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-none opacity-[0.07] sm:block dark:opacity-[0.12]" />
    <div className="relative mx-auto max-w-7xl px-4 pb-3 pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8">
      <div className="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_38%] lg:grid-cols-[42%_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="relative pr-[33%] sm:pr-0">
            {/* Phones: one primary photo with a small satellite beside the copy keeps the hero short. */}
            <div className="absolute inset-y-0 right-0 w-[30%] sm:hidden"><ProductCollage variant="compact" /></div>
          <h1 className="wrap-break-word text-[1.4rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[2.5rem]">Good things, <span className="text-primary">closer to you.</span></h1>
          <p className="mt-1.5 text-xs leading-snug text-muted sm:text-base">Discover useful finds from people around you. Buy, sell and explore locally.</p>
          </div>
          <div className="mt-3 rounded-3xl border border-border bg-card p-2 shadow-sm sm:p-2.5">
            <form action="/search" onSubmit={event => { event.preventDefault(); router.push(href()); }} className="flex min-h-11 min-w-0 items-center rounded-2xl border border-border bg-background transition-colors focus-within:border-(--fs-focus) focus-within:outline-2 focus-within:outline-(--fs-focus)" role="search">
              {area && <><input type="hidden" name="city" value={area.city} />{area.locality && <input type="hidden" name="locality" value={area.locality} />}</>}
              <label htmlFor="home-keywords" className="sr-only">Search items</label>
              <input id="home-keywords" type="search" name="q" maxLength={100} value={query} onChange={e => setQuery(e.target.value)} placeholder="Phone, bike, sofa..." className="min-h-11 min-w-0 flex-1 rounded-l-2xl bg-transparent px-4 text-base text-foreground placeholder:text-muted focus:outline-none" />
              <button type="submit" aria-label="Search" className={buttonVariants({ variant: "primary", size: "lg", className: "m-0.5 min-h-11 min-w-[48px] rounded-xl px-3 sm:px-6" })}><Search className="h-5 w-5 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline" aria-hidden="true">Search</span></button>
            </form>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3">
              <DiscoveryLocationSelector
                summaryId="location"
                area={area}
                restoreSaved={restoreSaved}
                onRestore={value => router.replace(homeAreaHref(value), { scroll: false })}
                onConfirm={value => router.push(homeAreaHref(value), { scroll: false })}
              />
              {/* Scrolls to real listings; never requests GPS or device location. */}
              <a href="#fresh-finds" className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-link hover:underline">Explore nearby</a>
            </div>
          </div>
        </div>
        <div className="hidden sm:block sm:min-h-44">
          <ProductCollage variant="wide" />
        </div>
      </div>
    </div>
  </section>
  <ul aria-label="Safety reminders" className="mx-auto flex max-w-7xl gap-x-6 gap-y-1 overflow-x-auto border-y border-border px-4 py-1 text-xs font-semibold text-muted sm:justify-center sm:px-6 sm:text-sm lg:px-8">
    {SAFETY_REMINDERS.map(({ icon: Icon, text }) => <li key={text} className="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap"><Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{text}</li>)}
  </ul>
  <div id="categories" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-4 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">Explore categories</h2>
      <Link href={discoveryHref({}, area)} className={buttonVariants({ variant: "link", className: "shrink-0 px-2" })}>All ads</Link>
    </div>
    {categories.length
      ? <CategoryBento categories={categories} hrefFor={slug => href(slug)} />
      : <p className="py-4 text-sm text-muted">Categories are unavailable right now. <Link href="/search" className="text-link underline">Browse all ads</Link></p>}
  </div>
  </>;
}
