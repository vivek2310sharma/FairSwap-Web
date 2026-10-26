"use client";

import { useState } from "react";
import { FAIRSWAP_ART, isCompleteArt, type FairSwapArt, type FairSwapArtImage } from "./fairswap-art";

function ArtImage({ image, onFail }: { image: FairSwapArtImage; onFail: () => void }) {
  return (
    <picture>
      {image.avif && <source srcSet={image.avif} type="image/avif" />}
      {/* Decorative, non-critical: lazy and async so it never competes with LCP. */}
      <img src={image.src} alt="" width={image.width} height={image.height} loading="lazy" decoding="async" onError={onFail} className="h-auto max-h-[26rem] w-full object-contain object-bottom" />
    </picture>
  );
}

/**
 * Hero characters (same art as the intro). Renders nothing unless the art set is
 * complete, and hides itself if any image fails, so it can never block the page.
 */
export function FairSwapHeroArtwork({ side, art = FAIRSWAP_ART }: { side: "left" | "right"; art?: FairSwapArt | null }) {
  const [failed, setFailed] = useState(false);
  if (failed || !isCompleteArt(art)) return null;
  const image = side === "left" ? art.heroLeft : art.heroRight;
  return (
    <div aria-hidden="true" data-testid={`hero-art-${side}`} className="pointer-events-none hidden w-40 shrink-0 self-end lg:block xl:w-48">
      <ArtImage image={image} onFail={() => setFailed(true)} />
    </div>
  );
}