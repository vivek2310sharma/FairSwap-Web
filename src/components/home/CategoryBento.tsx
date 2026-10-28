"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types/listing";
import { buttonVariants } from "@/components/ui/button";
import { getCategoryImagePath } from "@/lib/categories/category-images";

// Uniform tiles: the first ten fill two full rows on the 5-column desktop grid
// and 2.5 rows on 4 columns, where the toggle completes the last row.
const TONES = ["a", "b", "c"] as const;
const PREVIEW_COUNT = 10;

export function CategoryBento({ categories, hrefFor }: {
  categories: Pick<Category, "id" | "slug" | "name">[];
  hrefFor: (slug: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  // Keep the supplied relative order, but never feature an unmatched/test category.
  const photographed = categories.filter((category) => getCategoryImagePath(category.slug));
  const unphotographed = categories.filter((category) => !getCategoryImagePath(category.slug));
  const ordered = [...photographed, ...unphotographed];
  const visible = expanded ? ordered : ordered.slice(0, PREVIEW_COUNT);
  return (
    // Phones get a swipeable rail (compact, keeps listings close to the top); sm+ is the grid.
    <ul id="home-category-grid" className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
      {visible.map((category, index) => {
        const imagePath = getCategoryImagePath(category.slug);
        return (
          <li key={category.id} className="w-36 shrink-0 snap-start sm:w-auto">
            <Link
              href={hrefFor(category.slug)}
              prefetch={false}
              data-tone={TONES[index % TONES.length]}
              data-image={imagePath ? "true" : undefined}
              style={{ "--i": Math.min(index, 10) } as CSSProperties}
              className="fs-tile fs-rise group relative flex aspect-4/3 flex-col justify-end overflow-hidden rounded-2xl p-3 focus-visible:outline-2 focus-visible:outline-(--fs-focus)"
            >
              {imagePath && (
                <>
                  <Image
                    src={imagePath}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 50vw, (max-width: 1023px) 25vw, 18vw"
                    loading={index < 4 ? "eager" : "lazy"}
                    className="pointer-events-none absolute inset-0 object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                </>
              )}
              <span className="relative z-10 wrap-break-word text-sm font-bold leading-snug tracking-tight sm:text-base">{category.name}</span>
            </Link>
          </li>
        );
      })}
      {categories.length > PREVIEW_COUNT && (
        <li className="w-36 shrink-0 snap-start sm:col-span-4 sm:w-auto lg:col-span-5">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="home-category-grid"
            onClick={() => setExpanded(!expanded)}
            className={buttonVariants({ variant: "secondary", size: "lg", className: "h-full min-h-14 w-full rounded-2xl border-dashed" })}
          >
            {expanded ? "Show fewer categories" : "View all categories"}
          </button>
        </li>
      )}
    </ul>
  );
}