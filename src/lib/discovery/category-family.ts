/** Small, client-safe category routing list. Not an authorization rule. */
export const twoWheelerSlugs = [
  "tw-commuter-bikes", "tw-sports-superbikes", "tw-cruiser-bikes",
  "tw-adventure-touring-bikes", "tw-classic-retro-bikes",
  "tw-electric-motorcycles", "tw-petrol-scooters",
  "tw-electric-scooters", "tw-maxi-scooters-mopeds",
] as const;
export const carSlugs = [
  "car-hatchback", "car-sedan", "car-compact-suv", "car-suv",
  "car-muv-mpv", "car-luxury-cars", "car-coupe-convertible",
  "car-electric-hybrid-cars", "car-vintage-classic-cars",
] as const;
export const rentalSlugs = [
  "rental-apartment-or-flat", "rental-independent-house-or-villa",
  "rental-builder-floor", "rental-studio-apartment", "rental-single-room",
  "rental-boys-pg", "rental-girls-pg", "rental-co-living-spaces",
  "rental-hostels", "rental-flatmates-shared-rooms",
] as const;
export type PublicFamily = "two-wheelers" | "cars" | "property";
const names = new Map<string, PublicFamily>([
  ...twoWheelerSlugs.map(slug => [slug, "two-wheelers"] as const),
  ...carSlugs.map(slug => [slug, "cars"] as const),
  ...rentalSlugs.map(slug => [slug, "property"] as const),
]);
export function publicFamilyForSlug(slug: unknown): PublicFamily | null {
  return typeof slug === "string" ? names.get(slug) ?? null : null;
}
