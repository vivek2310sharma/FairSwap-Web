"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types/listing";
import { buttonVariants } from "@/components/ui/button";
import { getCategoryImagePath } from "@/lib/categories/category-images";

const FEATURED_COUNT = 8;
// Fixture/seed labels must never become decorative homepage shortcuts (they stay in the full directory).
const FIXTURE_PATTERN = /(^|[\s_-])(fs[\s_-]*test|test|seed|fixture|dummy|sample)([\s_-]|$)|\d{6,}/i;

type Item = Pick<Category, "id" | "slug" | "name">;

/** Real categories that have curated photography and are not test/fixture entries. */
export function featuredCategories(categories: Item[]): Item[] {
  return categories
    .filter((category) => getCategoryImagePath(category.slug) && !FIXTURE_PATTERN.test(`${category.name} ${category.slug}`))
    .slice(0, FEATURED_COUNT);
}

/**
 * "Explore categories" rail: 6-8 pictured real categories as a compact swipeable photo rail. The full directory of
 * every active category stays one tap away via the toggle, including categories without a photo.
 */
export function CategoryBento({ categories, hrefFor }: { categories: Item[]; hrefFor: (slug: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const featured = featuredCategories(categories);
  return (
    <>
      <ul id="home-category-rail" className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1 sm:gap-3">
        {featured.map((category, index) => {
          const imagePath = getCategoryImagePath(category.slug)!;
          return (
            <li key={category.id} className="w-[7.25rem] shrink-0 snap-start sm:min-w-0 sm:flex-1">
              <Link
                href={hrefFor(category.slug)}
                prefetch={false}
                data-image="true"
                className="group relative flex h-[6.5rem] flex-col justify-end overflow-hidden rounded-2xl bg-subtle p-2.5 ring-1 ring-border focus-visible:outline-2 focus-visible:outline-(--fs-focus)"
              >
                <Image
                  src={imagePath}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 116px, (max-width: 1023px) 18vw, 160px"
                  loading={index < 3 ? "eager" : "lazy"}
                  className="pointer-events-none absolute inset-0 object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                />
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <span className="relative z-10 wrap-break-word text-xs font-bold leading-snug text-white sm:text-sm">{category.name}</span>
              </Link>
            </li>
          );
        })}
        {categories.length > featured.length && (
          <li className="w-[7.25rem] shrink-0 snap-start sm:w-auto sm:min-w-28">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls="home-category-directory"
              onClick={() => setExpanded(!expanded)}
              className={buttonVariants({ variant: "secondary", size: "lg", className: "h-[6.5rem] w-full rounded-2xl border-dashed text-xs sm:text-sm" })}
            >
              {expanded ? "Show fewer categories" : "View all categories"}
            </button>
          </li>
        )}
      </ul>
      {expanded && (
        <ul id="home-category-directory" aria-label="All categories" className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={hrefFor(category.slug)} prefetch={false} className={buttonVariants({ variant: "secondary", size: "md", className: "min-h-11 rounded-full" })}>{category.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}