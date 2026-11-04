import { z } from "zod";

/** Seller-reported wearable posting contract (v1). Mirrors app_security.validate_wearable_v1; the database is authoritative. */
export const DEVICE_TYPES = ["smartwatch", "fitness_band", "sports_gps_watch", "smart_ring"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = { smartwatch: "Smartwatch", fitness_band: "Fitness band", sports_gps_watch: "Sports / GPS watch", smart_ring: "Smart ring" };
export const CONDITIONS = { new: "Brand new (sealed box)", like_new: "Like new", good: "Good condition", fair: "Fair (visible wear)", poor: "Needs repair/not working" } as const;
export const SCREEN = { perfect: "Perfect", minor_scratches: "Minor scratches", cracked: "Cracked", not_working: "Not working" } as const;
export const WORKING = { working: "Working", issues: "Has issues", not_tested: "Not tested" } as const;
export const SENSORS = { working: "Working", some_issues: "Some issues", not_tested: "Not tested" } as const;
export const STRAP = { good: "Good", worn: "Worn", damaged: "Damaged", missing: "Missing" } as const;
export const CONNECTIVITY = { bluetooth: "Bluetooth (GPS if listed by seller)", lte: "LTE / cellular", unknown: "Not sure" } as const;
export const GPS_STATUS = { working: "GPS working", not_working: "GPS not working", not_tested: "GPS not tested" } as const;
export const BATTERY_MODES = { health_percent: "Battery health %", runtime_hours: "Approximate runtime", not_tested: "Not tested" } as const;
export const PHONE_OS = { android: "Android phones", ios: "iPhone" } as const;
export const INCLUDED_LABELS = { charger: "Original charger", box: "Original box", invoice: "Bill/invoice", warranty_card: "Warranty card", extra_strap: "Extra strap", charging_case: "Charging case" } as const;
export type IncludedKey = keyof typeof INCLUDED_LABELS;
export const PAIRING = {
  reset_ready: "Reset and ready for a new owner",
  signed_out: "Signed out of my account, not reset",
  still_paired: "Still paired with my account / phone",
  unknown: "I haven’t checked",
  locked: "Activation or account lock is on",
} as const;
export type PairingStatus = keyof typeof PAIRING;
export const PAIRING_BADGE: Record<Exclude<PairingStatus, "locked">, string> = {
  reset_ready: "Seller reported: reset, ready to transfer",
  signed_out: "Seller reported: signed out, ready to transfer",
  still_paired: "Seller reported: still paired — will be unpaired before handover",
  unknown: "Seller has not confirmed pairing or account status",
};
export const includedFor = (type: DeviceType): IncludedKey[] => ["charger", "box", "invoice", "warranty_card", type === "smart_ring" ? "charging_case" : "extra_strap"];

const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/).or(z.literal(""));
export const selectionSchema = z.object({ category: z.literal("mobiles"), subcategory: z.literal("wearables"), version: z.literal(1) }).strict();
const text = (max: number) => z.string().trim().max(max);
const common = {
  selection: selectionSchema, session_id: z.string().uuid(), catalogue_revision: z.string().regex(/^[0-9a-f]{16}$/),
  brand_id: z.string().regex(/^wb_[a-z0-9-]+$/).nullable(), other_brand: text(60),
  model_id: z.string().regex(/^wm_[0-9a-f]{12}$/).nullable(), other_model: text(80),
  generation: text(40), phone_os: z.array(z.enum(["android", "ios"])).max(2), finish: text(40),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]),
  sensors: z.enum(["working", "some_issues", "not_tested"]), charging: z.enum(["working", "issues", "not_tested"]),
  battery_mode: z.enum(["health_percent", "runtime_hours", "not_tested"]),
  battery_health_percent: z.number().int().min(1).max(100).optional(), battery_runtime_hours: z.number().int().min(1).max(1440).optional(),
  included: z.array(z.enum(["charger", "box", "invoice", "warranty_card", "extra_strap", "charging_case"])).max(5),
  purchase_month: month, warranty_until: month,
  pairing_status: z.enum(["reset_ready", "signed_out", "still_paired", "unknown"], { errorMap: () => ({ message: "Choose the pairing status." }) }),
  transfer_ack: z.boolean(), ownership_confirmed: z.literal(true, { errorMap: () => ({ message: "Confirm you own this device and it is not reported lost or stolen." }) }),
  title: z.string().trim().min(5).max(80), description: z.string().trim().min(20).max(1500),
  trade: z.enum(["sell", "giveaway"]), price_paise: z.number().int().min(0).max(100000000), negotiable: z.boolean(),
  pin_code: z.string().regex(/^[1-9]\d{5}$/), city_id: z.string().uuid(), locality_id: z.string().uuid(),
  media_ids: z.array(z.string().uuid()).min(1).max(8), plan_id: z.literal("free-v1"),
};
const watch = { screen: z.enum(["perfect", "minor_scratches", "cracked", "not_working"]), controls: z.enum(["working", "issues", "not_tested"]), strap: z.enum(["good", "worn", "damaged", "missing"]) };
const caseSize = { case_size_mm: z.number().int().min(20).max(60).nullable() };
const t = <T extends DeviceType>(v: T) => z.literal(v);
const variants = [
  z.object({ ...common, ...watch, ...caseSize, device_type: t("smartwatch"), connectivity: z.enum(["bluetooth", "lte", "unknown"]) }).strict(),
  z.object({ ...common, ...watch, device_type: t("fitness_band") }).strict(),
  z.object({ ...common, ...watch, ...caseSize, device_type: t("sports_gps_watch"), gps_status: z.enum(["working", "not_working", "not_tested"]) }).strict(),
  z.object({ ...common, device_type: t("smart_ring"), ring_size: z.string().trim().min(1).max(20) }).strict(),
] as const;
export const wearableSchema = z.discriminatedUnion("device_type", [...variants]).superRefine((v, ctx) => {
  const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (v.trade === "giveaway" ? v.price_paise !== 0 || v.negotiable : v.price_paise < 1) add("price_paise", "Check Price and trade type.");
  if (new Set(v.media_ids).size !== v.media_ids.length) add("media_ids", "Choose distinct photos.");
  if (v.brand_id === null) {
    if (v.model_id !== null) add("model_id", "Choose a brand first.");
    if (v.other_brand.length < 2) add("other_brand", "Enter the brand name for review.");
  } else if (v.other_brand) add("other_brand", "Clear the brand name or choose Other brand.");
  if (v.model_id === null) { if (v.other_model.length < 2) add("other_model", "Enter the model name for review."); }
  else if (v.other_model) add("other_model", "Clear the model name or choose Other model.");
  if (v.battery_mode === "health_percent" && (v.device_type !== "smartwatch" || v.battery_health_percent === undefined || v.battery_runtime_hours !== undefined)) add("battery_mode", "Enter battery health, or choose another battery option.");
  if (v.battery_mode === "runtime_hours" && (v.battery_runtime_hours === undefined || v.battery_health_percent !== undefined)) add("battery_mode", "Enter approximate runtime in hours.");
  if (v.battery_mode === "not_tested" && (v.battery_health_percent !== undefined || v.battery_runtime_hours !== undefined)) add("battery_mode", "Clear battery values or choose another option.");
  const allowed = includedFor(v.device_type);
  if (v.included.some(i => !allowed.includes(i)) || new Set(v.included).size !== v.included.length) add("included", "Check the included items.");
  if (v.purchase_month && v.purchase_month > new Date().toISOString().slice(0, 7)) add("purchase_month", "Purchase month can’t be in the future.");
  if (v.warranty_until && v.warranty_until < new Date().toISOString().slice(0, 7)) add("warranty_until", "Warranty has already ended; clear it.");
  if (v.pairing_status === "still_paired" && !v.transfer_ack) add("transfer_ack", "Confirm you will unpair it before handover, or fix the status.");
  if (v.pairing_status !== "still_paired" && v.transfer_ack) add("transfer_ack", "Clear this confirmation.");
});
export type WearableSubmission = z.infer<typeof wearableSchema>;

/** Only types and brands cross to the client; models are fetched per brand. */
export const wearableCatalogueSchema = z.object({
  version: z.literal(1), revision: z.string().regex(/^[0-9a-f]{16}$/), listing_category_id: z.string().uuid(), enabled: z.boolean(),
  brands: z.array(z.object({ id: z.string(), name: z.string(), types: z.array(z.enum(DEVICE_TYPES)) })),
});
export type WearableCatalogue = z.infer<typeof wearableCatalogueSchema>;
export const wearableModelsSchema = z.object({ models: z.array(z.object({ id: z.string(), name: z.string(), series: z.string() })) });
export type WearableModelChoice = z.infer<typeof wearableModelsSchema>["models"][number];

export function wearableTitle(brand: string, model: string, condition: keyof typeof CONDITIONS | "") {
  const lower = model.toLocaleLowerCase(), b = brand.toLocaleLowerCase();
  const name = !model ? "" : brand && !lower.startsWith(b + " ") && lower !== b ? `${brand} ${model}` : model;
  return [name, condition ? CONDITIONS[condition] : ""].filter(Boolean).join(" · ").slice(0, 80);
}
/** Free text that must pass the India-specific fraud scan (UPI/payment links, contact, courier/advance). */
export function wearableScanText(v: Record<string, unknown>) {
  return ["title", "description", "other_brand", "other_model", "generation", "finish", "ring_size"].map(k => (typeof v[k] === "string" ? (v[k] as string) : "")).join("\n");
}
/** Error codes raised by the database that have a seller-facing explanation. */
export function wearableRpcMessage(message: string | undefined) {
  if (!message) return null;
  if (message.includes("WEARABLE_LOCKED")) return "Devices with an activation or account lock can’t be listed. Remove the lock, then post again.";
  if (message.includes("WEARABLE_OWNERSHIP_UNCONFIRMED")) return "Confirm you own this device and it is not reported lost or stolen.";
  if (message.includes("WEARABLE_STILL_PAIRED_ACK_REQUIRED")) return "Confirm you will unpair it before handover, or change the pairing status.";
  if (message.includes("WEARABLE_MODEL_NOT_ACCEPTED:possible_variant")) return "That looks like a finish or edition of a listed model. Choose the base model and enter the finish in the Finish field.";
  if (message.includes("WEARABLE_MODEL_NOT_ACCEPTED")) return "This device isn’t supported in Smartwatches & Wearables yet.";
  if (message.includes("WEARABLE_MODEL_LISTED") || message.includes("WEARABLE_BRAND_LISTED")) return "This model or brand is in the list. Please select it from the list instead.";
  if (message.includes("CATALOGUE_REVISION_MISMATCH")) return "The device list was updated. Reload this page and choose your device again.";
  return null;
}
