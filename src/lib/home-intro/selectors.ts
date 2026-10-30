/**
 * V19 intro: randomisation and collision-aware motif layout, ported from the approved prototype
 * (validation/v19.exact.script.js). Pure and rng-injected so every rule is unit testable; production passes Math.random.
 * Palette, motif family, tagline, greetings and motif arrangement are chosen independently of one another.
 */
import { GREETING_CANDIDATES } from "./greetings";
import { MOTIF_FAMILIES, MOTIF_FAMILY_IDS, type MotifFamily } from "./motif-families";
import { MOTIFS } from "./motifs";
import { PALETTES, type IntroPalette } from "./palettes";
import { TAGLINES } from "./taglines";

export type Rng = () => number;
export type IntroDevice = "desktop" | "tablet" | "mobile";
export type Greeting = { text: string; lang: string };
export type Placement = { kind: string; x: number; y: number; size: number; duration: number; delay: number; floatX: number };
export type Box = { left: number; right: number; top: number; bottom: number };

/** Approved speed preset "Faster" (source `speed=.75`). Very Fast (1) is a review-only comparison preset. */
export const SPEED = 0.75;
export const HERO_GREETING = "नमस्ते";
export const GREETINGS_SHOWN = 15;
/** Mobile composition at this width and below; tablet below 1024. */
export const MOBILE_MAX_WIDTH = 639;
export const TABLET_MAX_WIDTH = 1023;
export const MAX_MOTIFS: Record<IntroDevice, number> = { desktop: 28, tablet: 21, mobile: 16 };
const PAD = 8;

export const deviceForWidth = (width: number): IntroDevice => (width <= MOBILE_MAX_WIDTH ? "mobile" : width <= TABLET_MAX_WIDTH ? "tablet" : "desktop");

/** Small seedable PRNG for tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const normaliseGreeting = (text: string) => text.normalize("NFC").trim().replace(/\s+/gu, " ");

/** A visible greeting is shown at most once: candidates that share a string stay recorded but yield one slide. */
export const DISTINCT_GREETINGS: readonly Greeting[] = (() => {
  const seen = new Set<string>();
  const out: Greeting[] = [];
  for (const [text, lang] of GREETING_CANDIDATES) {
    const key = normaliseGreeting(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, lang });
  }
  return out;
})();

/** नमस्ते always first, then fourteen independently shuffled unique strings. */
export function chooseGreetings(rng: Rng): Greeting[] {
  const hero = DISTINCT_GREETINGS.find((g) => g.text === HERO_GREETING)!;
  const others = shuffle(DISTINCT_GREETINGS.filter((g) => g.text !== HERO_GREETING), rng);
  return [hero, ...others.slice(0, GREETINGS_SHOWN - 1)];
}

export const chooseFamily = (rng: Rng): MotifFamily => MOTIF_FAMILY_IDS[Math.floor(rng() * MOTIF_FAMILY_IDS.length)];
export const chooseTheme = (rng: Rng): IntroPalette => PALETTES[Math.floor(rng() * PALETTES.length)];
export const paletteById = (id: string | null | undefined): IntroPalette | undefined => PALETTES.find((p) => p.id === id);

/** Shuffle bag: a tagline does not repeat until the four have all been used. Lives for the document, so replays rotate. */
export function createTaglineBag(rng: Rng = Math.random) {
  let bag: string[] = [];
  return () => {
    if (!bag.length) bag = shuffle(TAGLINES, rng);
    return bag.pop()!;
  };
}

export const motifSize = (device: IntroDevice, width: number) =>
  Math.min(device === "mobile" ? 36 : device === "tablet" ? 46 : 52, Math.max(device === "mobile" ? 22 : 28, width * (device === "mobile" ? 0.086 : device === "tablet" ? 0.066 : 0.046)));

/** The protected greeting/tagline zone, exactly as in the prototype. */
export const centerBand = (device: IntroDevice, width: number, height: number): Box =>
  device === "mobile"
    ? { left: 0, right: width, top: height * 0.34, bottom: height * 0.69 }
    : { left: width * 0.31, right: width * 0.69, top: height * 0.22, bottom: height * 0.77 };

export const overlaps = (a: Box, b: Box) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Collision-aware random scatter in real stage pixels. Each motif keeps PAD px of breathing room on every side (more than
 * the ~2px float envelope), never enters the centre band and never overlaps another motif. A motif that cannot be placed
 * in 500 attempts is dropped rather than forcing an overlap. Motifs are unique within one playback.
 */
export function layoutMotifs(family: MotifFamily, device: IntroDevice, width: number, height: number, rng: Rng): Placement[] {
  if (!width || !height) return [];
  const size = motifSize(device, width);
  const band = centerBand(device, width, height);
  const available = shuffle(MOTIF_FAMILIES[family], rng).filter((kind) => MOTIFS[kind]);
  const selected = available.slice(0, Math.min(MAX_MOTIFS[device], available.length));
  const rects: Box[] = [];
  const placed: Placement[] = [];
  for (const kind of selected) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const x = size / 2 + PAD + rng() * Math.max(1, width - size - 2 * PAD);
      const y = size / 2 + PAD + rng() * Math.max(1, height - size - 2 * PAD);
      const r: Box = { left: x - size / 2 - PAD, right: x + size / 2 + PAD, top: y - size / 2 - PAD, bottom: y + size / 2 + PAD };
      if (overlaps(r, band) || rects.some((q) => overlaps(r, q))) continue;
      rects.push(r);
      placed.push({ kind, x, y, size, duration: 19 + rng() * 16, delay: -rng() * 25, floatX: (rng() - 0.5) * 3 });
      break;
    }
  }
  return placed;
}

/** Greeting font-size override for the middle element, from the prototype's render(). Empty string means the stylesheet decides. */
export function greetingFontSize(device: IntroDevice, text: string): string {
  if (device === "mobile") return text.length > 12 ? "clamp(20px,5.1vw,27px)" : text.length > 9 ? "clamp(22px,5.9vw,31px)" : "";
  return device === "tablet" && text.length > 12 ? "38px" : "";
}

/** Prototype timing: first greeting after 270ms, then 105ms gaps with a 75ms leave, all scaled by SPEED. */
export const TIMING = {
  first: Math.round(270 * SPEED),
  gap: Math.round(105 * SPEED),
  leave: 75 * SPEED,
  /** Integration-only: readable final FairSwap pause before releasing the existing homepage. The standalone reference does not auto-release. */
  hold: 900,
  /** Integration-only: soft release into the already-rendered homepage. */
  fade: 300,
} as const;