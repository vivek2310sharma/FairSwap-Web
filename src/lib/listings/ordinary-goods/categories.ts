import { CANONICAL_CATEGORY_PARENTS, isCanonicalCategorySlug, type CanonicalLeafSlug } from "../canonical-category-slugs";

const roots = new Set([
  "v2-computers-gaming", "v2-tvs-audio-cameras", "v2-home-appliances",
  "v2-furniture-home", "v2-fashion", "v2-books-sports-hobbies",
]);

const boundedGoods = new Set<string>([
  "v2-headphones-earbuds",
  "v2-mobile-tablet-accessories",
  "v2-strollers-prams",
  "v2-cribs-cots-kids-furniture",
  "v2-baby-gear-car-seats",
  "v2-toys-games",
  "v2-school-bags-kids-essentials",
  "v2-pet-food-accessories",
  "v2-aquariums-fish-supplies",
  "v2-other-items",
  "v2-car-accessories-parts",
  "v2-bike-accessories-parts",
  "v2-bicycles"
]);

const propertySlugs = new Set([
  "v2-houses-apartments", "v2-pg-hostels-guest-houses", "v2-flatmates-shared-rooms",
  "v2-shops-offices", "v2-land-plots", "v2-warehouses-godowns",
]);

const petSlugs = new Set([
  "v2-dogs",
  "v2-other-pets",
]);

const vehicleSlugs = new Set([
  "v2-cars",
  "v2-motorcycles-scooters",
  "v2-commercial-vehicles",
  "v2-electric-cycles-low-speed-evs",
]);

export const isPropertyIntakeSlug = (slug: string) => propertySlugs.has(slug);

export const isPetRehomingSlug = (slug: string) => petSlugs.has(slug);

export const isSpecialistVehicleDraftSlug = (slug: string) =>
  slug === "v2-cars" || slug === "v2-motorcycles-scooters";

export const isRegulatedVehicleSlug = (slug: string) =>
  vehicleSlugs.has(slug);

export const isRegulatedVehicleDraftSlug = (slug: string) =>
  isSpecialistVehicleDraftSlug(slug);

export function isOrdinaryGoodsSlug(value: string): value is CanonicalLeafSlug {
  if (!isCanonicalCategorySlug(value)) return false;
  const parent = CANONICAL_CATEGORY_PARENTS[value];
  return isRegulatedVehicleSlug(value) || isPropertyIntakeSlug(value) || isPetRehomingSlug(value) || boundedGoods.has(value) || (parent !== null && roots.has(parent));
}
