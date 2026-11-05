import { z } from "zod";
import {
  BATTERY_MODES, CONDITIONS, CONNECTIVITY, GPS_STATUS, PAIRING, SCREEN, SENSORS, STRAP, WORKING, wearableSchema, wearableTitle,
  type DeviceType, type IncludedKey, type PairingStatus,
} from "@/lib/listings/wearables/contract";

export const WEARABLE_STEP_LABELS = ["Photos", "Wearable details", "Condition", "Price", "Location"] as const;
type Key<T> = "" | keyof T;
export type WearableDraft = {
  selection: { category: "mobiles"; subcategory: "wearables"; version: 1 }; session_id: string; catalogue_revision: string;
  device_type: DeviceType | ""; brand_id: string; brand_other: boolean; other_brand: string; model_id: string; model_other: boolean; other_model: string;
  generation: string; case_size_mm: string; ring_size: string; connectivity: Key<typeof CONNECTIVITY>; gps_status: Key<typeof GPS_STATUS>;
  phone_os: ("android" | "ios")[]; finish: string;
  condition: Key<typeof CONDITIONS>; screen: Key<typeof SCREEN>; controls: Key<typeof WORKING>; sensors: Key<typeof SENSORS>; charging: Key<typeof WORKING>;
  battery_mode: Key<typeof BATTERY_MODES>; battery_health_percent: string; battery_runtime_hours: string; strap: Key<typeof STRAP>;
  included: IncludedKey[]; purchase_month: string; warranty_until: string;
  pairing_status: "" | PairingStatus; transfer_ack: boolean; ownership_confirmed: boolean;
  title: string; description: string; trade: "sell" | "giveaway"; price_paise: number; negotiable: boolean;
  pin_code: string; city_id: string; locality_id: string; media_ids: string[]; plan_id: "free-v1";
};
export function blankWearableDraft(revision = ""): WearableDraft {
  return { selection: { category: "mobiles", subcategory: "wearables", version: 1 }, session_id: "", catalogue_revision: revision, device_type: "", brand_id: "", brand_other: false, other_brand: "", model_id: "", model_other: false, other_model: "", generation: "", case_size_mm: "", ring_size: "", connectivity: "", gps_status: "", phone_os: [], finish: "", condition: "", screen: "", controls: "", sensors: "", charging: "", battery_mode: "", battery_health_percent: "", battery_runtime_hours: "", strap: "", included: [], purchase_month: "", warranty_until: "", pairing_status: "", transfer_ack: false, ownership_confirmed: false, title: "", description: "", trade: "sell", price_paise: 0, negotiable: false, pin_code: "", city_id: "", locality_id: "", media_ids: [], plan_id: "free-v1" };
}
const lenient = z.object({}).passthrough();
export const wearableRecoverySchema = z.object({
  version: z.literal(1), owner: z.string().uuid(), updated: z.number(), draft: lenient.transform(v => v as unknown as WearableDraft),
  step: z.number().int().min(0).max(5).default(0), manualTitle: z.boolean(), area: z.string(), priceText: z.string().max(20),
  photos: z.array(z.object({ id: z.string().uuid(), state: z.enum(["pending", "uploading", "ready", "failed"]), blob: z.instanceof(Blob).optional() })).max(8),
});
export type WearableRecovery = z.infer<typeof wearableRecoverySchema>;
/** Namespaced IndexedDB key so a wearable draft never overwrites the Mobile Phones draft. */
export const wearableRecoveryKey = (owner: string) => `${owner}:wearables:v1`;
export { wearableTitle };

const STEP1 = ["device_type", "brand_id", "other_brand", "model_id", "other_model", "generation", "case_size_mm", "ring_size", "connectivity", "gps_status", "phone_os", "finish"];
const STEP2 = ["condition", "screen", "controls", "sensors", "charging", "battery_mode", "battery_health_percent", "battery_runtime_hours", "strap", "included", "purchase_month", "warranty_until", "pairing_status", "transfer_ack", "ownership_confirmed", "title", "description"];
export function fieldStep(field: string) { return field === "media_ids" ? 0 : STEP1.includes(field) ? 1 : STEP2.includes(field) ? 2 : ["trade", "price_paise", "negotiable"].includes(field) ? 3 : 4; }
export type WizardIssue = { field: string; message: string };

const LABELS: Record<string, string> = { device_type: "Choose the device type.", brand_id: "Choose a brand.", model_id: "Choose a model, or choose Other model.", condition: "Choose the condition that best fits.", screen: "Choose the screen condition.", controls: "Tell buyers about touch and buttons.", sensors: "Tell buyers about the sensors.", charging: "Tell buyers about charging.", battery_mode: "Choose a battery option.", strap: "Choose the strap condition.", connectivity: "Choose the connectivity.", gps_status: "Tell buyers about GPS.", ring_size: "Enter the ring size.", pairing_status: "Choose the pairing status.", ownership_confirmed: "Confirm you own this device and it is not reported lost or stolen." };
const generic = /^(Invalid|Required|Expected|String must|Number must)/;

/** Exact payload for the strict schema: only keys that apply to the chosen device type. */
export function wearableSubmission(d: WearableDraft, x: { title: string; priceText: string; mediaIds: string[] }) {
  const t = d.device_type, num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const base: Record<string, unknown> = {
    selection: d.selection, session_id: d.session_id, catalogue_revision: d.catalogue_revision, device_type: t,
    brand_id: d.brand_other ? null : d.brand_id, other_brand: d.brand_other ? d.other_brand.trim() : "",
    model_id: d.brand_other || d.model_other ? null : d.model_id, other_model: d.brand_other || d.model_other ? d.other_model.trim() : "",
    generation: d.generation.trim(), phone_os: d.phone_os, finish: d.finish.trim(), condition: d.condition, sensors: d.sensors, charging: d.charging,
    battery_mode: d.battery_mode, included: d.included, purchase_month: d.purchase_month, warranty_until: d.warranty_until,
    pairing_status: d.pairing_status, transfer_ack: d.pairing_status === "still_paired" ? d.transfer_ack : false, ownership_confirmed: d.ownership_confirmed || undefined,
    title: x.title, description: d.description, trade: d.trade,
    price_paise: d.trade === "giveaway" ? 0 : Math.round(Number(x.priceText) * 100), negotiable: d.trade === "sell" && d.negotiable,
    pin_code: d.pin_code, city_id: d.city_id, locality_id: d.locality_id, media_ids: x.mediaIds, plan_id: d.plan_id,
  };
  if (d.battery_mode === "health_percent") base.battery_health_percent = num(d.battery_health_percent);
  if (d.battery_mode === "runtime_hours") base.battery_runtime_hours = num(d.battery_runtime_hours);
  if (t !== "smart_ring") Object.assign(base, { screen: d.screen, controls: d.controls, strap: d.strap });
  if (t === "smartwatch" || t === "sports_gps_watch") base.case_size_mm = d.case_size_mm.trim() === "" ? null : Number(d.case_size_mm);
  if (t === "smartwatch") base.connectivity = d.connectivity;
  if (t === "sports_gps_watch") base.gps_status = d.gps_status;
  if (t === "smart_ring") base.ring_size = d.ring_size.trim();
  return base;
}
export function validateWearableWizard(d: WearableDraft, photos: { state: string }[], x: { title: string; priceText: string; mediaIds: string[] }, step?: number) {
  const parsed = wearableSchema.safeParse(wearableSubmission(d, x));
  const issues: WizardIssue[] = parsed.success ? [] : parsed.error.issues.map(i => ({ field: String(i.path[0] ?? "device_type"), message: i.message }));
  if (d.pairing_status === "locked") issues.push({ field: "pairing_status", message: "Devices with an activation or account lock can’t be listed. Remove the lock, then post again." });
  if (!d.brand_other && !d.brand_id && !issues.some(i => i.field === "brand_id")) issues.push({ field: "brand_id", message: LABELS.brand_id });
  if (!d.brand_other && !d.model_other && d.brand_id && !d.model_id && !issues.some(i => i.field === "model_id")) issues.push({ field: "model_id", message: LABELS.model_id });
  if (!photos.some(p => p.state === "ready")) issues.push({ field: "media_ids", message: "Upload at least one photo before continuing." });
  if (photos.some(p => p.state !== "ready")) issues.push({ field: "media_ids", message: "Upload or remove unfinished photos." });
  if (d.trade === "sell" && (!/^\d+(\.\d{1,2})?$/.test(x.priceText) || d.price_paise < 0 || !(Number(x.priceText) > 0))) issues.push({ field: "price_paise", message: "Enter a selling price greater than zero, with at most two decimal places." });
  const local = issues.map(i => ({ ...i, message: generic.test(i.message) || i.message.includes("Invalid") ? LABELS[i.field] ?? "Check this field." : i.message }));
  const unique = Array.from(new Map(local.filter(i => step === undefined || fieldStep(i.field) === step).map(i => [i.field, i])).values()).sort((a, b) => fieldStep(a.field) - fieldStep(b.field));
  return { parsed, issues: unique };
}
export function reachableWearableStep(issues: WizardIssue[]) { return issues.length ? Math.min(...issues.map(i => fieldStep(i.field))) : 5; }
/** Conservative: an empty media list alone does not prove an empty local draft. */
export function canPrepareBlankWearableSession(draft: WearableDraft, photos: readonly unknown[], priceText: string, manualTitle: boolean, area: string) {
  if (photos.length || priceText || manualTitle || area) return false;
  const blank = blankWearableDraft(draft.catalogue_revision);
  return (Object.keys(blank) as (keyof WearableDraft)[]).every(k => k === "session_id" || JSON.stringify(draft[k]) === JSON.stringify(blank[k]));
}
export { PAIRING };
