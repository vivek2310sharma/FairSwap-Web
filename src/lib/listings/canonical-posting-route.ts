import { z } from "zod";
import { isCanonicalCategorySlug, CANONICAL_CATEGORY_PARENTS, type CanonicalLeafSlug } from "./canonical-category-slugs";

export const CANONICAL_POSTING_PATH = "/account/listings/new";
const querySchema = z.object({ category: z.string().refine(value =>
  isCanonicalCategorySlug(value) && CANONICAL_CATEGORY_PARENTS[value] !== null,
) }).strict();

/** Legacy, mixed, repeated and unknown creation queries cannot select a form. */
export function resolveCreationQuery(query: Record<string, string | string[] | undefined>):
  { kind: "chooser" } | { kind: "redirect" } | { kind: "category"; slug: CanonicalLeafSlug } {
  const supplied = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
  if (Object.keys(supplied).length === 0) return { kind: "chooser" };
  const parsed = querySchema.safeParse(supplied);
  return parsed.success ? { kind: "category", slug: parsed.data.category as CanonicalLeafSlug } : { kind: "redirect" };
}

export function canonicalCategoryHref(slug: CanonicalLeafSlug) {
  return `${CANONICAL_POSTING_PATH}?${new URLSearchParams({ category: slug })}`;
}
