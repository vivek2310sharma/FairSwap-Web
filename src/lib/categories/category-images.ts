/**
 * Curated decorative category photography.
 * Asset slugs are allowlisted rather than interpolated from untrusted DB values.
 * Proposed blueprint categories are NOT activated by adding these assets.
 */
const IMAGE_SLUGS = [
  "adventure-touring-bikes",
  "agriculture-garden-garden-nursery",
  "agriculture-garden",
  "beauty-personal-care",
  "bicycles-sports",
  "books-media-musical-instruments",
  "books-media",
  "cars-vehicles-parts-accessories",
  "cars-vehicles-two-wheelers",
  "cars-vehicles",
  "community-others",
  "commuter-bikes",
  "cruiser-bikes",
  "electronics-audio",
  "electronics-cameras-photography",
  "electronics-gaming",
  "electronics-laptops-computers",
  "electronics-tv-home-entertainment",
  "electronics-wearables",
  "electronics",
  "food-grocery",
  "furniture",
  "health-wellness",
  "hobbies-collectibles",
  "home-appliances-kitchen-appliances",
  "home-appliances",
  "home-kitchen-cookware-bakeware",
  "home-kitchen",
  "jobs",
  "kids-baby",
  "men-s-fashion",
  "mobiles-tablets",
  "office-business-tools-hardware",
  "office-business",
  "pet-supplies",
  "property",
  "services-moving-logistics",
  "services",
  "sports-outdoors-cycling",
  "sports-outdoors-fitness-equipment",
  "sports-outdoors",
  "sports-superbikes",
  "women-s-fashion",
] as const;

const IMAGE_SET: ReadonlySet<string> = new Set(IMAGE_SLUGS);
const PREFIXES = [...IMAGE_SLUGS].sort((a, b) => b.length - a.length);

// Support previous/current catalogue names without modifying actual DB slugs.
const ALIASES: Readonly<Record<string, (typeof IMAGE_SLUGS)[number]>> = {
  mobiles: "mobiles-tablets",
  "mobile-phones": "mobiles-tablets",
  "laptops-computers": "electronics-laptops-computers",
  "cameras-photography": "electronics-cameras-photography",
  "kitchen-dining": "home-kitchen",
  "fashion-accessories": "women-s-fashion",
  "books-learning": "books-media",
  "books-stationery": "books-media",
  "musical-instruments": "books-media-musical-instruments",
  gaming: "electronics-gaming",
  pets: "pet-supplies",
  "sports-fitness": "sports-outdoors",
  "bikes": "commuter-bikes",
  "cars": "cars-vehicles",
};

/** Null means use the original colored tile and icon; never show a broken image. */
export function getCategoryImagePath(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  const exact = ALIASES[normalized] ?? (IMAGE_SET.has(normalized) ? normalized : null);
  const parent = exact ?? PREFIXES.find((prefix) => normalized.startsWith(`${prefix}-`));
  return parent ? `/images/categories/${parent}.webp` : null;
}
