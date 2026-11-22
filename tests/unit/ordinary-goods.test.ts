import { describe, expect, it } from "vitest";
import fixture from "./taxonomy-v2-fixture.json";
import { isOrdinaryGoodsSlug } from "@/lib/listings/ordinary-goods/categories";
import { goodsDefinition, parseGoodsPrice, selectedGoodsSubmission } from "@/lib/listings/ordinary-goods/contract";
import { parseTaxonomy } from "@/lib/listings/taxonomy-v2";

const goods = fixture.nodes.filter(n => isOrdinaryGoodsSlug(n.slug));
const definition = goodsDefinition.parse({
  slug: "v2-laptops", category_id: goods.find(n => n.slug === "v2-laptops")?.id, revision: 1,
  risk: "electronics", fields: [{ key: "ram", label: "RAM", required: true, kind: "number", min: 1, max: 512 }],
});
const uuid = "11111111-1111-4111-8111-111111111111";
const valid = {
  ...definition, session_id: uuid, title: "Example laptop", description: "Carefully used for two years.",
  condition: "good", price_type: "fixed", price_paise: 129999, answers: { ram: 8, safety_confirmed: true, power_safe: true, defects: "" },
  pin_code: "560001", city_id: uuid, locality_id: uuid, media_ids: [uuid],
};
const { slug, category_id, revision, session_id, title, description, condition, price_type, price_paise, answers, pin_code, city_id, locality_id, media_ids } = valid;
const payload = { slug, category_id, revision, session_id, title, description, condition, price_type, price_paise, answers, pin_code, city_id, locality_id, media_ids };
const schema = selectedGoodsSubmission(definition);

describe("Ordinary Goods taxonomy", () => {
  it("scopes the release to thirteen groups and exactly 58 leaves", () => {
    expect(goods).toHaveLength(58);
    expect(new Set(goods.map(n => n.parent_id)).size).toBe(13);
  });

  it.each(goods)("routes $slug only when both authorities agree on the persisted UUID", node => {
    const tree = structuredClone(fixture);
    const leaf = tree.nodes.find(n => n.slug === node.slug)!;
    const route = (bindings: Record<string, string>) => parseTaxonomy(tree, bindings).flatMap(g => g.subs).find(x => x.id === node.slug)?.route;
    expect(route({ [node.slug]: node.id })).toEqual({ kind: "none" });
    leaf.posting_enabled = true;
    leaf.status = "live";
    expect(route({ [node.slug]: uuid })).toEqual({ kind: "none" });
    expect(route({ [node.slug]: node.id })).toEqual({ kind: "ordinary-goods", categoryId: node.id });
  });
});

it("preserves exact INR paise and accepts the explicit giveaway price", () => {
  expect(parseGoodsPrice("1299.99")).toBe(129999);
  expect(parseGoodsPrice("1.001")).toBeNull();
  expect(parseGoodsPrice("1000001")).toBeNull();
  expect(schema.safeParse(payload).success).toBe(true);
  expect(schema.safeParse({ ...payload, price_type: "free", price_paise: 0 }).success).toBe(true);
});
it.each([
  { slug: "v2-tvs" }, { category_id: uuid }, { revision: 2 }, { media_ids: [uuid, uuid] },
  { price_type: "free" }, { pin_code: "012345" }, { description: "Pay https://example.com now" },
  { description: "Scan the QR to receive payment" }, { description: "Has a swollen battery." }, { description: "Live animals for sale." },
  { answers: { ...answers, power_safe: false } }, { answers: { ...answers, safety_confirmed: false } },
  { answers: { ...answers, ram: "8" } }, { answers: { ...answers, ram: 999 } },
  { answers: { ...answers, unexpected: "extra" } }, { condition: "poor" },
])("rejects invalid state %j", override => {
  expect(schema.safeParse({ ...payload, ...override }).success).toBe(false);
});

it.each([
  "v2-cars", "v2-motorcycles-scooters",
])("rejects the generic flow for specialist %s", slug => {
  const tree = structuredClone(fixture);
  const leaf = tree.nodes.find(node => node.slug === slug)!;
  expect(leaf.id).toBeTruthy();
  leaf.status = "live";
  leaf.posting_enabled = true;
  leaf.posting_flow = "generic";
  expect(parseTaxonomy(tree, { [slug]: leaf.id }).flatMap(group => group.subs)
    .find(sub => sub.id === slug)?.route).toEqual({ kind: "none" });
});


it.each(["v2-cars", "v2-motorcycles-scooters", "v2-commercial-vehicles", "v2-electric-cycles-low-speed-evs"])(
  "rejects otherwise valid submissions for draft-only %s",
  slug => {
    const category_id = goods.find(node => node.slug === slug)!.id;
    const contract = goodsDefinition.parse({ ...definition, slug, category_id });
    const result = selectedGoodsSubmission(contract).safeParse({ ...payload, slug, category_id });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.message))
      .toContain("This vehicle can only be saved as a draft.");
  },
);

// Field rows mirror Backend V3 migration 20261119092042_ordinary_goods_v3.sql (pinned 58531d2).
const pilot = {
  "v2-books": { risk: "general", fields: [
    { key: "book_title", label: "Book title", required: true, kind: "text" },
    { key: "author", label: "Author", required: false, kind: "text" },
    { key: "edition", label: "Edition", required: false, kind: "text" },
    { key: "language", label: "Language", required: false, kind: "text" },
  ], answers: { book_title: "Collected stories" } },
  "v2-tables-chairs": { risk: "general", fields: [
    { key: "item_type", label: "Table or chair type", required: true, kind: "text" },
    { key: "material", label: "Material", required: false, kind: "text" },
    { key: "dimensions", label: "Dimensions (cm)", required: false, kind: "text" },
    { key: "quantity", label: "Quantity", required: false, kind: "number", min: 1, max: 100 },
  ], answers: { item_type: "Dining chair" } },
} as const;

describe.each(Object.entries(pilot))("%s pilot contract", (pilotSlug, spec) => {
  const id = goods.find(node => node.slug === pilotSlug)!.id;
  const contract = goodsDefinition.parse({ slug: pilotSlug, category_id: id, revision: 1, risk: spec.risk, fields: spec.fields });
  const pilotSchema = selectedGoodsSubmission(contract);
  const base = { ...payload, slug: pilotSlug, category_id: id, answers: { ...spec.answers, safety_confirmed: true, power_safe: true, defects: "" } };
  const required = spec.fields.find(f => f.required)!.key;

  it("is an enabled-by-taxonomy Goods leaf and accepts its minimal valid submission", () => {
    expect(isOrdinaryGoodsSlug(pilotSlug)).toBe(true);
    expect(pilotSchema.safeParse(base).success).toBe(true);
  });
  it.each([
    ["missing required answer", (a: Record<string, unknown>) => { delete a[required]; return a; }],
    ["blank required answer", (a: Record<string, unknown>) => ({ ...a, [required]: "   " })],
    ["unknown answer key", (a: Record<string, unknown>) => ({ ...a, injected: "x" })],
    ["over-long answer", (a: Record<string, unknown>) => ({ ...a, [required]: "x".repeat(101) })],
    ["prototype key", (a: Record<string, unknown>) => ({ ...a, constructor: "x" })],
    ["numeric required answer", (a: Record<string, unknown>) => ({ ...a, [required]: 5 })],
  ])("rejects %s", (_name, mutate) => {
    expect(pilotSchema.safeParse({ ...base, answers: mutate({ ...base.answers }) }).success).toBe(false);
  });
  it.each([
    { category_id: uuid }, { revision: 2 }, { slug: "v2-tvs" }, { price_type: null }, { price_paise: 99 },
    { price_type: "free" }, { media_ids: [] }, { description: "Call me on +91 98765 43210 to pay" },
    { title: "Pay via https://fake.example" }, { condition: "fair" },
  ])("rejects invalid envelope %j", override => {
    expect(pilotSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });
  it("accepts a described fair-condition item and the giveaway price", () => {
    expect(pilotSchema.safeParse({ ...base, condition: "fair", answers: { ...base.answers, defects: "Corner scuffs" } }).success).toBe(true);
    expect(pilotSchema.safeParse({ ...base, price_type: "free", price_paise: 0 }).success).toBe(true);
  });
  it("refuses to treat a different category's definition as this one", () => {
    expect(selectedGoodsSubmission({ ...contract, slug: "v2-tvs" }).safeParse(base).success).toBe(false);
  });
});

it("Tables & Chairs enforces its bounded optional quantity", () => {
  const id = goods.find(node => node.slug === "v2-tables-chairs")!.id;
  const contract = goodsDefinition.parse({ slug: "v2-tables-chairs", category_id: id, revision: 1, risk: "general", fields: pilot["v2-tables-chairs"].fields });
  const run = (quantity: unknown) => selectedGoodsSubmission(contract).safeParse({ ...payload, slug: "v2-tables-chairs", category_id: id,
    answers: { item_type: "Dining chair", quantity, safety_confirmed: true, power_safe: true, defects: "" } }).success;
  expect([run(1), run(100), run(4)]).toEqual([true, true, true]);
  expect([run(0), run(101), run("4"), run(Number.NaN), run(Infinity)]).toEqual([false, false, false, false, false]);
});
