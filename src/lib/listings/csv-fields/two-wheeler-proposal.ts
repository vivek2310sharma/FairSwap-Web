import { z } from 'zod';
import overlay from './proposals/two-wheelers.v1.json';
import { sourceCategories, type SourceCategory } from './contract';
import { ruleSchema } from './rules';

const source = z.object({file:z.literal('india_categories.csv'),row:z.number().int().min(2)}).strict();
const proposalFieldSchema = z.object({
  definitionId:z.string(),key:z.string(),order:z.number().int().positive(),source,
  sourceStatus:z.literal('source-derived-membership'),proposalStatus:z.literal('proposed-not-approved'),
  input:z.enum(['catalogue','text','number','date','unresolved','linked-common']),units:z.string().nullable(),meaning:z.string(),
  bounds:z.object({min:z.number().nullable(),max:z.number().nullable(),integer:z.boolean(),upperBound:z.literal('current-calendar-year').nullable(),exclusiveMin:z.boolean(),maxLength:z.number().int().positive().nullable(),unresolvedReason:z.string().nullable()}).strict(),
  options:z.object({source:z.string().nullable(),values:z.array(z.union([z.string(),z.boolean(),z.null()])).nullable(),unresolvedReason:z.string().nullable()}).strict(),
  requirements:z.object({draft:z.literal('optional'),submission:z.enum(['required','optional','existing-common-contract']),source:z.literal('unknown'),note:z.string()}).strict(),
  visibility:z.object({scope:z.literal('exact-selected-source-path')}).strict(),rule:ruleSchema,
  valueHandling:z.object({dependency:z.literal('brand').nullable(),policy:z.string()}).strict(),
  persistence:z.object({status:z.literal('unresolved'),target:z.string(),reason:z.string()}).strict(),
}).strict();
const overlaySchema=z.object({
  version:z.literal(1),status:z.literal('proposed-not-approved'),sourceSnapshots:z.array(z.object({file:z.string(),sha256:z.string().regex(/^[0-9a-f]{64}$/)}).strict()),scope:z.string(),extensions:z.array(z.never()),
  extensionDecisions:z.object({fuel:z.string(),batteryCapacity:z.string()}).strict(),
  mappings:z.array(z.object({vehicleType:z.string(),style:z.string(),fuel:z.string().nullable(),leaf:z.string().nullable(),status:z.enum(['proposed-explicit','unresolved']),reason:z.string()}).strict()),
  paths:z.array(z.object({reviewKey:z.string(),path:z.array(z.string()).length(3),source,status:z.literal('proposed-not-approved'),fields:z.array(proposalFieldSchema)}).strict()),
}).strict();
export const twoWheelerProposal=overlaySchema.parse(overlay);
export type ProposedField=z.infer<typeof proposalFieldSchema>;
for(const path of twoWheelerProposal.paths){
  const original=sourceCategories.find(c=>c.reviewKey===path.reviewKey);
  if(!original || !['Motorcycles','Scooters'].includes(original.path[1]) || JSON.stringify(original.path)!==JSON.stringify(path.path) || original.source.row!==path.source.row || original.fields.length!==path.fields.length)throw Error('Proposal source path mismatch: '+path.reviewKey);
  for(const [index,field] of path.fields.entries()){
    const originalField=original.fields[index];
    if(originalField.id!==field.definitionId || originalField.key!==field.key || originalField.order!==field.order || originalField.source.row!==field.source.row || field.rule.field!==field.key)throw Error('Proposal source membership mismatch: '+field.definitionId);
  }
}
export const proposalForPath=(reviewKey:string)=>twoWheelerProposal.paths.find(p=>p.reviewKey===reviewKey);
export const compatibilitySchema=z.object({status:z.enum(['proposed-compatible','unresolved','incompatible']),approved:z.literal(false),sourceType:z.string(),sourceStyle:z.string(),mappingLeaf:z.string().nullable(),reason:z.string()}).strict();
export type Compatibility=z.infer<typeof compatibilitySchema>;
export function assessCompatibility(category:SourceCategory,row:{catalogue:string;raw:Record<string,string>}):Compatibility {
  const base={approved:false as const,sourceType:row.raw.vehicle_type??'not supplied',sourceStyle:row.raw.category??row.raw.body_type??'not supplied',mappingLeaf:null};
  if(row.catalogue!=='two-wheelers' || !proposalForPath(category.reviewKey))return {...base,status:'unresolved',reason:'No confirmed leaf mapping. Cars lack powertrain/year/variant data; never infer from model names.'};
  const mapping=twoWheelerProposal.mappings.find(m=>m.vehicleType===row.raw.vehicle_type && m.style===row.raw.category);
  if(!mapping || mapping.status==='unresolved')return {...base,status:'unresolved',reason:mapping?.reason??'No explicit proposed source-type/style mapping; row retained for review.'};
  if(mapping.fuel!==null && mapping.fuel!==row.raw.fuel_type)return {...base,status:'unresolved',reason:`Source fuel ${row.raw.fuel_type} does not match proposed ${mapping.fuel} predicate; retained for review.`};
  return {...base,mappingLeaf:mapping.leaf,status:mapping.leaf===category.path[2]?'proposed-compatible':'incompatible',reason:mapping.leaf===category.path[2]?mapping.reason:`Explicit proposal maps source type/style to ${mapping.leaf}, not ${category.path[2]}.`};
}
// Advisory only, never part of Goods or production submission validation.
export function proposalIssues(field:ProposedField,value:unknown,year:number):string[] {
  if(value===null || value===undefined || value==='')return [];
  if(field.input==='number'){
    if(typeof value!=='number' || !Number.isFinite(value))return ['Proposed input expects a finite number.'];
    const b=field.bounds;
    if(b.integer && !Number.isInteger(value))return ['Proposed input expects a whole number.'];
    if(b.min!==null && (b.exclusiveMin?value<=b.min:value<b.min))return [`Proposed minimum: ${b.exclusiveMin?'greater than ':''}${b.min}.`];
    if(b.upperBound==='current-calendar-year' && value>year)return [`Proposed latest manufacture year: ${year}.`];
  }
  if(field.input==='text' && (typeof value!=='string' || (field.bounds.maxLength!==null && value.length>field.bounds.maxLength)))return [`Proposed maximum length: ${field.bounds.maxLength}.`];
  if(field.input==='date'){
    if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return ['Proposed format: YYYY-MM-DD.'];
    const parsed=new Date(value+'T00:00:00.000Z');
    if(!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value)return ['Expected a valid calendar date.'];
  }
  return [];
}
