import { isOrdinaryGoodsSlug, isPropertyIntakeSlug, isSpecialistVehicleDraftSlug } from "./ordinary-goods/categories";
import { z } from "zod";
import { FAMILY_CHOOSER_ROUTES, type MainCategory, type SubRoute } from "./post-ad-category-catalogue";
import { CANONICAL_CATEGORY_PARENTS, isCanonicalCategorySlug } from "./canonical-category-slugs";

const uuid = z.string().uuid().transform(value => value.toLowerCase());
const nodeSchema = z.object({
  id: uuid,
  parent_id: uuid.nullable(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  status: z.enum(["live", "coming_soon"]),
  posting_flow: z.enum([
    "generic", "accessory", "adoption_rehoming", "property", "specialist:phone",
    "specialist:tablet", "specialist:wearable", "specialist:car", "specialist:two_wheeler",
  ]).nullable(),
  catalogue_mode: z.enum(["none", "brand_only", "brand_model"]).nullable(),
  sort_order: z.number().int(),
  posting_enabled: z.boolean(),
}).strict();

export const taxonomySchema = z.object({
  api_version: z.literal(2),
  taxonomy_revision: z.literal("catalogue-2"),
  revision: z.string().regex(/^[a-f0-9]{32}$/),
  configuration_revision: z.string().regex(/^[a-f0-9]{32}$/),
  nodes: z.array(nodeSchema).length(78),
}).strict().superRefine(({ nodes }, ctx) => {
  const ids = new Map(nodes.map(node => [node.id, node]));
  const roots = nodes.filter(node => node.parent_id === null);
  const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
  if (ids.size !== 78 || new Set(nodes.map(node => node.slug)).size !== 78 || roots.length !== 15) {
    invalid("Invalid category identities or group count");
  }
  for (const root of roots) {
    if (["v2-services", "v2-jobs"].includes(root.slug) &&
      (root.status !== "coming_soon" || nodes.some(node => node.parent_id === root.id))) {
      invalid("Unavailable service groups cannot have children");
    }
  }
  for (const node of nodes) {
    const parent = node.parent_id ? ids.get(node.parent_id) : undefined;
    if (!isCanonicalCategorySlug(node.slug) ||
      CANONICAL_CATEGORY_PARENTS[node.slug] !== (parent?.slug ?? null)) {
      invalid("Unknown category slug or canonical parent mismatch");
    }
    if (node.parent_id
      ? !parent || parent.parent_id !== null || !node.posting_flow || !node.catalogue_mode
      : node.posting_flow !== null || node.catalogue_mode !== null || node.posting_enabled) {
      invalid("Invalid category hierarchy");
    }
    if (node.posting_enabled && (node.status !== "live" || parent?.status !== "live")) {
      invalid("Unavailable category cannot post");
    }
  }
});

// Search hints only. Labels, hierarchy and identities always come from the RPC.
const synonyms: Readonly<Record<string, readonly string[]>> = {
  "mobile-phones": ["iphone", "smartphone", "android"],
  "v2-refrigerators": ["fridge"],
  "v2-sofas-dining": ["sofa"],
  "v2-motorcycles-scooters": ["activa", "motorbike", "scooter"],
  "v2-tvs": ["television"],
};

export function parseTaxonomy(
  value: unknown,
  bindings: Readonly<Record<string, string | undefined>> = {},
): readonly MainCategory[] {
  const data = taxonomySchema.parse(value);
  const ordered = [...data.nodes].sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
  return ordered.filter(node => !node.parent_id).map(root => ({
    id: root.slug,
    label: { en: root.name },
    description: "",
    aliases: [root.slug],
    trust: {
      status: "planned",
      message: "",
      disclaimer: "Availability depends on the supported posting flow.",
    },
    subs: ordered.filter(node => node.parent_id === root.id).map(node => {
      let route: SubRoute = { kind: "none" };
      // An enabled flag is insufficient: identity must match an independently
      // loaded specialist catalogue, and the client checks its own capability.
      if (root.slug === "v2-mobiles-tablets" && root.status === "live" &&
        bindings[node.posting_flow ?? ""] === node.id && node.posting_enabled && node.status === "live") {
        if (node.slug === "mobile-phones" && node.posting_flow === "specialist:phone") route = { kind: "mobile-phones" };
        if (node.slug === "tablets" && node.posting_flow === "specialist:tablet") route = { kind: "tablets" };
        if (node.slug === "wearables" && node.posting_flow === "specialist:wearable") route = { kind: "wearables" };
      }
      const familyRoute = Object.hasOwn(FAMILY_CHOOSER_ROUTES, node.slug) ? FAMILY_CHOOSER_ROUTES[node.slug] : undefined;
      if (familyRoute && node.posting_enabled && node.status === "live" && root.status === "live" &&
        ((node.slug === "v2-cars" && node.posting_flow === "specialist:car") ||
         (node.slug === "v2-motorcycles-scooters" && node.posting_flow === "specialist:two_wheeler") ||
         (familyRoute.kind === "property" && node.posting_flow === "property"))) route = familyRoute;
      // Family/unsupported canonical IDs must never fall through to generic writes.
      if (!familyRoute && !isPropertyIntakeSlug(node.slug) && !isSpecialistVehicleDraftSlug(node.slug) &&
        !["v2-commercial-vehicles", "v2-electric-cycles-low-speed-evs", "v2-bicycles", "v2-other-items"].includes(node.slug) &&
        node.posting_enabled && (node.posting_flow === "generic" ||
        (node.posting_flow === "accessory" && root.slug === "v2-mobiles-tablets")) && isOrdinaryGoodsSlug(node.slug) &&
        bindings[node.slug] === node.id) route = { kind: "ordinary-goods", categoryId: node.id };
      return {
        id: node.slug,
        label: node.name,
        aliases: [node.slug, ...(synonyms[node.slug] ?? [])],
        categoryId: node.id,
        route,
      };
    }),
  }));
}
