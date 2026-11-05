import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BATTERY_MODES, CONDITIONS, CONNECTIVITY, DEVICE_TYPES, DEVICE_TYPE_LABELS, GPS_STATUS, INCLUDED_LABELS, PAIRING_BADGE, PHONE_OS, SCREEN, SENSORS, STRAP, WORKING,
  type IncludedKey,
} from "./contract";

const opt = <T extends Record<string, string>>(m: T) => z.enum(Object.keys(m) as [keyof T & string, ...(keyof T & string)[]]).optional();
/** Public, seller-reported attributes only. No serial/IMEI, account, invoice or health/location data exists in this record. */
export const wearableDetailsSchema = z.object({
  generation: z.string().optional(), finish: z.string().optional(), condition: z.enum(["new", "like_new", "good", "fair", "poor"]),
  case_size_mm: z.number().nullable().optional(), ring_size: z.string().optional(), connectivity: opt(CONNECTIVITY), gps_status: opt(GPS_STATUS),
  phone_os: z.array(z.enum(["android", "ios"])).default([]), screen: opt(SCREEN), controls: opt(WORKING), strap: opt(STRAP), sensors: opt(SENSORS), charging: opt(WORKING),
  battery_mode: opt(BATTERY_MODES), battery_health_percent: z.number().optional(), battery_runtime_hours: z.number().optional(),
  included: z.array(z.string()).default([]), purchase_month: z.string().optional(), warranty_until: z.string().optional(),
}).passthrough();
const row = z.object({
  device_type: z.enum(DEVICE_TYPES), brand_name: z.string(), model_name: z.string(), other_model: z.boolean(), pairing_status: z.enum(["reset_ready", "signed_out", "still_paired", "unknown"]),
  transfer_ready: z.boolean(), details: wearableDetailsSchema,
});
export type WearableDetails = z.infer<typeof row>;
export async function loadWearableDetails(client: SupabaseClient, id: string): Promise<WearableDetails | null> {
  const r = await client.from("listing_wearable_contexts_v1").select("device_type,brand_name,model_name,other_model,pairing_status,transfer_ready,details").eq("listing_id", id).maybeSingle();
  const p = row.safeParse(r.data);
  return !r.error && p.success ? p.data : null;
}
export type WearableFact = { field: string; label: string; value: string };
export function wearableFacts(d: WearableDetails): WearableFact[] {
  const x = d.details, f: WearableFact[] = [];
  const add = (field: string, label: string, value: string | undefined | null) => { if (value) f.push({ field, label, value }); };
  add("model", DEVICE_TYPE_LABELS[d.device_type], `${d.brand_name} ${d.model_name}${d.other_model ? " (entered by seller)" : ""}`);
  add("generation", "Generation / edition", x.generation); add("finish", "Finish / colour", x.finish);
  add("condition", "Condition", CONDITIONS[x.condition]);
  add("size", "Case size", x.case_size_mm ? `${x.case_size_mm} mm` : undefined); add("ring", "Ring size", x.ring_size);
  add("connectivity", "Connectivity", x.connectivity ? CONNECTIVITY[x.connectivity] : undefined); add("gps", "GPS", x.gps_status ? GPS_STATUS[x.gps_status] : undefined);
  add("works", "Works with (seller-reported)", x.phone_os.length ? x.phone_os.map(o => PHONE_OS[o]).join(", ") : "Not stated");
  add("screen", "Screen", x.screen ? SCREEN[x.screen] : undefined); add("controls", "Touch and buttons", x.controls ? WORKING[x.controls] : undefined); add("strap", "Strap or band", x.strap ? STRAP[x.strap] : undefined);
  add("sensors", "Sensors", x.sensors ? SENSORS[x.sensors] : undefined); add("charging", "Charging", x.charging ? WORKING[x.charging] : undefined);
  add("battery", "Battery", x.battery_mode === "health_percent" && x.battery_health_percent ? `${x.battery_health_percent}% health` : x.battery_mode === "runtime_hours" && x.battery_runtime_hours ? `About ${x.battery_runtime_hours} hours per charge` : x.battery_mode ? BATTERY_MODES.not_tested : undefined);
  add("included", "Included", x.included.map(k => INCLUDED_LABELS[k as IncludedKey] ?? "").filter(Boolean).join(", ") || "Device only");
  add("purchase", "Purchased", x.purchase_month); add("warranty", "Warranty until", x.warranty_until);
  add("pairing", "Pairing and account", PAIRING_BADGE[d.pairing_status]);
  return f;
}
export const wearableCardFacts = (d: WearableDetails) => wearableFacts(d).filter(f => ["model", "condition", "connectivity", "pairing"].includes(f.field));
