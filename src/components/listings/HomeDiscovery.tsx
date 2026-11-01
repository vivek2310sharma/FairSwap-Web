"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Eye, MapPin, Search } from "lucide-react";
import type { Category, SearchFilters } from "@/types/listing";
import { discoveryHref, homeAreaHref, type PublicArea } from "@/lib/location/discovery";
import { buttonVariants } from "@/components/ui/button";
import { CategoryBento } from "@/components/home/CategoryBento";
import { HeroMascots } from "@/components/home/HeroMascots";
import { HomeSearchInput } from "./HomeSearchSuggestions";
import { DiscoveryLocationSelector } from "./DiscoveryLocationSelector";

const SAFETY_REMINDERS = [
  { icon: MapPin, text: "Meet in a public place", hint: "Pick a busy spot; bring a friend if you can.", tone: "bg-primary/10 text-primary" },
  { icon: Eye, text: "Inspect before paying", hint: "Check the item in person first.", tone: "bg-sky-100 text-sky-800" },
  { icon: Ban, text: "Avoid advance UPI payments", hint: "Never scan a QR or approve a collect request to receive money.", tone: "bg-amber-100 text-amber-900" },
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
    <img src={MAP_TEXTURE} alt="" aria-hidden="true" width={1440} height={820} loading="lazy" decoding="async" data-testid="hero-map-texture" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-none opacity-[0.07] sm:block" />
    <div className="fs-container relative pb-3 pt-3 sm:pb-5 sm:pt-5">
      <div className="grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_38%] lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-center">
          <div className="relative pr-[33%] sm:pr-0">
            {/* Phones: one primary photo with a small satellite beside the copy keeps the hero short. */}
            <div className="absolute inset-y-0 right-0 w-[30%] sm:hidden"><HeroMascots variant="compact" /></div>
          <h1 className="wrap-break-word text-[1.4rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-center lg:text-[2.5rem]">Good things, <span className="text-primary">closer to you.</span></h1>
          <p className="mt-1.5 text-xs leading-snug text-muted sm:text-base lg:text-center">Discover useful finds from people around you. Buy, sell and explore locally.</p>
          </div>
          <div className="mt-3 rounded-3xl border border-border bg-card p-2 shadow-sm sm:p-2.5">
            <form action="/search" onSubmit={event => { event.preventDefault(); router.push(href()); }} className="flex min-h-11 min-w-0 items-center rounded-2xl border border-border bg-background transition-colors focus-within:border-(--fs-focus) focus-within:outline-2 focus-within:outline-(--fs-focus)" role="search">
              {area && <><input type="hidden" name="city" value={area.city} />{area.locality && <input type="hidden" name="locality" value={area.locality} />}</>}
              <label htmlFor="home-keywords" className="sr-only">Search items</label>
              <HomeSearchInput id="home-keywords" categories={categories} value={query} onChange={setQuery} onPickCategory={slug => router.push(discoveryHref({ category: slug }, area))} placeholder="Phone, bike, sofa..." className="min-h-11 w-full min-w-0 rounded-l-2xl bg-transparent px-4 text-base text-foreground placeholder:text-muted focus:outline-none" />
              <button type="submit" aria-label="Search" className={buttonVariants({ variant: "primary", size: "lg", className: "m-0.5 min-h-11 min-w-[48px] rounded-xl px-3 sm:px-6" })}><Search className="h-5 w-5 sm:hidden" aria-hidden="true" /><span className="hidden sm:inline" aria-hidden="true">Search</span></button>
            </form>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 max-[360px]:gap-x-1">
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
        <div className="hidden sm:block sm:min-h-44 lg:contents">
          <HeroMascots variant="wide" />
        </div>
      </div>
    </div>
  </section>
  <div className="fs-container pt-3">
    <ul aria-label="Safety reminders" className="fs-snap-row flex gap-2 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible">
      {SAFETY_REMINDERS.map(({ icon: Icon, text, hint, tone }) => (
        <li key={text} className="min-w-[15.5rem] shrink-0 sm:min-w-0">
          <Link href="/safety" className="group flex h-full min-h-11 items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fs-focus) motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block text-sm font-bold text-foreground">{text}</span><span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
  <div id="categories" className="fs-container scroll-mt-20 pt-4">
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
