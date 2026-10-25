"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ShoppingBag, Smartphone, Monitor, Sofa, Shirt, Baby, BookOpen, Bike, Car, House, Dumbbell, Refrigerator, Camera, Music } from "lucide-react";
import type { Category } from "@/types/listing";
import { buttonVariants } from "@/components/ui/button";
import { getCategoryImagePath } from "@/lib/categories/category-images";

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

// Bento rhythm: index 0 is the lead tile, 3 and 6 are wide, the rest are small.
// On the 4-column grid the first nine tiles plus the toggle fill four full rows.
const SHAPES = ["lead", "", "", "wide", "", "", "wide", "", ""] as const;
const TONES = ["ink", "a", "b", "c", "b", "a", "c", "b", "a"] as const;
const PREVIEW_COUNT = SHAPES.length;

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
    <ul id="home-category-grid" className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {visible.map((category, index) => {
        const Icon = categoryIcon(category.slug);
        const shape = SHAPES[index] ?? "";
        const tone = TONES[index % TONES.length];
        const lead = shape === "lead";
        const imagePath = getCategoryImagePath(category.slug);
        return (
          <li key={category.id} className={lead ? "col-span-2 sm:row-span-2" : shape === "wide" ? "col-span-2" : ""}>
            <Link
              href={hrefFor(category.slug)}
              prefetch={false}
              data-tone={tone}
              data-image={imagePath ? "true" : undefined}
              style={{ "--i": Math.min(index, 10) } as CSSProperties}
              className={`fs-tile fs-rise group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-4 focus-visible:outline-2 focus-visible:outline-(--fs-focus) ${lead ? "min-h-40 sm:min-h-64 sm:p-6" : "min-h-28 sm:min-h-32"}`}
            >
              {imagePath && (
                <>
                  <Image
                    src={imagePath}
                    alt=""
                    fill
                    sizes={lead ? "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, 29vw" : "(max-width: 639px) 50vw, (max-width: 1023px) 25vw, 16vw"}
                    loading={lead ? "eager" : "lazy"}
                    className="pointer-events-none absolute inset-0 object-cover object-center motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
                  />
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/15" />
                </>
              )}
              <span className="relative z-10 flex items-start justify-between gap-2">
                <span className="fs-tile-icon"><Icon strokeWidth={1.75} className={lead ? "h-7 w-7" : "h-5 w-5"} aria-hidden="true" /></span>
                <ArrowUpRight className="h-5 w-5 shrink-0 opacity-60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
              </span>
              <span className={`relative z-10 wrap-break-word font-bold leading-snug tracking-tight ${lead ? "mt-6 text-2xl sm:text-3xl" : "mt-4 text-sm sm:text-base"}`}>{category.name}</span>
              {lead && !imagePath && <Icon aria-hidden="true" strokeWidth={1} className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-10 sm:h-44 sm:w-44" />}
            </Link>
          </li>
        );
      })}
      {categories.length > PREVIEW_COUNT && (
        <li className="col-span-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="home-category-grid"
            onClick={() => setExpanded(!expanded)}
            className={buttonVariants({ variant: "secondary", size: "lg", className: "h-full min-h-20 w-full rounded-3xl border-dashed" })}
          >
            {expanded ? "Show fewer categories" : "View all categories"}
          </button>
        </li>
      )}
    </ul>
  );
}
