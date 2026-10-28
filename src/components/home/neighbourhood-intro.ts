/**
 * Neighbourhood Discovery Flow V4: locked timeline, token geometry and eligibility rules.
 *
 * Everything here is deterministic and framework-free so the choreography can be unit tested.
 * Coordinates are percentages of the decorative map asset's viewBox, never geographic data.
 * Layout and beats are locked in docs/design/neighbourhood-v4/02-MOTION-STORYBOARD.md.
 */

export type IntroLayout = "desktop" | "mobile";
export type Point = { x: number; y: number };
export type Size = { w: number; h: number };

/** Versioned on purpose: people who saw the V2 intro (`fs-intro-seen`) see V4 once. */
export const SEEN_KEY = "fairswap.intro.neighbourhood.v1.seen";
/** The homepage is never gated longer than this, even if hydration never arrives. */
export const FAILSAFE_MS = 4000;
/** Mobile composition (and shorter timeline) applies at this width and below. */
export const MOBILE_MAX_WIDTH = 639;
export const INTRO_LABEL = "FairSwap neighbourhood introduction";
export const LOGO_SRC = "/brand/FairSwap_Web_Logo_Transparent.png";
export const MAP_SRC: Record<IntroLayout, string> = {
  desktop: "/animations/fairswap-neighbourhood-v4/neighbourhood-map-desktop.svg",
  mobile: "/animations/fairswap-neighbourhood-v4/neighbourhood-map-mobile.svg",
};
export const AURA_SRC = "/animations/fairswap-neighbourhood-v4/pin-aura.svg";
export const VIEWBOX: Record<IntroLayout, Size> = { desktop: { w: 1440, h: 820 }, mobile: { w: 390, h: 700 } };
/** Convergence centre, shared by both layouts. */
export const HUB: Point = { x: 50, y: 48 };

type Beat = readonly [start: number, end: number];
export type Timeline = {
  total: number;
  /** A map awakens, B finds appear, C magnetic paths, D brand convergence, E map to marketplace, F release. */
  beats: { A: Beat; B: Beat; C: Beat; D: Beat; E: Beat; F: Beat };
};

export const TIMELINE: Record<IntroLayout, Timeline> = {
  desktop: { total: 3300, beats: { A: [0, 450], B: [450, 1180], C: [1180, 2130], D: [2130, 2580], E: [2580, 3100], F: [3100, 3300] } },
  mobile: { total: 2600, beats: { A: [0, 340], B: [340, 840], C: [840, 1630], D: [1630, 1990], E: [1990, 2420], F: [2420, 2600] } },
};
/** Delay between consecutive markers appearing (storyboard: 80-100ms). */
export const STAGGER_MS = 90;
/** Share of the route covered in beat C; beat D finishes the trip under the logo. */
export const ROUTE_AT_C_END = 0.78;
export const MAX_ROTATION_DEG = 8;
const GLIDE: readonly [number, number, number, number] = [0.18, 0.8, 0.2, 1];
const MIN_SCALE_DEPTH = 0.9;

export type IntroToken = {
  id: string;
  /** Generic category label; no prices, sellers or distances. */
  label: string;
  /** Allowlisted category photo slug (see lib/categories/category-images.ts). */
  slug: string;
  desktop: Point | null;
  mobile: Point | null;
  /** Final tilt in degrees, within +/- MAX_ROTATION_DEG. */
  rotation: number;
};

export const TOKENS: readonly IntroToken[] = [
  { id: "furniture", label: "Furniture", slug: "furniture", desktop: { x: 23, y: 28 }, mobile: { x: 24, y: 22 }, rotation: -6 },
  { id: "mobiles", label: "Mobile Phones", slug: "mobiles-tablets", desktop: { x: 68, y: 23 }, mobile: { x: 72, y: 24 }, rotation: 5 },
  { id: "bicycles", label: "Bicycles", slug: "bicycles-sports", desktop: { x: 19, y: 69 }, mobile: { x: 24, y: 65 }, rotation: -4 },
  { id: "laptops", label: "Laptops", slug: "electronics-laptops-computers", desktop: { x: 75, y: 71 }, mobile: { x: 74, y: 69 }, rotation: 7 },
  { id: "appliances", label: "Home Appliances", slug: "home-appliances", desktop: { x: 44, y: 16 }, mobile: null, rotation: -7 },
  { id: "cameras", label: "Cameras", slug: "electronics-cameras-photography", desktop: { x: 84, y: 45 }, mobile: null, rotation: 4 },
];

export const tokenImage = (token: IntroToken) => `/images/categories/${token.slug}.webp`;
export const tokensFor = (layout: IntroLayout) => TOKENS.filter((token) => token[layout]);
export const layoutForWidth = (width: number): IntroLayout => (width <= MOBILE_MAX_WIDTH ? "mobile" : "desktop");

/* ------------------------------------------------------------------ eligibility */

export type IntroEnv = {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  reducedMotion: boolean;
  saveData: boolean;
};
export type Eligibility = "play" | "seen" | "reduced-motion" | "save-data" | "storage-unavailable";

/** Why the intro may not run; `play` only for an unseen first visit on a capable, motion-friendly device. */
export function eligibility(env: IntroEnv): Eligibility {
  if (env.reducedMotion) return "reduced-motion";
  if (env.saveData) return "save-data";
  if (!env.storage) return "storage-unavailable";
  try {
    if (env.storage.getItem(SEEN_KEY) === "1") return "seen";
  } catch {
    return "storage-unavailable";
  }
  return "play";
}

export function readEnv(win: Window): IntroEnv {
  let storage: IntroEnv["storage"] = null;
  try { storage = win.localStorage; } catch { /* blocked */ }
  const connection = (win.navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return {
    storage,
    reducedMotion: typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: connection?.saveData === true,
  };
}

/** Marks the intro seen before playback so a reload can never trap the visitor. False if storage refuses. */
export function markSeen(storage: IntroEnv["storage"]): boolean {
  try {
    storage?.setItem(SEEN_KEY, "1");
    return storage?.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ geometry */

const toVb = (p: Point, layout: IntroLayout): Point => ({ x: (p.x / 100) * VIEWBOX[layout].w, y: (p.y / 100) * VIEWBOX[layout].h });
const fromVb = (p: Point, layout: IntroLayout): Point => ({ x: (p.x / VIEWBOX[layout].w) * 100, y: (p.y / VIEWBOX[layout].h) * 100 });

/** Curvature handedness alternates by quadrant around the hub: +1 for NW/SE, -1 for NE/SW. */
export function bendSign(from: Point): 1 | -1 {
  return (from.x < HUB.x) === (from.y < HUB.y) ? 1 : -1;
}

/** Quadratic Bezier control point, offset perpendicular to the chord by 18% of its length. */
export function routeControl(from: Point, layout: IntroLayout): Point {
  const a = toVb(from, layout);
  const b = toVb(HUB, layout);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = 0.18 * len * bendSign(from);
  return fromVb({ x: (a.x + b.x) / 2 - (dy / len) * bend, y: (a.y + b.y) / 2 + (dx / len) * bend }, layout);
}

/** Point on the token's curved route at parameter s in [0, 1] (0 = node, 1 = hub), in map percent. */
export function routePoint(from: Point, layout: IntroLayout, s: number): Point {
  const c = routeControl(from, layout);
  const u = 1 - s;
  return { x: u * u * from.x + 2 * u * s * c.x + s * s * HUB.x, y: u * u * from.y + 2 * u * s * c.y + s * s * HUB.y };
}

/** CSS cubic-bezier easing: progress u in [0, 1] to eased progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const axis = (a: number, b: number, t: number) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (axis(x1, x2, mid) < u) lo = mid; else hi = mid;
  }
  return axis(y1, y2, (lo + hi) / 2);
}
const glide = (u: number) => cubicBezier(...GLIDE, u);

/** Marker timings in ms: when marker `index` of `count` starts and finishes appearing in beat B. */
export function appearWindow(layout: IntroLayout, index: number, count: number): [number, number] {
  const [b0, b1] = TIMELINE[layout].beats.B;
  return [b0 + index * STAGGER_MS, b1 - (count - 1 - index) * STAGGER_MS];
}

/** Evenly spaced slots along the real category rail (stage px), or a centred row when it is not measurable. */
export function railSlots(stage: Size, rail: { left: number; top: number; width: number; height: number } | null, count: number): Point[] {
  const box = rail && rail.width > 0 ? rail : { left: stage.w * 0.1, top: stage.h * 0.62, width: stage.w * 0.8, height: 0 };
  return Array.from({ length: count }, (_, k) => ({
    x: Math.min(stage.w, Math.max(0, box.left + (box.width * (k + 0.5)) / count)),
    y: Math.min(stage.h, Math.max(0, box.top + box.height / 2)),
  }));
}

export type MotionFrame = { offset: number; transform: string; opacity: number };

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const frame = (total: number, ms: number, dx: number, dy: number, rotate: number, scale: number, opacity: number): MotionFrame => ({
  offset: Math.min(1, Math.max(0, ms / total)),
  transform: `translate(-50%, -50%) translate(${px(dx)}, ${px(dy)}) rotate(${Math.round(rotate * 100) / 100}deg) scale(${Math.round(scale * 1000) / 1000})`,
  opacity,
});

const PATH_STEPS = 8;

/**
 * Web Animations keyframes for one marker, relative to its own node (the element is anchored at its node with
 * `translate(-50%, -50%)`). `stage` and `rail` are in px; markers glide along their curve in C, shrink toward
 * the hub in D and realign to the real category rail in E. Offsets are fractions of the layout's total.
 */
export function tokenFrames(token: IntroToken, layout: IntroLayout, index: number, count: number, stage: Size, rail: Point): MotionFrame[] {
  const start = token[layout]!;
  const { total, beats } = TIMELINE[layout];
  const [c0, c1] = beats.C;
  const [d0, d1] = beats.D;
  const [e0, e1] = beats.E;
  const [a0, a1] = appearWindow(layout, index, count);
  const front = index % 2 === 0; // front tokens travel slightly larger; back ones pass behind the centre
  const depth = front ? 1.06 : MIN_SCALE_DEPTH;
  const origin = { x: (start.x / 100) * stage.w, y: (start.y / 100) * stage.h };
  const at = (s: number) => {
    const p = routePoint(start, layout, s);
    return { dx: (p.x / 100) * stage.w - origin.x, dy: (p.y / 100) * stage.h - origin.y };
  };
  const frames: MotionFrame[] = [
    frame(total, 0, 0, 0, 0, 0.82, 0),
    frame(total, a0, 0, 0, 0, 0.82, 0),
    frame(total, a1, 0, 0, 0, 1, 1),
    frame(total, c0, 0, 0, 0, 1, 1),
  ];
  for (let k = 1; k <= PATH_STEPS; k++) {
    const u = k / PATH_STEPS;
    const { dx, dy } = at(glide(u) * ROUTE_AT_C_END);
    // Depth: front markers swell slightly mid-glide and settle at 1; back markers ease down to MIN_SCALE_DEPTH.
    const scale = front ? 1 + (depth - 1) * Math.sin(Math.PI * u) : 1 + (depth - 1) * u;
    frames.push(frame(total, c0 + (c1 - c0) * u, dx, dy, token.rotation * 0.5 * u, scale, 1));
  }
  const dEnd = at(1);
  const hubScale = front ? 0.38 : 0.34;
  const scaleAtD = front ? 1 : MIN_SCALE_DEPTH;
  for (let k = 1; k <= 4; k++) {
    const u = k / 4;
    const { dx, dy } = at(ROUTE_AT_C_END + (1 - ROUTE_AT_C_END) * glide(u));
    frames.push(frame(total, d0 + (d1 - d0) * u, dx, dy, token.rotation * (0.5 + 0.5 * u), scaleAtD + (hubScale - scaleAtD) * glide(u), 1));
  }
  frames.push(frame(total, e0, dEnd.dx, dEnd.dy, token.rotation, hubScale, 1));
  const toRail = { dx: rail.x - origin.x, dy: rail.y - origin.y };
  frames.push(frame(total, e0 + (e1 - e0) * 0.8, dEnd.dx + (toRail.dx - dEnd.dx) * glide(0.8), dEnd.dy + (toRail.dy - dEnd.dy) * glide(0.8), token.rotation * 0.3, 0.7, 1));
  frames.push(frame(total, e1, toRail.dx, toRail.dy, 0, 0.8, 0));
  frames.push(frame(total, total, toRail.dx, toRail.dy, 0, 0.8, 0));
  return dedupe(frames);
}

/** Decorative tracer: a small mint dot that leads the marker along its route during beat C, then fades. */
export function tracerFrames(token: IntroToken, layout: IntroLayout, stage: Size): MotionFrame[] {
  const start = token[layout]!;
  const { total, beats } = TIMELINE[layout];
  const [c0, c1] = beats.C;
  const origin = { x: (start.x / 100) * stage.w, y: (start.y / 100) * stage.h };
  const frames: MotionFrame[] = [frame(total, 0, 0, 0, 0, 1, 0), frame(total, c0, 0, 0, 0, 1, 0)];
  for (let k = 1; k <= PATH_STEPS; k++) {
    const u = k / PATH_STEPS;
    const p = routePoint(start, layout, Math.min(1, glide(u) * ROUTE_AT_C_END + 0.14));
    const opacity = u < 0.25 ? u * 3.2 : u > 0.8 ? Math.max(0, (1 - u) * 4) : 0.8;
    frames.push(frame(total, c0 + (c1 - c0) * u, (p.x / 100) * stage.w - origin.x, (p.y / 100) * stage.h - origin.y, 0, 1, opacity));
  }
  frames.push(frame(total, total, 0, 0, 0, 1, 0));
  return dedupe(frames);
}

/** Keeps offsets strictly increasing, which the Web Animations API requires. */
function dedupe(frames: MotionFrame[]): MotionFrame[] {
  const out: MotionFrame[] = [];
  for (const f of frames) {
    const last = out[out.length - 1];
    if (last && f.offset <= last.offset) f.offset = Math.min(1, last.offset + 0.0005);
    out.push(f);
  }
  const lastFrame = out[out.length - 1];
  if (lastFrame) lastFrame.offset = 1;
  return out;
}
