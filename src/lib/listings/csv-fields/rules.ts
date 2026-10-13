import { z } from 'zod';

const scalar = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export const valuesSchema = z.record(scalar);
const condition = z.discriminatedUnion('operation', [
  z.object({field: z.string().min(1), operation: z.literal('answered')}).strict(),
  z.object({field: z.string().min(1), operation: z.literal('equals'), value: scalar}).strict(),
]);
export const ruleSchema = z.object({
  field: z.string().min(1), widget: z.enum(['boolean', 'number-sample', 'catalogue', 'number', 'text', 'date', 'unresolved', 'linked-common']).optional(),
  lookupDependent: z.boolean().optional(),
  visibleWhen: condition.optional(), enabledWhen: condition.optional(),
  required: z.enum(['unknown', 'optional', 'required']).optional(), requiredWhen: condition.optional(),
}).strict();
export type PreviewRule = z.infer<typeof ruleSchema>;
export type Values = z.infer<typeof valuesSchema>;
export const lookupStateSchema = z.enum(['unstarted', 'ready', 'loading', 'error', 'empty']);
export const answered = (value: unknown) => value !== undefined && value !== null && value !== '';
function matches(test: z.infer<typeof condition>, values: Values) {
  return test.operation === 'answered' ? answered(values[test.field]) : Object.hasOwn(values, test.field) && values[test.field] === test.value;
}
export function evaluateField(input: unknown) {
  const context = z.object({field: z.string(), applicable: z.boolean(), values: valuesSchema, rule: ruleSchema.optional(), lookup: lookupStateSchema.optional()}).strict().parse(input);
  const rule = context.rule;
  if (rule && rule.field !== context.field) throw new Error('Rule field does not match context');
  const visible = context.applicable && (!rule?.visibleWhen || matches(rule.visibleWhen, context.values));
  const enabled = visible && (!rule?.enabledWhen || matches(rule.enabledWhen, context.values)) && (!rule?.lookupDependent || context.lookup === 'ready');
  const required = !rule?.required || rule.required === 'unknown' ? 'unknown' : rule.requiredWhen && !matches(rule.requiredWhen, context.values) ? 'optional' : rule.required;
  return {visible, enabled, required, widget: rule?.widget ?? 'unresolved', publishingAuthorized: false as const};
}
// Explicit, path-scoped demonstration overrides. Workbook recommendations stay proposals.
export function proposalFor(field: {key: string; proposal: Record<string, string>}, covered: boolean): PreviewRule | undefined {
  if (covered && field.key === 'model') return {field: field.key, widget: 'catalogue', lookupDependent: true, enabledWhen: {field: 'brand', operation: 'answered'}};
  if (covered && field.key === 'brand') return {field: field.key, widget: 'catalogue'};
  const hint = field.proposal['Input hint - PROPOSED'] ?? '';
  if (hint.startsWith('boolean')) return {field: field.key, widget: 'boolean'};
  // Only storage_gb demonstrates numeric drafting. No bounds or requiredness inferred.
  if (field.key === 'storage_gb') return {field: field.key, widget: 'number-sample'};
  return undefined;
}
export function incompatibleModel(current: {brand: string; model?: string}, nextBrand: string) {
  return answered(current.model) && current.brand !== nextBrand;
}
export function confirmBrandChange(input: unknown, confirmed: boolean) {
  const request = z.object({values: valuesSchema, nextBrand: z.string()}).strict().parse(input);
  const incompatible = incompatibleModel({brand: String(request.values.brand ?? ''), model: String(request.values.model ?? '')}, request.nextBrand);
  if (incompatible && !confirmed) return {needsConfirmation: true, values: request.values};
  const values: Values = {...request.values, brand: request.nextBrand};
  if (incompatible) delete values.model;
  return {needsConfirmation: false, values};
}
