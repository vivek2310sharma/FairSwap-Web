import { z } from "zod";
import { tabletSchema, type TabletSubmission, tabletCatalogueIssues } from "@/lib/listings/tablets/contract";
export const STEP_LABELS = ["Photos", "Tablet details", "Condition and accessories", "Price", "Location"] as const;
export type TabletDraft = Omit<TabletSubmission, "storage" | "condition" | "connectivity" | "screen_touch_status" | "battery_charging_status" | "transfer_lock_status"> & {
    storage: TabletSubmission["storage"] | "";
    condition: TabletSubmission["condition"] | "";
    connectivity: TabletSubmission["connectivity"] | ""; screen_touch_status:TabletSubmission["screen_touch_status"]|""; battery_charging_status:TabletSubmission["battery_charging_status"]|""; transfer_lock_status:TabletSubmission["transfer_lock_status"]|"";
};
export function blankTabletDraft(): TabletDraft { return { selection: { category: "mobiles", subcategory: "tablets", version: 1 }, session_id: "", trade: "sell", brand_id: "", model_id: "", other_model: "", storage: "", ram: "", connectivity:"", colour:"", hardware_model_number:"",screen_touch_status:"",battery_charging_status:"",transfer_lock_status:"",powers_on:"yes",repair_history:"unknown",other_defects:"",stylus_description:"",keyboard_description:"", condition: "", included: [], warranty_until: "", title: "", description: "", price_paise: 0, negotiable: false, pin_code: "", city_id: "", locality_id: "", media_ids: [], plan_id: "free-v1" }; }
const draftSchema = tabletSchema.innerType().extend({ other_brand:z.string().max(100).optional(),other_model:z.string().max(100),storage_other:z.string().max(8).optional(),ram_other:z.string().max(6).optional(),connectivity_other:z.string().max(60).optional(), connectivity:tabletSchema.innerType().shape.connectivity.or(z.literal("")),screen_touch_status:tabletSchema.innerType().shape.screen_touch_status.or(z.literal("")),battery_charging_status:tabletSchema.innerType().shape.battery_charging_status.or(z.literal("")),transfer_lock_status:tabletSchema.innerType().shape.transfer_lock_status.or(z.literal("")), brand_id: z.string(), model_id: z.string(), storage: tabletSchema.innerType().shape.storage.or(z.literal("")), condition: tabletSchema.innerType().shape.condition.or(z.literal("")), title: z.string().max(150), description: z.string().max(5000), pin_code: z.string().max(6), city_id: z.string(), locality_id: z.string(), media_ids: z.array(z.string()).max(8) });
export const tabletRecoverySchema = z.object({ version: z.literal(1), owner: z.string().uuid(), updated: z.number(), draft: draftSchema, step: z.number().int().min(0).max(5).default(0), manualTitle: z.boolean(), area: z.string(), priceText: z.string().max(20), photos: z.array(z.object({ id: z.string().uuid(), state: z.enum(["pending", "uploading", "ready", "failed"]), blob: z.instanceof(Blob).optional() })).max(8) });
export type TabletRecovery = z.infer<typeof tabletRecoverySchema>;
export function generatedTabletTitle(brand:string,model:string,storage:string,connectivity:string){
 const name=model.toLowerCase().startsWith(brand.toLowerCase())?model:[brand,model].filter(Boolean).join(" ");
 return model?[name,storage,({wifi:"Wi-Fi",lte:"Wi-Fi + 4G",five_g:"Wi-Fi + 5G",unknown:"Connectivity not sure"} as Record<string,string>)[connectivity]].filter(Boolean).join(" · ").slice(0,150):"";
}
export function fieldStep(field: string) { if (field === "media_ids")
    return 0; if (["brand_id", "other_brand", "model_id", "other_model", "storage", "storage_other", "ram", "ram_other", "connectivity", "connectivity_other", "colour", "hardware_model_number"].includes(field))
    return 1; if (["screen_touch_status", "battery_charging_status", "transfer_lock_status", "powers_on", "repair_history", "other_defects", "stylus_description", "keyboard_description", "condition", "included", "warranty_until", "title", "description"].includes(field))
    return 2; if (["trade", "price_paise", "negotiable"].includes(field))
    return 3; return 4; }

export type WizardIssue = { field: string; message: string };
const stepFields = [
    ["media_ids"], ["brand_id", "other_brand", "model_id", "other_model", "storage", "storage_other", "ram", "ram_other", "connectivity", "connectivity_other", "colour", "hardware_model_number"],
    ["screen_touch_status", "battery_charging_status", "transfer_lock_status", "powers_on", "repair_history", "other_defects", "stylus_description", "keyboard_description", "condition", "included", "warranty_until", "title", "description"],
    ["trade", "price_paise", "negotiable"], ["pin_code", "city_id", "locality_id"],
] as const;
function collectTabletIssues(issues: WizardIssue[], value: TabletDraft, catalogue: import("@/lib/listings/tablets/contract").TabletCatalogue, photos: { state: string }[], priceText: string, step?: number) {
    if (step === undefined || step === 1) {
        issues.push(...tabletCatalogueIssues({...value,other_brand:value.other_brand??""},catalogue));
    }
    if (step === undefined || step === 0) {
        if (!photos.some(p => p.state === "ready")) issues.push({ field: "media_ids", message: "Upload at least one photo before continuing." });
        if (photos.some(p => p.state !== "ready")) issues.push({ field: "media_ids", message: "Upload or remove unfinished photos." });
        if (new Set(value.media_ids).size !== value.media_ids.length) issues.push({ field: "media_ids", message: "Choose distinct photos." });
    }
    // Step parsing retains the canonical object's cross-field requirements.
    if (step === undefined || step === 3) {
        if (value.trade === "sell" && (!/^\d+(\.\d{1,2})?$/.test(priceText) || value.price_paise < 1)) issues.push({ field: "price_paise", message: "Enter a selling price greater than zero, with at most two decimal places." });
        if (value.trade === "giveaway" && (value.price_paise !== 0 || value.negotiable)) issues.push({ field: "price_paise", message: "Giveaways must have zero price and no negotiation." });
    }
    if (step === undefined || step === 2) {
        if (value.included.includes("Under warranty") && (!value.warranty_until || value.warranty_until < new Date().toISOString().slice(0,7))) issues.push({ field: "warranty_until", message: "Enter a current warranty expiry month." });
        if (!value.included.includes("Under warranty") && value.warranty_until) issues.push({ field: "warranty_until", message: "Clear warranty expiry or select Under warranty." });
    }
    return Array.from(new Map(issues.filter(i => step === undefined || fieldStep(i.field) === step).map(i => [i.field, i])).values()).sort((a,b) => fieldStep(a.field)-fieldStep(b.field));
}
/** Full canonical schema remains authoritative at Review and Submit. */
export function validateTabletWizard(value: TabletDraft, catalogue: import("@/lib/listings/tablets/contract").TabletCatalogue, photos: { state: string }[], priceText: string) {
    const parsed = tabletSchema.safeParse(value);
    const issues = parsed.success ? [] : parsed.error.issues.map(i => ({field:String(i.path[0]),message:i.message}));
    return { parsed, issues: collectTabletIssues(issues,value,catalogue,photos,priceText) };
}
/** Continue parses only this step's canonical fields, without future-field feedback. */
export function validateTabletStep(step: number, value: TabletDraft, catalogue: import("@/lib/listings/tablets/contract").TabletCatalogue, photos: { state: string }[], priceText: string) {
    const mask = Object.fromEntries((stepFields[step] ?? []).map(field => [field,true])) as Partial<Record<keyof TabletSubmission,true>>;
    const current = Object.fromEntries((stepFields[step] ?? []).map(field => [field,value[field]]));
    const parsed = tabletSchema.innerType().pick(mask).safeParse(current);
    const issues = parsed.success ? [] : parsed.error.issues.map(i => ({field:String(i.path[0]),message:i.message}));
    const full=tabletSchema.safeParse(value);
    if(!full.success)issues.push(...full.error.issues.map(i=>({field:String(i.path[0]),message:i.message})));
    return collectTabletIssues(issues,value,catalogue,photos,priceText,step);
}
export function reachableTabletStep(issues: WizardIssue[]) { return issues.length ? Math.min(...issues.map(i => fieldStep(i.field))) : 5; }
