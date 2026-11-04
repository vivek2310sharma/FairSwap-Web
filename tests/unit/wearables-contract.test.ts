import { describe, expect, it } from "vitest";
import { wearableSchema, wearableRpcMessage, wearableTitle, wearableScanText, includedFor } from "@/lib/listings/wearables/contract";
import { blankWearableDraft, canPrepareBlankWearableSession, fieldStep, reachableWearableStep, validateWearableWizard, wearableRecoveryKey, wearableSubmission } from "@/components/listings/posting/wearable-wizard";
import { phoneRiskSignals } from "@/lib/listings/mobiles/contract";
import { draft, extras, valid, SESSION, MEDIA } from "./wearable-fixture";

const ready = [{ state: "ready" }];
const parse = (v: unknown) => wearableSchema.safeParse(v);
const issuesOf = (r: ReturnType<typeof parse>) => (r.success ? [] : r.error.issues.map(i => String(i.path[0])));
const run = (d = draft(), x = extras) => validateWearableWizard(d, ready, x);

describe("wearable contract", () => {
  it("accepts a minimal valid smartwatch and contains no phone-only fields", () => {
    const r = parse(valid()); expect(r.success).toBe(true);
    expect(Object.keys(valid())).not.toEqual(expect.arrayContaining(["ram", "storage", "imei", "serial"]));
  });
  it("is strict: unknown, phone-only and private fields are rejected", () => {
    for (const extra of [{ ram: "8 GB" }, { storage: "64 GB" }, { imei: "1" }, { serial_number: "X" }, { account_email: "a@b.in" }, { heart_rate_history: [] }, { gps_track: [] }, { is_verified: true }])
      expect(parse({ ...valid(), ...extra }).success, JSON.stringify(extra)).toBe(false);
  });
  it.each([
    ["smartwatch", { connectivity: "bluetooth", case_size_mm: 44 }, ["ring_size", "gps_status"]],
    ["fitness_band", {}, ["ring_size", "gps_status", "connectivity", "case_size_mm"]],
    ["sports_gps_watch", { gps_status: "working", case_size_mm: null }, ["ring_size", "connectivity"]],
  ] as const)("%s takes only its own fields", (type, own, forbidden) => {
    const base: Record<string, unknown> = { ...valid(), device_type: type }; delete base.connectivity; delete base.case_size_mm; Object.assign(base, own);
    expect(parse(base).success).toBe(true);
    for (const k of forbidden) expect(parse({ ...base, [k]: k === "ring_size" ? "9" : "x" }).success, k).toBe(false);
  });
  it("smart rings need a ring size and have no screen, strap or connectivity", () => {
    const ring: Record<string, unknown> = { ...valid(), device_type: "smart_ring", ring_size: "9", included: ["charging_case"] };
    for (const k of ["screen", "controls", "strap", "case_size_mm", "connectivity"]) delete ring[k];
    expect(parse(ring).success).toBe(true);
    expect(parse({ ...ring, ring_size: "" }).success).toBe(false);
    expect(parse({ ...ring, screen: "perfect" }).success).toBe(false);
    expect(parse({ ...ring, included: ["extra_strap"] }).success).toBe(false);
    expect(includedFor("smart_ring")).toContain("charging_case"); expect(includedFor("smartwatch")).toContain("extra_strap");
  });
  it("brand/model/Other rules", () => {
    expect(issuesOf(parse({ ...valid(), brand_id: null, model_id: null, other_brand: "", other_model: "Z1" }))).toContain("other_brand");
    expect(parse({ ...valid(), brand_id: null, model_id: null, other_brand: "Zephyr Labs", other_model: "Z1" }).success).toBe(true);
    expect(parse({ ...valid(), brand_id: null, other_brand: "Zephyr", other_model: "", model_id: "wm_0123456789ab" }).success).toBe(false);
    expect(issuesOf(parse({ ...valid(), model_id: null, other_model: "" }))).toContain("other_model");
    expect(issuesOf(parse({ ...valid(), other_model: "extra" }))).toContain("other_model");
  });
  it("battery options never mix, and health % is smartwatch-only", () => {
    expect(parse({ ...valid(), battery_mode: "health_percent", battery_health_percent: 91 }).success).toBe(true);
    expect(parse({ ...valid(), battery_mode: "health_percent" }).success).toBe(false);
    expect(parse({ ...valid(), battery_mode: "not_tested", battery_health_percent: 91 }).success).toBe(false);
    expect(parse({ ...valid(), battery_mode: "runtime_hours", battery_runtime_hours: 48 }).success).toBe(true);
    expect(parse({ ...valid(), battery_mode: "runtime_hours", battery_runtime_hours: 48, battery_health_percent: 90 }).success).toBe(false);
    const band: Record<string, unknown> = { ...valid(), device_type: "fitness_band", battery_mode: "health_percent", battery_health_percent: 90 }; delete band.connectivity; delete band.case_size_mm;
    expect(parse(band).success).toBe(false);
  });
  it("pairing states are distinct: locked is rejected, still_paired needs acknowledgement, others must not acknowledge", () => {
    expect(parse({ ...valid(), pairing_status: "locked" }).success).toBe(false);
    expect(parse({ ...valid(), pairing_status: "still_paired", transfer_ack: false }).success).toBe(false);
    expect(parse({ ...valid(), pairing_status: "still_paired", transfer_ack: true }).success).toBe(true);
    expect(parse({ ...valid(), pairing_status: "signed_out", transfer_ack: true }).success).toBe(false);
    expect(parse({ ...valid(), pairing_status: "unknown" }).success).toBe(true);
    expect(parse({ ...valid(), ownership_confirmed: false }).success).toBe(false);
  });
  it("price, photos, months and plan", () => {
    expect(parse({ ...valid(), trade: "giveaway", price_paise: 0, negotiable: false }).success).toBe(true);
    expect(parse({ ...valid(), trade: "giveaway", price_paise: 10 }).success).toBe(false);
    expect(parse({ ...valid(), trade: "sell", price_paise: 0 }).success).toBe(false);
    expect(parse({ ...valid(), media_ids: [MEDIA, MEDIA] }).success).toBe(false);
    expect(parse({ ...valid(), media_ids: [] }).success).toBe(false);
    expect(parse({ ...valid(), purchase_month: "2099-01" }).success).toBe(false);
    expect(parse({ ...valid(), warranty_until: "2020-01" }).success).toBe(false);
    expect(parse({ ...valid(), plan_id: "paid" }).success).toBe(false);
    expect(parse({ ...valid(), selection: { category: "mobiles", subcategory: "mobile-phones", version: 2 } }).success).toBe(false);
  });
  it("title helper avoids duplicating the brand and stays within 80", () => {
    expect(wearableTitle("Apple", "Apple Watch Series 9", "good")).toBe("Apple Watch Series 9 · Good condition");
    expect(wearableTitle("Garmin", "Forerunner 55", "")).toBe("Garmin Forerunner 55");
    expect(wearableTitle("A".repeat(60), "B".repeat(60), "good").length).toBeLessThanOrEqual(80);
  });
  it("India fraud scan covers every free-text field", () => {
    for (const bad of ["pay upi://pay?pa=x@ok", "call 98765 43210", "send courier advance fee", "wa.me/919999999999", "pay via paytm.me/x"]) {
      for (const k of ["title", "description", "other_model", "finish", "generation"]) expect(phoneRiskSignals(wearableScanText({ [k]: bad })).length, `${k}: ${bad}`).toBeGreaterThan(0);
    }
    expect(phoneRiskSignals(wearableScanText({ description: "Battery 400 mAh, 44 mm case, 1.4 inch AMOLED." }))).toEqual([]);
  });
  it("maps database refusals to clear seller messages without leaking SQL", () => {
    expect(wearableRpcMessage("WEARABLE_LOCKED")).toMatch(/lock/);
    expect(wearableRpcMessage("WEARABLE_MODEL_NOT_ACCEPTED:possible_variant")).toMatch(/base model/);
    expect(wearableRpcMessage("WEARABLE_MODEL_NOT_ACCEPTED:type_mismatch")).toMatch(/isn’t supported/);
    expect(wearableRpcMessage("CATALOGUE_REVISION_MISMATCH")).toMatch(/Reload/);
    expect(wearableRpcMessage("duplicate key value violates unique constraint")).toBeNull();
  });
});

describe("wearable wizard", () => {
  it("builds exactly the applicable keys per type", () => {
    const sw = wearableSubmission(draft(), extras), ring = wearableSubmission(draft({ device_type: "smart_ring", ring_size: "9", included: ["charging_case"] }), extras);
    expect(sw).toHaveProperty("connectivity"); expect(sw).not.toHaveProperty("ring_size");
    expect(ring).toHaveProperty("ring_size"); for (const k of ["screen", "strap", "connectivity", "case_size_mm"]) expect(ring).not.toHaveProperty(k);
    expect(wearableSubmission(draft({ battery_mode: "runtime_hours", battery_runtime_hours: "36" }), extras)).toMatchObject({ battery_runtime_hours: 36 });
    expect(wearableSubmission(draft({ case_size_mm: "" }), extras)).toMatchObject({ case_size_mm: null });
  });
  it("valid draft passes; per-step validation only reports that step", () => {
    expect(run().issues).toEqual([]); expect(reachableWearableStep(run().issues)).toBe(5);
    const empty = blankWearableDraft("8dd5783ac9b7e12e");
    const step1 = validateWearableWizard(empty, [], extras, 1).issues; expect(step1.length).toBeGreaterThan(0);
    expect(step1.every(i => fieldStep(i.field) === 1)).toBe(true); expect(step1[0].message).toBe("Choose the device type.");
  });
  it("unfinished photos, locked pairing and unchecked ownership block progress with clear messages", () => {
    expect(validateWearableWizard(draft(), [{ state: "uploading" }], extras).issues.map(i => i.message)).toContain("Upload or remove unfinished photos.");
    expect(run(draft({ pairing_status: "locked" })).issues.map(i => i.message).join(" ")).toMatch(/lock can’t be listed|can’t be listed/);
    expect(run(draft({ ownership_confirmed: false })).issues.map(i => i.field)).toContain("ownership_confirmed");
    expect(run(draft({ pairing_status: "" })).issues.map(i => i.message)).toContain("Choose the pairing status.");
  });
  it("Other brand/model need names; picking a brand without a model is flagged", () => {
    expect(run(draft({ brand_other: true, brand_id: "", other_brand: "", other_model: "" })).issues.map(i => i.field)).toEqual(expect.arrayContaining(["other_brand", "other_model"]));
    expect(run(draft({ brand_other: true, brand_id: "", other_brand: "Zephyr", other_model: "Z1" })).issues).toEqual([]);
    expect(run(draft({ model_id: "" })).issues.map(i => i.field)).toContain("model_id");
  });
  it("steps map fields to the five-step journey", () => {
    expect([fieldStep("media_ids"), fieldStep("model_id"), fieldStep("pairing_status"), fieldStep("price_paise"), fieldStep("pin_code")]).toEqual([0, 1, 2, 3, 4]);
  });
  it("blank detection and recovery namespace never collide with Mobile Phones", () => {
    expect(canPrepareBlankWearableSession(draft({ device_type: "" , brand_id: "", model_id: "", connectivity: "", case_size_mm: "", phone_os: [], condition: "", screen: "", controls: "", sensors: "", charging: "", battery_mode: "", strap: "", included: [], pairing_status: "", ownership_confirmed: false, description: "", pin_code: "", city_id: "", locality_id: "" }), [], "", false, "")).toBe(true);
    expect(canPrepareBlankWearableSession(draft(), [], "", false, "")).toBe(false);
    expect(canPrepareBlankWearableSession(blankWearableDraft("8dd5783ac9b7e12e"), [{}], "", false, "")).toBe(false);
    expect(wearableRecoveryKey(SESSION)).toBe(`${SESSION}:wearables:v1`); expect(wearableRecoveryKey(SESSION)).not.toBe(SESSION);
  });
});
