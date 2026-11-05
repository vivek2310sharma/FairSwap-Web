import { blankWearableDraft, wearableSubmission, type WearableDraft } from "@/components/listings/posting/wearable-wizard";
const rev = "8dd5783ac9b7e12e";
export const SESSION = "33333333-3333-4333-8333-333333333333", MEDIA = "44444444-4444-4444-8444-444444444444", CITY = "55555555-5555-4555-8555-555555555555", LOC = "66666666-6666-4666-8666-666666666666";
export const draft = (over: Partial<WearableDraft> = {}): WearableDraft => ({
  ...blankWearableDraft(rev), session_id: SESSION, device_type: "smartwatch", brand_id: "wb_apple", model_id: "wm_0123456789ab", connectivity: "bluetooth", case_size_mm: "44", phone_os: ["ios"],
  condition: "good", screen: "minor_scratches", controls: "working", sensors: "working", charging: "working", battery_mode: "not_tested", strap: "good", included: ["charger"],
  pairing_status: "reset_ready", ownership_confirmed: true, description: "Used for a year, always with a screen guard. Charger included.", pin_code: "560034", city_id: CITY, locality_id: LOC, ...over,
});
export const extras = { title: "Apple Watch · Good condition", priceText: "12000", mediaIds: [MEDIA] };
export const valid = () => wearableSubmission(draft(), extras);
export const catalogue = { version: 1 as const, revision: rev, listing_category_id: CITY, enabled: true, brands: [{ id: "wb_apple", name: "Apple", types: ["smartwatch"] }] };
