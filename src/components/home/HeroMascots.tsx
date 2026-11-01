import Image from "next/image";

const BASE = "/animations/fairswap-intro";

/**
 * The approved FairSwap mascots (green-hoodie man with laptop, woman with headphones and brown bag), served locally as WebP.
 * Intrinsic sizes are fixed so the artwork never shifts layout. Decorative: the headline and search carry the meaning.
 * Phones keep a small pair beside the headline; `wide` (sm and up) is the full-size pair.
 */
export function HeroMascots({ variant }: { variant: "compact" | "wide" }) {
  if (variant === "compact") {
    return (
      <div aria-hidden="true" data-testid="mascots-mobile" className="pointer-events-none relative flex h-full w-full items-end justify-center">
        <Image src={`${BASE}/man-hero-360w.webp`} alt="" width={360} height={702} sizes="64px" priority className="-mr-3 h-[88%] w-auto" />
        <Image src={`${BASE}/woman-hero-360w.webp`} alt="" width={360} height={778} sizes="64px" priority className="h-full w-auto" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-testid="mascots-wide" className="pointer-events-none flex h-full min-h-44 w-full items-end justify-center gap-2 lg:gap-6">
      <Image src={`${BASE}/man-hero-480w.webp`} alt="" width={480} height={937} sizes="(max-width: 1023px) 18vw, 14vw" priority className="h-[16rem] w-auto lg:h-[19rem]" />
      <Image src={`${BASE}/woman-hero-480w.webp`} alt="" width={480} height={1037} sizes="(max-width: 1023px) 18vw, 14vw" priority className="h-[17rem] w-auto lg:h-[20.5rem]" />
    </div>
  );
}
