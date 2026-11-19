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
