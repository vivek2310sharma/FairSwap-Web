/**
 * Replaceable artwork slots for the first-visit intro and the homepage hero.
 *
 * Setting `FAIRSWAP_ART` to `null` disables both the intro and the hero figures;
 * the homepage works without them. To replace the art, drop optimized transparent
 * WebP/AVIF files under `public/animations/fairswap-intro/` and update the paths.
 * Every slot is required so a half-finished set can never show an unfinished scene.
 */
export type FairSwapArtImage = {
  /** Public path, e.g. `/animations/fairswap-intro/arjun-walk.webp`. */
  src: string;
  /** Optional AVIF source preferred over `src` by `<picture>`. */
  avif?: string;
  width: number;
  height: number;
};

export type FairSwapArt = {
  /** Intro poses. */
  left: FairSwapArtImage;
  right: FairSwapArtImage;
  handshake: FairSwapArtImage;
  /** Items exchanged in the centre. */
  itemLeft: FairSwapArtImage;
  itemRight: FairSwapArtImage;
  /** Hero poses: the same characters as the intro. */
  heroLeft: FairSwapArtImage;
  heroRight: FairSwapArtImage;
};

const DIR = "/animations/fairswap-intro";

export const FAIRSWAP_ART: FairSwapArt | null = {
  left: { src: `${DIR}/man-walk-01-720w.webp`, width: 720, height: 1188 },
  right: { src: `${DIR}/woman-walk-01-720w.webp`, width: 720, height: 1245 },
  handshake: { src: `${DIR}/handshake-duo-720w.webp`, width: 720, height: 856 },
  itemLeft: { src: `${DIR}/laptop-720w.webp`, width: 720, height: 474 },
  itemRight: { src: `${DIR}/headphones-720w.webp`, width: 425, height: 479 },
  heroLeft: { src: `${DIR}/man-hero-720w.webp`, width: 720, height: 1405 },
  heroRight: { src: `${DIR}/woman-hero-720w.webp`, width: 704, height: 1521 },
};

const REQUIRED: (keyof FairSwapArt)[] = ["left", "right", "handshake", "itemLeft", "itemRight", "heroLeft", "heroRight"];

/** True only when every slot has a usable image; partial sets are ignored. */
export function isCompleteArt(art: Partial<FairSwapArt> | null | undefined): art is FairSwapArt {
  return !!art && REQUIRED.every((key) => {
    const image = art[key];
    return !!image && typeof image.src === "string" && image.src.startsWith("/animations/fairswap-intro/") && image.width > 0 && image.height > 0;
  });
}