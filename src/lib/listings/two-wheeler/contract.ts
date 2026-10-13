import { z } from "zod";
import definition from "./v1.json";

/** Approved FairSwap navigation/answer policy. Raw source facts live in separate snapshots. */
export const twoWheelerV1 = definition;
export const CONTRACT_KEY = "two-wheeler-draft-v1";
export const numericLimit = Number.MAX_SAFE_INTEGER;
const uuid = z.string().uuid();
const safeNumber = z.number().finite().min(0).max(numericLimit);
const integer = safeNumber.int();
const answer = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unanswered") }).strict(),
  z.object({ state: z.literal("unknown") }).strict(),
  z.object({ state: z.literal("known"), value: integer }).strict(),
]);
export const registrationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unanswered") }).strict(),
  z.object({ state: z.literal("unknown") }).strict(),
  z.object({ state: z.literal("not_applicable") }).strict(),
  z.object({ state: z.literal("provided"), state_id: uuid }).strict(),
]);
export const resolutionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("unanswered"), brand_id: uuid.optional() }).strict(),
  z.object({ mode: z.literal("catalogue"), brand_id: uuid, model_id: uuid }).strict(),
  z.object({ mode: z.literal("unresolved"), brand_id: uuid, model_id: uuid }).strict(),
  z.object({ mode: z.literal("not_listed"), brand_text: z.string().trim().min(1).max(100), model_text: z.string().trim().min(1).max(150) }).strict(),
]);
export type ModelResolution = z.infer<typeof resolutionSchema>;
export type VehiclePath = typeof definition.paths[number];
export function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const attributesSchema = z.object({
  variant: z.string().max(80).optional(), color: z.string().max(60).optional(),
  year: answer.optional(), km_driven: answer.optional(),
  engine_cc: safeNumber.positive().optional(), owner_number: integer.min(1).optional(),
  insurance_valid_till: z.string().refine(calendarDate, "Enter a valid calendar date").optional(),
  range_km: safeNumber.optional(),
  battery_warranty_left: z.object({ months: integer, as_of: z.string().refine(calendarDate).optional() }).strict().optional(),
  registration_state: registrationSchema.optional(),
}).strict();
export type VehicleAnswers = z.infer<typeof attributesSchema>;
export function validateVehicleAnswers(raw: unknown, path: Pick<VehiclePath, "fields">, now: Date, submission = false) {
  const result = attributesSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };
  for (const key of Object.keys(result.data)) if (!path.fields.includes(key)) return { error: `${key} does not apply to this category` };
  const year = result.data.year;
  if (year?.state === "known" && (year.value < 1900 || year.value > now.getUTCFullYear())) return { error: `Manufacture year must be 1900–${now.getUTCFullYear()} (UTC)` };
  if (submission && [result.data.year, result.data.km_driven].some(a => !a || a.state === "unanswered")) return { error: "Manufacture year and kilometres need a value or Not known" };
  return { data: result.data };
}
export type RawModel = { brand: string; model: string; vehicle_type: string; category: string; fuel_type: string; status: string; engine_cc: string };
export function compatibility(raw: RawModel, path: VehiclePath): "mapped" | "unresolved" | "incompatible" {
  const electric = path.path[2].startsWith("Electric ");
  const group = path.path[1];
  const typeAllowed = group === "Motorcycles" ? raw.vehicle_type === (electric ? "Electric Motorcycle" : "Motorcycle") : electric ? raw.vehicle_type === "Electric Scooter" : ["Scooter", "Moped"].includes(raw.vehicle_type);
  if (!typeAllowed || (electric ? raw.fuel_type !== "Electric" : !["Petrol", "CNG"].includes(raw.fuel_type))) return "incompatible";
  const mapping = definition.mappings.find(m => m.vehicleType === raw.vehicle_type && m.style === raw.category && (!m.fuel || m.fuel === raw.fuel_type));
  if (mapping) return mapping.leaf === path.path[2] ? "mapped" : "incompatible";
  return definition.unresolvedStyles.includes(raw.category) ? "unresolved" : "incompatible";
}
export function validateModelResolution(resolution: ModelResolution, path: VehiclePath, known: { id: string; brand_id: string; raw: RawModel } | null, retained = false) {
  if (resolution.mode === "unanswered") return null;
  if (!known) return resolution.mode === "not_listed" ? null : "Model reference is unavailable";
  const state = compatibility(known.raw, path);
  if (state === "incompatible") return "Known model type, powertrain or navigation mapping is incompatible";
  if (known.raw.status === "Upcoming" && !retained) return "Upcoming models are unavailable for new selection";
  if (resolution.mode === "not_listed") return "This exact brand/model exists: select its catalogue or unresolved route";
  if (known.brand_id !== resolution.brand_id || known.id !== resolution.model_id) return "Brand/model mismatch";
  if (state !== (resolution.mode === "catalogue" ? "mapped" : "unresolved")) return "Model resolution mode does not match the navigation mapping";
  return null;
}
export function validateVehicleSubmission(resolution: ModelResolution, answers: unknown, path: VehiclePath, now: Date) {
  if (resolution.mode === "unanswered") return { error: "Brand and Model information are required" };
  return validateVehicleAnswers(answers, path, now, true);
}
/** Exact paise, no rounding/truncation; existing Test ceiling is a common money rule. */
export function rupeesToPaise(raw: string, priceType: string): number | null {
  if (priceType === "free") return 0;
  if (!raw.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw.trim())) throw new Error("Enter rupees with at most two decimal places");
  const [whole, fraction = ""] = raw.trim().split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise > 100000000) throw new Error("Amount must be at most ₹10,00,000");
  return paise;
}
