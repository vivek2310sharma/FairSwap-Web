import { z } from 'zod';
import { catalogueScope, sourceCategories } from './contract';
import { assessCompatibility, compatibilitySchema, proposalForPath } from './two-wheeler-proposal';

// Refine meaningful identities without transforming any source string.
const identity = z.string().refine(value => value.trim().length > 0, 'Expected a nonblank source identity');
const order = z.number().int().nonnegative();
const sourceRow = z.number().int().min(2);
export const carCatalogueRowSchema = z.object({
  id: identity, catalogue: z.literal('cars'), sourceOrder: order,
  source: z.object({file: z.literal('india_car_brands_models.csv'), row: sourceRow}).strict(),
  raw: z.object({brand: identity, model: identity, body_type: identity, segment: identity, status: identity}).strict(),
}).strict();
export const twoWheelerCatalogueRowSchema = z.object({
  id: identity, catalogue: z.literal('two-wheelers'), sourceOrder: order,
  source: z.object({file: z.literal('india_bike_scooter_brands_models.csv'), row: sourceRow}).strict(),
  raw: z.object({brand: identity, model: identity, vehicle_type: identity, category: identity, engine_cc: z.string(), fuel_type: identity, status: identity}).strict(),
}).strict();
export const catalogueRowSchema = z.discriminatedUnion('catalogue', [carCatalogueRowSchema, twoWheelerCatalogueRowSchema]).superRefine((row, context) => {
  if (row.source.row !== row.sourceOrder + 2) context.addIssue({code: z.ZodIssueCode.custom, path: ['source', 'row'], message: 'Source row must match original source order + header offset'});
  if (row.id !== `${row.source.file}:${row.source.row}`) context.addIssue({code: z.ZodIssueCode.custom, path: ['id'], message: 'Review row ID must match exact source file and row'});
});
export type CatalogueRow = z.infer<typeof catalogueRowSchema>;
export const lookupSchema = z.object({path: z.string().min(1), brand: z.string().default(''), search: z.string().max(100).default(''), offset: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(25).default(20), selected: z.string().default(''), view:z.enum(['leaf','review']).default('leaf')}).strict();
export const lookupResultSchema = z.object({brands: z.array(z.string()), rows: z.array(catalogueRowSchema), total: z.number(), selectableTotal:z.number(), offset: z.number(), limit: z.number(), selected: catalogueRowSchema.nullable(), compatibilities:z.record(compatibilitySchema), coverageSummary:z.object({sourceRows:z.number(),broadGroupRows:z.number(),outsideBroadGroup:z.number(),proposedCompatible:z.number(),unresolved:z.number(),incompatible:z.number(),approvedCompatible:z.literal(0)}).strict(), crosswalk: z.object({status: z.literal('unresolved'), sourceLeaf: z.string(), catalogueLabels: z.array(z.string()), note: z.string()}), coverage: z.boolean()}).strict();
export type LookupResult = z.infer<typeof lookupResultSchema>;
export function lookupCatalogue(inputRows: unknown, input: unknown): LookupResult {
  const rows = z.array(catalogueRowSchema).parse(inputRows);
  const query = lookupSchema.parse(input);
  const category = sourceCategories.find(c => c.reviewKey === query.path);
  if (!category) throw new Error('Unknown review path');
  const scope = catalogueScope(category.path[1]);
  const covered = scope ? rows.filter(r => r.catalogue === scope.catalogue && (scope.types.length === 0 || (r.catalogue === 'two-wheelers' && scope.types.includes(r.raw.vehicle_type)))) : [];
  const overlay=proposalForPath(category.reviewKey);
  const classification=new Map(covered.map(row=>[row.id,assessCompatibility(category,row)]));
  const selectable=covered.filter(row=>!overlay || classification.get(row.id)?.status==='proposed-compatible');
  const branded = query.brand ? covered.filter(r => r.raw.brand === query.brand) : [];
  const selectableBranded=selectable.filter(r=>r.raw.brand===query.brand);
  const candidates=query.view==='review'?branded:selectableBranded;
  const filtered = candidates.filter(r => r.raw.model.toLowerCase().includes(query.search.toLowerCase()));
  const page=filtered.slice(query.offset, query.offset + query.limit);
  const selected=selectableBranded.find(r=>r.id===query.selected)??null;
  const count=(status:string)=>covered.filter(r=>classification.get(r.id)?.status===status).length;
  return {
    brands: [...new Set(covered.map(r => r.raw.brand))], rows: page, total: filtered.length, selectableTotal:selectableBranded.length, offset: query.offset, limit: query.limit,
    selected, coverage: !!scope, compatibilities:Object.fromEntries([...page,...(selected?[selected]:[])].map(r=>[r.id,classification.get(r.id)!])),
    coverageSummary:{sourceRows:rows.filter(r=>r.catalogue===scope?.catalogue).length,broadGroupRows:covered.length,outsideBroadGroup:rows.filter(r=>r.catalogue===scope?.catalogue).length-covered.length,proposedCompatible:count('proposed-compatible'),unresolved:count('unresolved'),incompatible:count('incompatible'),approvedCompatible:0},
    crosswalk: {status: 'unresolved', sourceLeaf: category.path[2], catalogueLabels: [...new Set(covered.map(r => r.catalogue === 'cars' ? `${r.raw.body_type} / ${r.raw.segment}` : `${r.raw.vehicle_type} / ${r.raw.category}`))],
      note: overlay ? 'Explicit proposed leaf filtering uses source vehicle_type/category/fuel predicates. No mapping is approved. Broad-group review retains incompatible and unresolved rows with reasons; model names and lifecycle do not establish compatibility or eligibility.' : scope ? 'Proposed broad-group lookup only. Leaf body/style/segment/powertrain compatibility is unverified. Cars have no fuel/year/variant columns; model names cannot resolve powertrain. Lifecycle is not posting eligibility.' : 'No dedicated catalogue supplied for this group. No fallback catalogue or invented options.'},
  };
}
