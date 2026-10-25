import { z } from "zod";
import { changePostingSelection } from "../posting-selection";

export const STORAGE = ["8 GB", "16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB", "Other", "Not applicable"] as const;
export const RAM = ["2 GB", "3 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB"] as const;
export const CONDITIONS = { new: "Brand new (sealed box)", like_new: "Like new", good: "Good condition", fair: "Fair (visible wear)", poor: "Needs repair/not working" } as const;
export const INCLUDED = ["Original box", "Bill/invoice", "Charger", "Under warranty"] as const;
export const selectionSchema = z.object({ category: z.literal("mobiles"), subcategory: z.literal("mobile-phones"), version: z.literal(2) }).strict();
export const mobileSchema = z.object({
  selection: selectionSchema,
  session_id: z.string().uuid(),
  trade: z.enum(["sell", "giveaway"]),
  brand_id: z.string().uuid(), model_id: z.string().uuid(),
  other_model: z.string().trim().max(100).default(""),
  storage: z.enum(STORAGE), ram: z.union([z.enum(RAM), z.literal("")]),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]),
  included: z.array(z.enum(INCLUDED)).max(4), warranty_until: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).or(z.literal("")),
  title: z.string().trim().min(3).max(150), description: z.string().trim().min(10).max(5000),
  price_paise: z.number().int().min(0).max(100000000), negotiable: z.boolean(),
  pin_code: z.string().regex(/^[1-9]\d{5}$/), city_id: z.string().uuid(), locality_id: z.string().uuid(),
  media_ids: z.array(z.string().uuid()).min(1).max(8), plan_id: z.literal("free-v1"),
}).strict().superRefine((v, ctx) => {
  if ((v.trade === "giveaway" && (v.price_paise !== 0 || v.negotiable)) || (v.trade === "sell" && v.price_paise < 1)) ctx.addIssue({code: "custom", path: ["price_paise"], message: "Check Price and trade type."});
  if (new Set(v.media_ids).size !== v.media_ids.length) ctx.addIssue({code: "custom", path: ["media_ids"], message: "Choose distinct photos."});
  if (v.included.includes("Under warranty") && (!v.warranty_until || v.warranty_until < new Date().toISOString().slice(0,7))) ctx.addIssue({code: "custom", path: ["warranty_until"], message: "Enter a current warranty expiry month."});
  if (!v.included.includes("Under warranty") && v.warranty_until) ctx.addIssue({code: "custom", path: ["warranty_until"], message: "Clear warranty expiry or select Under warranty."});
});
export type MobileSubmission = z.infer<typeof mobileSchema>;
export const catalogueSchema = z.object({ version: z.literal(2), revision: z.string(), listing_category_id:z.string().uuid(), selection: selectionSchema, enabled: z.boolean(), brands: z.array(z.object({id:z.string().uuid(), name:z.string(), aliases:z.array(z.string()), sort_order:z.number()})), models:z.array(z.object({id:z.string().uuid(), brand_id:z.string().uuid(), name:z.string(), aliases:z.array(z.string()), older_group:z.boolean(), other:z.boolean(), sort_order:z.number()})) });
export type MobileCatalogue = z.infer<typeof catalogueSchema>;
/** Manual selection and a future user-confirmed AI choice share this boundary. */
export function selectPostingCategory(input: unknown, catalogue: MobileCatalogue) {
  const choice = selectionSchema.parse(input);
  if (!catalogue.enabled || choice.subcategory !== catalogue.selection.subcategory) throw new Error("This category is coming soon.");
  changePostingSelection({choice:null,detailsContract:null,common:{},photos:[],details:{}},choice,[{...choice,listingCategoryId:catalogue.listing_category_id,detailsContract:"mobile-v2",enabled:catalogue.enabled}]);
  return choice;
}
export function mobileTitle(model: string, storage: string, condition: keyof typeof CONDITIONS) {
  return [model, storage === "Not applicable" ? "" : storage, CONDITIONS[condition]].filter(Boolean).join(" · ").slice(0,150);
}
/** Specs such as 128 GB / 5000 mAh are not phone numbers. Reasons contain no PII. */
export function phoneRiskSignals(text: string, otherModel = false) {
  const normalized = text.normalize("NFKC");
  const signals: string[] = otherModel ? ["other_model"] : [];
  if (/(?:\+?91[\s.-]?)?[6-9](?:[\s.-]?\d){9}(?!\d)|\b(?:wa\.me|t\.me)\//i.test(normalized)) signals.push("off_platform_contact");
  if (/\b[a-z0-9._-]{2,}@(?!gmail\b|yahoo\b|outlook\b)[a-z][a-z0-9.]{1,}\b|upi:\/\/|(?:https?:\/\/)?(?:paytm\.me|rzp\.io|pay\.google\.com)\//i.test(normalized)) signals.push("payment_destination");
  if (/(?:courier|shipping|delivery|कूरियर|डिलीवरी).{0,40}(?:fee|charge|advance|pay|शुल्क|पैसे)|(?:advance|पहले).{0,30}(?:upi|pay|payment|भुगतान)/i.test(normalized)) signals.push("advance_or_courier_request");
  return signals;
}
