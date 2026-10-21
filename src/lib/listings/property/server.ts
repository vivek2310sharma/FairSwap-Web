import 'server-only';
import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/types/database';
import {draftListingSchema} from '@/types/listing';
import {isVerifiedPropertyTestEnvironment} from '../test-runtime';
import {loadSavedCategoryContext} from '../saved-category-context';
import {propertyV1,propertyFinancialSchema,validatePropertyDraft} from './contract';
export const isPropertyEnabled=()=>isVerifiedPropertyTestEnvironment(process.env);
export interface PropertyReference {id:string;name:string;is_active:boolean;new_listing_enabled:boolean;version_id:string;path:string[];fields:string[];basis:string|null;display_order:number}
export interface PropertyReferences {categories:PropertyReference[];error?:string}
export type PropertyContext=Database['public']['Tables']['listing_property_contexts']['Row'];
const binding=z.object({listing_id:z.string().uuid(),category_id:z.string().uuid(),version_id:z.string().uuid()}).passthrough();
const contract=z.object({category_id:z.string().uuid(),version_id:z.string().uuid(),source_path:z.array(z.string()).length(3),fields:z.array(z.string()),definition:z.object({basis:z.string().nullable()}),display_order:z.number().int()});
const category=z.object({id:z.string().uuid(),name:z.string(),is_active:z.boolean(),new_listing_enabled:z.boolean()});
export async function loadPropertyReferences(client:SupabaseClient<Database>,saved?:{listingId:string;categoryId:string;context:PropertyContext}):Promise<PropertyReferences>{
 if(!isPropertyEnabled())return {categories:[],error:'Property Test integration is disabled'};
 const fail=()=>({categories:[],error:'Property category/version references are unavailable'});
 try{
  let retained:PropertyReference|undefined;
  if(saved){
   const b=binding.safeParse(saved.context);if(!b.success||b.data.listing_id!==saved.listingId||b.data.category_id!==saved.categoryId)return fail();
   const owner=await loadSavedCategoryContext(client,saved.listingId);
   if(owner.status!=='ready'||owner.context.category.id!==saved.categoryId||owner.context.category.macro_category!=='property')return fail();
   const bound=await client.from('property_category_contracts').select('category_id,version_id,source_path,fields,definition,display_order').eq('category_id',saved.categoryId).eq('version_id',b.data.version_id).single();
   const p=contract.safeParse(bound.data);if(bound.error||!p.success||p.data.category_id!==saved.categoryId||p.data.version_id!==b.data.version_id)return fail();
   retained={...owner.context.category,version_id:p.data.version_id,path:p.data.source_path,fields:p.data.fields,basis:p.data.definition.basis,display_order:p.data.display_order};
  }
  const v=await client.from('property_contract_versions').select('id,new_assignment_enabled').eq('contract_key','property-rental-draft-v1').single();if(v.error||!v.data)return fail();
  const refs=await client.from('property_category_contracts').select('category_id,version_id,source_path,fields,definition,display_order,categories(id,name,is_active,new_listing_enabled)').eq('version_id',v.data.id).order('display_order');
  const parsed=z.array(contract.extend({categories:category.nullable()})).safeParse(refs.data);if(refs.error||!parsed.success||parsed.data.some(p=>p.version_id!==v.data.id||(p.categories&&p.category_id!==p.categories.id)))return fail();
  const categories=parsed.data.flatMap(p=>p.categories?.is_active&&p.categories.new_listing_enabled&&v.data.new_assignment_enabled&&p.category_id!==retained?.id?[{...p.categories,version_id:p.version_id,path:p.source_path,fields:p.fields,basis:p.definition.basis,display_order:p.display_order}]:[]);
  if(retained)categories.push(retained);return {categories:categories.sort((a,b)=>a.display_order-b.display_order)};
 }catch{return fail();}
}
export async function savePropertyDraft(client:SupabaseClient<Database>,form:FormData,listingId?:string){
 if(!isPropertyEnabled())return {error:'Property Test integration is disabled'};
 try{
  for(const key of ['post_ad_entry','property_version_id','property_financial','property_society_name','category_attributes','category_id','title','description','city_id','locality_id','pin_code','landmark','condition','price_type','price_paise'])if(form.getAll(key).length>1)return {error:'Repeated Property draft field'};
  for(const key of ['condition','price_type','price_paise'])if(form.get(key)!==null&&String(form.get(key))!=='')return {error:'Property item price/type/condition must be NULL'};
  const categoryId=z.string().uuid().parse(form.get('category_id')),versionId=z.string().uuid().parse(form.get('property_version_id'));
  const reference=await client.from('property_category_contracts').select('source_path').eq('category_id',categoryId).eq('version_id',versionId).maybeSingle();
  const path=propertyV1.paths.find(p=>JSON.stringify(p.path)===JSON.stringify(reference.data?.source_path));if(reference.error||!path)return {error:'Property category/version reference unavailable'};
  const checked=validatePropertyDraft(JSON.parse(String(form.get('category_attributes'))),JSON.parse(String(form.get('property_financial'))),form.get('property_society_name')||null,path);if(checked.error||!checked.data)return {error:checked.error};
  const common=draftListingSchema.omit({condition:true,price_type:true,price_paise:true,category_attributes:true}).safeParse({title:form.get('title'),category_id:categoryId,city_id:form.get('city_id')||null,locality_id:form.get('locality_id')||null,description:form.get('description')||null,pin_code:form.get('pin_code')||null,landmark:form.get('landmark')||null});if(!common.success)return {error:common.error.issues[0].message};
  const {data,error}=await client.rpc('save_property_draft',{p_listing_id:(listingId??null) as unknown as string,p_listing:{...common.data,condition:null,price_type:null,price_paise:null,category_attributes:checked.data.answers} as Json,p_version_id:versionId,p_financial:checked.data.financial as Json,p_society_name:checked.data.society_name as unknown as string});
  return error?{error:error.message}:{success:true,listingId:data};
 }catch(e){return {error:e instanceof z.ZodError?e.issues[0].message:'Malformed Property draft payload'};}
}
export function financialFromContext(context:PropertyContext){return propertyFinancialSchema.parse(context.financial);}
