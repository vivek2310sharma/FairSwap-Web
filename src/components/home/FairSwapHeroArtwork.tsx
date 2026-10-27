"use client";

import { useState } from "react";
import { FAIRSWAP_ART, isCompleteArt, type FairSwapArt, type FairSwapArtImage } from "./fairswap-art";

// Desktop figures are ~30rem tall (~250px wide); the mobile pair is ~40vw each.
const SIDE_SIZES = "(min-width: 1024px) 260px, 38vw";

function ArtImage({ image, onFail, className }: { image: FairSwapArtImage; onFail: () => void; className: string }) {
  return (
    <picture>
      {image.avif && <source srcSet={image.avif} type="image/avif" />}
      {/* Decorative, non-critical: lazy and async so it never competes with LCP, and a lazy image in a
          display:none ancestor is never fetched, so each breakpoint only downloads the art it shows. */}
      <img src={image.src} srcSet={image.srcSet} sizes={image.srcSet ? SIDE_SIZES : undefined} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" onError={onFail} className={className} />
    </picture>
  );
}

/**
 * Hero characters (same art as the intro). Renders nothing unless the art set is
 * complete, and hides itself if any image fails, so it can never block the page.
 * `side` figures flank the search from `lg`; `pair` is the compact below-`lg` composition.
 */
export function FairSwapHeroArtwork({ side, art = FAIRSWAP_ART }: { side: "left" | "right"; art?: FairSwapArt | null }) {
  const [failed, setFailed] = useState(false);
  if (failed || !isCompleteArt(art)) return null;
  const image = side === "left" ? art.heroLeft : art.heroRight;
  return (
    <div aria-hidden="true" data-testid={`hero-art-${side}`} className="pointer-events-none hidden self-end lg:block">
      <ArtImage image={image} onFail={() => setFailed(true)} className="mx-auto block h-[clamp(19rem,29vw,31rem)] w-auto max-w-none object-contain object-bottom" />
    </div>
  );
}

export function FairSwapHeroPair({ art = FAIRSWAP_ART }: { art?: FairSwapArt | null }) {
  const [failed, setFailed] = useState(false);
  if (failed || !isCompleteArt(art)) return null;
  return (
    <div aria-hidden="true" data-testid="hero-art-pair" className="pointer-events-none mt-4 flex items-end justify-between gap-4 px-2 lg:hidden">
      <ArtImage image={art.heroLeft} onFail={() => setFailed(true)} className="block h-[clamp(11rem,52vw,17rem)] w-auto max-w-[44vw] object-contain object-bottom" />
      <ArtImage image={art.heroRight} onFail={() => setFailed(true)} className="block h-[clamp(11rem,52vw,17rem)] w-auto max-w-[44vw] object-contain object-bottom" />
    </div>
  );
}
