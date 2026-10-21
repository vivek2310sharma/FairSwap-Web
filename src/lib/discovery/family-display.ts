import { z } from "zod";
import { twoWheelerV1, validateVehicleAnswers } from "@/lib/listings/two-wheeler/contract";
import { carsV1, validateCarAnswers } from "@/lib/listings/cars/contract";
import { propertyV1, propertyFinancialSchema, validatePropertyDraft } from "@/lib/listings/property/contract";

import { publicFamilyForSlug, type PublicFamily } from "./category-family";
export { publicFamilyForSlug } from "./category-family";

export interface PublicFamilyDisplay {
  family: PublicFamily;
  priceLabel: string;
  specifications: Array<{ field: string; label: string; value: string }>;
  rental?: {
    basis: string;
    deposit: string;
    maintenance: string;
  };
}

const labelMap: Record<string, string> = {
  variant: "Variant",
  year: "Manufacture year",
  km_driven: "Kilometres driven",
  engine_cc: "Engine (cc)",
  range_km: "Range (km)",
  battery_capacity_kwh: "Battery capacity (kWh)",
  battery_warranty_left: "Battery warranty left",
  owner_number: "Number of owners",
  color: "Colour",
  fuel_type: "Fuel type",
  transmission: "Transmission",
  powertrain: "Powertrain",
  seating_capacity: "Seating capacity",
  insurance_valid_till: "Insurance valid until",
  bhk: "Bedrooms (BHK)",
  bathrooms: "Bathrooms",
  area_sqft: "Area (sq ft)",
  area_basis: "Area basis",
  floor: "Floor",
  floors: "Floors",
  total_floors: "Total floors",
  furnishing: "Furnishing",
  preferred_tenants: "Preferred tenants",
  sharing_type: "Sharing type",
  gender: "Gender",
  gender_preference: "Gender preference",
  attached_bathroom: "Attached bathroom",
  food_included: "Food included",
  ac: "Air conditioning",
  wifi: "Wi-Fi",
  housekeeping: "Housekeeping",
  parking: "Parking",
  available_from: "Available from",
};

const allowedAnswerKeys = new Set(Object.keys(labelMap));
function formatPaise(value: number): string {
  // A whole-paise integer is authoritative; floating-point conversion is not.
  const paise = BigInt(value);
  const whole = (paise / BigInt(100)).toLocaleString("en-IN");
  const fraction = (paise % BigInt(100)).toString().padStart(2, "0");
  return fraction === "00" ? whole : `${whole}.${fraction}`;
}

export function publicItemPrice(priceType: unknown, paise: unknown): string {
  if (priceType === "free") return "Free";
  if (typeof paise === "number" && Number.isSafeInteger(paise) && paise >= 0) {
    return `₹${formatPaise(paise)}`;
  }
  return "Price on request";
}

export function publicPriceFallback(slug: unknown, priceType: unknown, paise: unknown): string {
  return publicFamilyForSlug(slug) === "property"
    ? "Monthly rent unavailable"
    : publicItemPrice(priceType, paise);
}

function humanValue(field: string, input: unknown): string | null {
  if (typeof input === "string") {
    const value = input.trim();
    return value && value.length <= 200 ? value.replaceAll("_", " ") : null;
  }
  if (typeof input === "number") {
    return Number.isFinite(input) && Math.abs(input) <= Number.MAX_SAFE_INTEGER
      ? (field === "year" ? String(input) : input.toLocaleString("en-IN", { maximumFractionDigits: 2 }))
      : null;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const answer = input as Record<string, unknown>;
  if (field === "battery_warranty_left" &&
      typeof answer.months === "number" && Number.isSafeInteger(answer.months)) {
    return `${answer.months} months`;
  }
  if (answer.state === "unknown") return "Not known";
  if (answer.state === "not_applicable") return "Not applicable";
  if (answer.state === "unanswered") return null;
  if (answer.state === "known") {
    if (answer.value === "other" && typeof answer.other === "string") {
      return humanValue(field, answer.other);
    }
    return humanValue(field, answer.value);
  }
  return null;
}

function safeSpecifications(
  raw: unknown,
  fields: readonly string[],
): PublicFamilyDisplay["specifications"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const allowed = new Set(fields);
  return Object.entries(raw as Record<string, unknown>).flatMap(([field, input]) => {
    if (!allowed.has(field) || !allowedAnswerKeys.has(field)) return [];
    const value = humanValue(field, input);
    return value === null ? [] : [{ field, label: labelMap[field], value }];
  });
}

const shortName = z.string().trim().min(1).max(150);
export interface PublicVehicleContext {
  mode: string;
  brandText: string | null;
  modelText: string | null;
  brandLabel?: string | null;
  modelLabel?: string | null;
}
export function makePublicVehicleDisplay(
  family: "two-wheelers" | "cars",
  slug: string,
  answers: unknown,
  priceType: unknown,
  pricePaise: unknown,
  context: PublicVehicleContext,
): PublicFamilyDisplay | null {
  const path = family === "cars"
    ? carsV1.paths.find(p => p.slug === slug)
    : twoWheelerV1.paths.find(p => p.slug === slug);
  if (!path) return null;
  const validated = family === "cars"
    ? validateCarAnswers(answers, path, new Date())
    : validateVehicleAnswers(answers, path, new Date());
  if (validated.error || !validated.data) return null;

  let brand: string | null = null;
  let model: string | null = null;
  if (context.mode === "not_listed") {
    brand = shortName.safeParse(context.brandText).success ? context.brandText!.trim() : null;
    model = shortName.safeParse(context.modelText).success ? context.modelText!.trim() : null;
  } else if (context.mode === "catalogue" || context.mode === "unresolved") {
    brand = shortName.safeParse(context.brandLabel).success ? context.brandLabel!.trim() : null;
    model = shortName.safeParse(context.modelLabel).success ? context.modelLabel!.trim() : null;
  }
  const identification = [
    ...(brand ? [{ field: "brand", label: "Brand", value: brand }] : []),
    ...(model ? [{ field: "model", label: "Model", value: model }] : []),
  ];
  return {
    family,
    priceLabel: publicItemPrice(priceType, pricePaise),
    specifications: [...identification, ...safeSpecifications(validated.data, path.fields)],
  };
}

const basisNames: Record<string, string> = {
  dwelling: "home",
  advertised_room: "room",
  per_bed: "bed",
  occupant_share: "occupant's share",
};

function rentalUnit(basis: string): string {
  return basis === "dwelling" ? "month" : `${basisNames[basis]} / month`;
}

export function makePublicPropertyDisplay(
  slug: string,
  answers: unknown,
  financial: unknown,
): PublicFamilyDisplay | null {
  const path = propertyV1.paths.find(p => p.slug === slug);
  if (!path) return null;
  const validated = validatePropertyDraft(answers, financial, null, path);
  const parsed = propertyFinancialSchema.safeParse(financial);
  if (validated.error || !validated.data || !parsed.success) return null;
  const f = parsed.data;
  const basis = f.basis;
  // A public listing must never turn a NULL generic item price into monthly rent.
  const priceLabel = f.rent.state === "known" && basis && f.rent.amount_paise > 0
    ? `₹${formatPaise(f.rent.amount_paise)} / ${rentalUnit(basis)}`
    : "Monthly rent not stated";
  const deposit = f.deposit?.state === "known"
    ? `₹${formatPaise(f.deposit.amount_paise)} one-time`
    : f.deposit?.state === "unknown" ? "Not known" : "Not stated";
  const maintenance = f.maintenance?.state === "separate"
    ? `₹${formatPaise(f.maintenance.amount_paise)} / ${rentalUnit(f.maintenance.basis)}`
    : f.maintenance?.state === "included_in_rent" ? "Included in rent"
    : f.maintenance?.state === "none" ? "None"
    : f.maintenance?.state === "unknown" ? "Not known" : "Not stated";
  return {
    family: "property",
    priceLabel,
    specifications: safeSpecifications(validated.data.answers, path.fields),
    rental: {
      basis: basis ? basisNames[basis] : "Not stated",
      deposit,
      maintenance,
    },
  };
}
