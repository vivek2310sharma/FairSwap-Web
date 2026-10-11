import { z } from "zod";

export const macroCategorySchema = z.enum(["goods", "vehicles", "property"]);
export type MacroCategory = z.infer<typeof macroCategorySchema>;

export type MacroCategoryQueryResult =
  | { status: "missing" }
  | { status: "valid"; macroCategory: MacroCategory }
  | { status: "invalid" };

/** URL state only: this does not authorize a category or create a draft. */
export function parseMacroCategory(
  value: string | string[] | undefined
): MacroCategoryQueryResult {
  if (value === undefined) return { status: "missing" };
  if (Array.isArray(value)) return { status: "invalid" };

  const result = macroCategorySchema.safeParse(value);
  return result.success
    ? { status: "valid", macroCategory: result.data }
    : { status: "invalid" };
}

export function buildMacroCategoryUrl(macroCategory: MacroCategory): string {
  const query = new URLSearchParams({
    macro: macroCategorySchema.parse(macroCategory),
  });
  return `/account/listings/new?${query.toString()}`;
}
