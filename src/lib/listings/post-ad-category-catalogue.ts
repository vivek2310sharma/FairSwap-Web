import type { MacroCategory } from "@/lib/listings/macro-category";

/**
 * First-screen Post Ad catalogue. Presentation only: it never creates category
 * IDs, never authorizes a write, and the existing server/RLS gates stay
 * authoritative. Every choice is resolved against runtime capabilities.
 */

export type Locale = "en" | "hi";
export type LocalizedText = { en: string; hi?: string };
export const localize = (text: LocalizedText, locale: Locale = "en") => text[locale] ?? text.en;

export type FamilyState = "off" | "draft" | "live";
export interface PostAdCapabilities {
  mobilePhones?: boolean;
  accessories?: boolean;
  tablets?: boolean;
  wearables?: boolean;
  twoWheelers: FamilyState;
  cars: FamilyState;
  property: FamilyState;
  /** Keys of loaded, eligible Goods categories (slug, else slugified name), e.g. "electronics". */
  goodsCategories: readonly string[];
  /** Exact loaded Property contract paths as "<group>/<leaf>", e.g. "PG & Co-living/Boys PG". */
  propertyPaths: readonly string[];
}

export type Readiness = "available" | "draft-only" | "coming-soon" | "unavailable";

export type SubRoute =
  | { kind: "mobile-phones" }
  | { kind: "accessories" }
  | { kind: "tablets" }
  | { kind: "wearables" }
  /** General (broad) Goods continuation only; the unchanged form is where the category is chosen. */
  | { kind: "goods"; key: string }
  | { kind: "vehicles"; family: "two-wheelers" | "cars" }
  | { kind: "property"; paths: readonly string[] }
  | { kind: "none" }
  /** Live-animal trade: no route, and no promise that one will exist. */
  | { kind: "blocked" };

export interface SubCategory {
  id: string;
  label: string;
  hi?: string;
  guidance?: string;
  aliases?: readonly string[];
  group?: string;
  route: SubRoute;
}

export type TrustStatus = "coming-soon" | "planned" | "available";
export interface TrustInfo {
  status: TrustStatus;
  /** The capability, without status wording. */
  message: string;
  /** Shown while status is not "available". */
  disclaimer: string;
}

export interface MainCategory {
  id: string;
  label: LocalizedText;
  description: string;
  aliases?: readonly string[];
  subs: readonly SubCategory[];
  trust: TrustInfo;
  hideComingSoonBadge?: boolean;
}

const RES = "Residential for Rent/";
const PG = "PG & Co-living/";


const familyOf = (caps: PostAdCapabilities, family: "two-wheelers" | "cars") =>
  family === "cars" ? caps.cars : caps.twoWheelers;
const fromFamily = (state: FamilyState): Readiness =>
  state === "live" ? "available" : state === "draft" ? "draft-only" : "coming-soon";

/** The only place a choice becomes actionable. Destination macro is the existing contract. */
export function resolveSub(sub: SubCategory, caps: PostAdCapabilities): { readiness: Readiness; macro?: MacroCategory } {
  const r = sub.route;
  switch (r.kind) {
    case "accessories": return caps.accessories ? {readiness:"available",macro:"goods"} : {readiness:"coming-soon"};
    case "tablets": return caps.tablets ? {readiness:"available",macro:"goods"} : {readiness:"coming-soon"};
    case "wearables": return caps.wearables ? {readiness:"available",macro:"goods"} : {readiness:"coming-soon"};
    case "mobile-phones": return caps.mobilePhones ? {readiness:"available",macro:"goods"} : {readiness:"coming-soon"};
    case "goods": return caps.goodsCategories.includes(r.key) ? { readiness: "available", macro: "goods" } : { readiness: "coming-soon" };
    case "vehicles": {
      const readiness = fromFamily(familyOf(caps, r.family));
      return readiness === "coming-soon" ? { readiness } : { readiness, macro: "vehicles" };
    }
    case "property": {
      const readiness = caps.property !== "off" && r.paths.some(x => caps.propertyPaths.includes(x))
        ? fromFamily(caps.property) : "coming-soon";
      return readiness === "coming-soon" ? { readiness } : { readiness, macro: "property" };
    }
    case "blocked": return { readiness: "unavailable" };
    case "none": return { readiness: "coming-soon" };
    default: return { readiness: "coming-soon" };
  }
}

export function isMainActionable(main: MainCategory, caps: PostAdCapabilities) {
  return main.subs.some(s => resolveSub(s, caps).macro !== undefined);
}

export interface SearchHit { main: MainCategory; sub?: SubCategory }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();
function termMatches(term: string, q: string) {
  const t = norm(term);
  return t === q || q.startsWith(t + " ") || t.startsWith(q) || (q.includes(" ") ? t.includes(q) : t.split(" ").some(w => w.startsWith(q)));
}

/** Local keyword search. Returns every plausible choice rather than guessing one. */
export function searchCatalogue(query: string, catalogue: readonly MainCategory[] = []): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const main of catalogue) {
    const mainTerms = [main.label.en, main.label.hi ?? "", ...(main.aliases ?? [])];
    const mainHit = mainTerms.some(t => t && termMatches(t, q));
    const subHits = main.subs.filter(s => [s.label, s.hi ?? "", ...(s.aliases ?? [])].some(t => termMatches(t, q)));
    if (subHits.length) subHits.forEach(sub => hits.push({ main, sub }));
    else if (mainHit) hits.push({ main });
  }
  return hits;
}

/** Static contract paths, used only by the isolated preview flow that has no loaded references. */
export const PREVIEW_PROPERTY_PATHS = [
  RES + "Apartment or Flat", RES + "Independent House or Villa", RES + "Builder Floor", RES + "Studio Apartment",
  PG + "Boys PG", PG + "Girls PG", PG + "Co-living Spaces", PG + "Hostels", PG + "Flatmates & Shared Rooms",
] as const;

/**
 * Fallback for callers that only know the legacy per-macro booleans. Presence is
 * never treated as publication readiness: families are at most "draft".
 */
export function capabilitiesFromAvailability(a: { goods: boolean; vehicles: boolean; property: boolean }): PostAdCapabilities {
  return {
    goodsCategories: a.goods ? ["electronics", "home-appliances", "furniture", "books", "hobbies"] : [],
    twoWheelers: a.vehicles ? "draft" : "off",
    cars: a.vehicles ? "draft" : "off",
    property: a.property ? "draft" : "off",
    propertyPaths: a.property ? PREVIEW_PROPERTY_PATHS : [],
  };
}

/** Goods category key: persisted slug when present, else the slugified name. */
export function goodsCategoryKey(c: { name: string; slug?: string | null }): string {
  return (c.slug ?? c.name).toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
