import { z } from "zod";
import { mobileSchema, mobileTitle, type MobileSubmission } from "@/lib/listings/mobiles/contract";
export const STEP_LABELS = ["Photos", "Phone details", "Condition", "Price", "Location"] as const;
export type PhoneDraft = Omit<MobileSubmission, "storage" | "condition"> & {
    storage: MobileSubmission["storage"] | "";
    condition: MobileSubmission["condition"] | "";
};
export function blankPhoneDraft(): PhoneDraft { return { selection: { category: "mobiles", subcategory: "mobile-phones", version: 2 }, session_id: "", trade: "sell", brand_id: "", model_id: "", other_model: "", storage: "", ram: "", condition: "", included: [], warranty_until: "", title: "", description: "", price_paise: 0, negotiable: false, pin_code: "", city_id: "", locality_id: "", media_ids: [], plan_id: "free-v1" }; }
const draftSchema = mobileSchema.innerType().extend({ brand_id: z.string(), model_id: z.string(), storage: mobileSchema.innerType().shape.storage.or(z.literal("")), condition: mobileSchema.innerType().shape.condition.or(z.literal("")), title: z.string().max(150), description: z.string().max(5000), pin_code: z.string().max(6), city_id: z.string(), locality_id: z.string(), media_ids: z.array(z.string()).max(8) });
export const phoneRecoverySchema = z.object({ version: z.literal(2), owner: z.string().uuid(), updated: z.number(), draft: draftSchema, step: z.number().int().min(0).max(5).default(0), manualTitle: z.boolean(), area: z.string(), priceText: z.string().max(20), photos: z.array(z.object({ id: z.string().uuid(), state: z.enum(["pending", "uploading", "ready", "failed"]), blob: z.instanceof(Blob).optional() })).max(8) });
export type PhoneRecovery = z.infer<typeof phoneRecoverySchema>;
export function generatedPhoneTitle(brand: string, model: string, storage: PhoneDraft["storage"], condition: PhoneDraft["condition"]) {
    if (!model)
        return "";
    const name = brand && !model.toLocaleLowerCase().startsWith(brand.toLocaleLowerCase() + " ") && model.toLocaleLowerCase() !== brand.toLocaleLowerCase() ? `${brand} ${model}` : model;
    return condition ? mobileTitle(name, storage, condition) : [name, storage === "Not applicable" ? "" : storage].filter(Boolean).join(" · ").slice(0, 150);
}
export function fieldStep(field: string) { if (field === "media_ids")
    return 0; if (["brand_id", "model_id", "other_model", "storage", "ram"].includes(field))
    return 1; if (["condition", "included", "warranty_until", "title", "description"].includes(field))
    return 2; if (["trade", "price_paise", "negotiable"].includes(field))
    return 3; return 4; }
