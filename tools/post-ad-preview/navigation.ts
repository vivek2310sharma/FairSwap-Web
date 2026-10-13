import { macroCategorySchema, parseMacroCategory, type MacroCategory } from "../../src/lib/listings/macro-category";
export function previewSectionUrl(macro: MacroCategory | null) { return macro === null ? '/' : '/?'+new URLSearchParams({macro:macroCategorySchema.parse(macro)}).toString(); }
export function parsePreviewQuery(query: Pick<URLSearchParams, 'getAll'>) {const values=query.getAll('macro'); return parseMacroCategory(values.length === 0 ? undefined : values.length === 1 ? values[0] : values);}
