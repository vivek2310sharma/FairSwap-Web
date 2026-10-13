import {z} from 'zod';
import definition from './v1.json';
export const propertyV1=definition;
export type PropertyPath=typeof definition.paths[number];
export const maxPropertyPaise=9007199254740991;
export const rentalBases=['dwelling','advertised_room','per_bed','occupant_share'] as const;
export type RentalBasis=typeof rentalBases[number];
export function isPropertyRentalCategory(value:unknown):boolean {
 const c=(Array.isArray(value)?value[0]:value) as {slug?:unknown}|null;
 return !!c&&propertyV1.paths.some(p=>p.slug===c.slug);
}
const amount=z.discriminatedUnion('state',[z.object({state:z.literal('unanswered')}).strict(),z.object({state:z.literal('unknown')}).strict(),z.object({state:z.literal('known'),amount_paise:z.number().int().min(0).max(maxPropertyPaise)}).strict()]);
const maintenance=z.discriminatedUnion('state',[z.object({state:z.literal('unanswered')}).strict(),z.object({state:z.literal('unknown')}).strict(),z.object({state:z.literal('included_in_rent')}).strict(),z.object({state:z.literal('none')}).strict(),z.object({state:z.literal('separate'),amount_paise:z.number().int().positive().max(maxPropertyPaise),basis:z.enum(rentalBases),period:z.literal('month')}).strict()]);
export const propertyFinancialSchema=z.object({currency:z.literal('INR'),period:z.literal('month'),basis:z.enum(rentalBases).optional(),rent:amount,deposit:amount.optional(),maintenance:maintenance.optional()}).strict();
export type PropertyFinancial=z.infer<typeof propertyFinancialSchema>;
export function emptyPropertyFinancial(path?:Pick<PropertyPath,'basis'>):PropertyFinancial{return {currency:'INR',period:'month',...(path?.basis?{basis:path.basis as RentalBasis}:{}),rent:{state:'unanswered'}};}
/** Exact decimal text -> whole paise. No floating-point multiplication or rounding. */
export function propertyRupeesToPaise(text:string):number {
  if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Error('Enter a nonnegative INR amount with at most two decimal places');
  const [whole,fraction='']=text.split('.');const paise=BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,'0'));
  if(paise>BigInt(maxPropertyPaise))throw Error('Amount exceeds the safe-integer paise representation limit');
  return Number(paise);
}
export function paiseToPropertyRupees(paise:number):string {const n=BigInt(paise);return `${n/BigInt(100)}.${String(n%BigInt(100)).padStart(2,'0')}`;}
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return !s.startsWith('0000-')&&!Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;},'Enter an actual calendar date');
const amenity=z.enum(['unanswered','yes','no']);
const count=z.number().int().min(0).max(10000);
const text=z.string().trim().min(1).max(200);
/** Check the decimal scale of the exact JSON number PostgreSQL receives.
 * Binary multiplication can misclassify 0.29; an epsilon admits real extra digits.
 * No seller value is rounded or rewritten, including exponent-form JSON numbers.
 */
function hasAreaScale(n:number):boolean {
  const match=/^-?\d+(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(JSON.stringify(n));
  return !!match&&(match[1]?.length??0)-Number(match[2]??0)<=2;
}
const answersSchema=z.object({bhk:count.optional(),bathrooms:count.optional(),floor:z.number().int().min(-1000).max(1000).optional(),floors:count.positive().optional(),total_floors:count.positive().optional(),area_sqft:z.number().finite().positive().max(1e9).refine(hasAreaScale,'Area supports at most two decimals').optional(),area_basis:z.enum(['unspecified','carpet','built_up','super_built_up']).optional(),furnishing:text.optional(),preferred_tenants:text.optional(),sharing_type:text.optional(),gender:text.optional(),gender_preference:text.optional(),attached_bathroom:amenity.optional(),food_included:amenity.optional(),ac:amenity.optional(),wifi:amenity.optional(),housekeeping:amenity.optional(),parking:amenity.optional(),available_from:date.optional()}).strict();
export function validatePropertyDraft(answers:unknown,financial:unknown,society:unknown,path:Pick<PropertyPath,'fields'|'basis'|'path'>){
  const a=answersSchema.safeParse(answers),f=propertyFinancialSchema.safeParse(financial);
  if(!a.success)return {error:a.error.issues[0].message};
  if(!f.success)return {error:'Complete the rental declaration: '+f.error.issues[0].message};
  for(const key of Object.keys(a.data))if(!path.fields.includes(key)&&!(key==='area_basis'&&path.fields.includes('area_sqft')))return {error:`${key} does not apply to this category`};
  if(path.basis?f.data.basis!==path.basis:f.data.basis!==undefined&&!['advertised_room','occupant_share'].includes(f.data.basis))return {error:'Rental basis does not match this category'};
  if(f.data.rent.state==='known'&&(!f.data.basis||f.data.rent.amount_paise<=0))return {error:'Known rent requires an explicit compatible basis and a positive amount'};
  if(f.data.deposit&&!path.fields.includes('security_deposit'))return {error:'Deposit does not apply to this category'};
  if(f.data.maintenance&&!path.fields.includes('maintenance'))return {error:'Maintenance does not apply to this category'};
  if(f.data.maintenance?.state==='separate'&&(f.data.maintenance.basis!==f.data.basis||f.data.maintenance.period!=='month'))return {error:'Separate maintenance requires a matching explicit rental basis and monthly period'};
  const s=z.string().trim().min(1).max(200).nullable().safeParse(society);
  if(!s.success)return {error:'Society name must be bounded private seller text'};
  if(s.data!==null&&!path.fields.includes('society_name'))return {error:'Society name does not apply to this category'};
  return {data:{answers:a.data,financial:f.data,society_name:s.data},error:undefined};
}
export function propertyRentSummary(financial:PropertyFinancial):string {if(financial.rent.state!=='known')return financial.rent.state==='unknown'?'Monthly rent unknown':'Monthly rent not set';return `INR ${paiseToPropertyRupees(financial.rent.amount_paise)} / ${financial.basis==='per_bed'?'bed / ':financial.basis==='occupant_share'?"occupant's share / ":financial.basis==='advertised_room'?'advertised room / ':''}month`;}
