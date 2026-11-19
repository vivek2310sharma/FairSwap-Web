import { z } from "zod";
import { phoneRiskSignals } from "../mobiles/contract";
import { isOrdinaryGoodsSlug, isPropertyIntakeSlug, isRegulatedVehicleDraftSlug } from "./categories";

export const uuid = z.string().uuid();
export const goodsSlug = z.string().refine(isOrdinaryGoodsSlug);
const field = {
  key: z.string().regex(/^[a-z][a-z_]{0,30}$/),
  label: z.string().min(1).max(80),
  required: z.boolean(),
};
export const goodsDefinition = z.object({
  slug: goodsSlug, category_id: uuid, revision: z.number().int().positive(),
  risk: z.enum(["general", "electronics", "electrical"]),
  fields: z.array(z.discriminatedUnion("kind", [
    z.object({ ...field, kind: z.literal("text"), choices: z.array(z.string().min(1).max(100)).min(1).max(12).optional() }).strict(),
    z.object({ ...field, kind: z.literal("number"), min: z.number(), max: z.number() }).strict(),
  ])).min(1).max(12),
}).strict().superRefine(({ fields }, ctx) => {
  if (new Set(fields.map(f => f.key)).size !== fields.length ||
    fields.some(f => ["defects", "safety_confirmed", "power_safe", "constructor", "prototype"].includes(f.key) ||
      (f.kind === "number" && f.min > f.max))) ctx.addIssue({ code: "custom", message: "Invalid category fields." });
});
export type GoodsDefinition = z.infer<typeof goodsDefinition>;

export const goodsDetails = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]),
});
export const goodsLocation = z.object({
  pin_code: z.string().regex(/^[1-9][0-9]{5}$/), city_id: uuid, locality_id: uuid,
});
export const goodsSubmission = goodsDetails.merge(goodsLocation).extend({
  slug: goodsSlug, category_id: uuid, revision: z.number().int().positive(), session_id: uuid,
  condition: goodsDetails.shape.condition.nullable(),
  price_type: z.enum(["fixed", "negotiable", "free"]).nullable(),
  price_paise: z.number().int().min(0).max(100_000_000).nullable(),
  answers: z.record(z.string(), z.union([z.string().max(500), z.number().finite(), z.boolean()])),
  media_ids: z.array(uuid).min(1).max(8).refine(ids => new Set(ids).size === ids.length),
}).strict();
export type GoodsSubmission = z.infer<typeof goodsSubmission>;

export function goodsAnswers(def: GoodsDefinition) {
  const fields = Object.fromEntries(def.fields.map(f => {
    const schema = f.kind === "number" ? z.number().finite().min(f.min).max(f.max) : z.string().trim().min(1).max(100).refine(value => !f.choices || f.choices.includes(value));
    return [f.key, f.required ? schema : schema.optional()];
  }));
  return z.object(fields).strict();
}

export function goodsTextAllowed(values: unknown[]) {
  const value = values.filter(v => typeof v === "string").join(" ").normalize("NFKC");
  return !phoneRiskSignals(value).length &&
    !/(https?:\/\/|www\.|scan.{0,25}qr|upi\s+pin|share.{0,15}otp|\b(firearms?|ammunition|explosives?|narcotics?|counterfeit|stolen|recalled|vape|prescription|ivory|pesticide|fireworks?|liquor)\b|live\s+(?:animals?|dogs?|cats?|fish)|pupp(?:y|ies).{0,15}for sale|child.{0,10}car seats?|swollen.{0,15}batter|batter.{0,15}swollen|exposed.{0,15}wir|electric.{0,15}shock|leak.{0,15}batter)/i.test(value);
}

export function selectedGoodsSubmission(def: GoodsDefinition) {
  const answers = goodsAnswers(def).extend({
    safety_confirmed: z.literal(true), defects: z.string().trim().max(500),
    power_safe: z.literal(true),
  });
  return goodsSubmission.extend({ answers }).superRefine((value, ctx) => {
    function issue(path: string, message: string) { ctx.addIssue({ code: "custom", path: [path], message }); }
    if (isRegulatedVehicleDraftSlug(def.slug)) issue("slug", "This vehicle can only be saved as a draft.");
    if (value.slug !== def.slug || value.category_id !== def.category_id || value.revision !== def.revision) issue("slug", "Category details changed. Open the category again.");
    if (isPropertyIntakeSlug(def.slug)) {
      if (value.condition !== null || value.price_type !== null || value.price_paise !== null) issue("price_paise", "Use the property terms.");
      const terms = value.answers as Record<string, unknown>;
      if (["amount_paise", "deposit_paise", "charges_paise"].some(key => !Number.isSafeInteger(terms[key]))) issue("answers", "Enter exact property amounts.");
      if (terms.offer === "Sale" && (terms.deposit_paise !== 0 || terms.charges_paise !== 0)) issue("answers", "Sale offers cannot include a deposit or monthly charge.");
      if (/verified owner|verified landlord|(flat|unit|door|house)\s*(no[.]?|number|#)\s*[a-z0-9]+|aadhaar|aadhar|advance.{0,25}(rent|deposit|payment)|payment.{0,25}(before|upfront)/i.test(
        [value.title, value.description, ...Object.values(value.answers)].join(" ").normalize("NFKC"))) issue("description", "Remove private address or identity details and verification or payment claims.");
    } else if (value.condition === null || value.price_type === null || value.price_paise === null ||
      (value.price_type === "free" ? value.price_paise !== 0 : value.price_paise < 100)) {
      issue("price_paise", "Enter a selling price of at least ₹1 or choose Give Away.");
    }
    if (["fair", "poor"].includes(value.condition ?? "") && String(value.answers.defects).length < 5) issue("answers", "Describe the faults or wear.");
    if (value.slug === "v2-bicycles" && /electric|battery|throttle|engine|motor[ -]?assist|conversion kit|e[- ]?bike|e[- ]?cycle/i.test(
      [value.title, value.description, ...Object.values(value.answers)].join(" ").normalize("NFKC"))) {
      issue("description", "Only unpowered pedal bicycles belong in this category.");
    }
    if (!goodsTextAllowed([value.title, value.description, ...Object.values(value.answers)])) issue("description", "Remove prohibited products, unsafe items and contact or payment requests.");
  });
}

export function parseGoodsPrice(text: string) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(text)) return null;
  const [rupees, fraction = ""] = text.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return paise >= 100 && paise <= 100_000_000 ? paise : null;
}


export function parsePropertyPaise(text: string) {
  if (!/^\d{1,11}(?:\.\d{1,2})?$/.test(text)) return null;
  const [rupees, fraction = ""] = text.split(".");
  const amount = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return amount <= 1_000_000_000_000 ? amount : null;
}
