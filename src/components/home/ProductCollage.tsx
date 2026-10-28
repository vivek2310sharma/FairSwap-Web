import Image from "next/image";

/** Existing curated category photography only (allowlisted in lib/categories/category-images.ts). */
const PHOTOS = [
  { src: "/images/categories/furniture.webp" },
  { src: "/images/categories/mobiles-tablets.webp" },
  { src: "/images/categories/bicycles-sports.webp" },
  { src: "/images/categories/electronics-laptops-computers.webp" },
] as const;

const frame = "relative overflow-hidden rounded-2xl bg-subtle shadow-md ring-1 ring-border";

/**
 * Decorative product-led hero visual: real category photos, no people. `compact` (below `sm`) is one primary
 * photo with a small satellite sized to sit beside the headline; `wide` is the four-photo collage from `sm` up.
 * Only the first photo of each is eager; the rest are lazy.
 */
export function ProductCollage({ variant }: { variant: "compact" | "wide" }) {
  const [furniture, mobiles, bicycles, laptops] = PHOTOS;
  if (variant === "compact") {
    return (
      <div aria-hidden="true" data-testid="collage-mobile" className="pointer-events-none relative h-full w-full">
        <div className={`${frame} absolute inset-0`}>
          <Image src={mobiles.src} alt="" fill sizes="34vw" priority className="object-cover" />
        </div>
        <div className={`${frame} absolute bottom-1.5 left-1.5 h-[38%] w-[46%] ring-2 ring-card`}>
          <Image src={laptops.src} alt="" fill sizes="16vw" className="object-cover" />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-testid="collage-wide" className="pointer-events-none grid h-full w-full grid-cols-[1.1fr_1fr_1fr] grid-rows-2 gap-3">
      <div className={`${frame} row-span-2`}>
        <Image src={furniture.src} alt="" fill sizes="(max-width: 1023px) 30vw, 22vw" priority className="object-cover" />
      </div>
      <div className={frame}>
        <Image src={mobiles.src} alt="" fill sizes="(max-width: 1023px) 22vw, 16vw" loading="lazy" className="object-cover" />
      </div>
      <div className={`${frame} row-span-2`}>
        <Image src={bicycles.src} alt="" fill sizes="(max-width: 1023px) 22vw, 16vw" loading="lazy" className="object-cover" />
      </div>
      <div className={frame}>
        <Image src={laptops.src} alt="" fill sizes="(max-width: 1023px) 22vw, 16vw" loading="lazy" className="object-cover" />
      </div>
    </div>
  );
}
