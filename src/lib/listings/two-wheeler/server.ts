import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { draftListingSchema } from "@/types/listing";
import { isVerifiedTwoWheelerTestEnvironment, isVerifiedCarsTestEnvironment } from "../test-runtime";
import { carsV1, validateCarAnswers } from "../cars/contract";
import { resolutionSchema, validateVehicleAnswers, twoWheelerV1, type ModelResolution } from "./contract";
import { loadSavedCategoryContext } from '../saved-category-context';

export function isTwoWheelerEnabled() { return isVerifiedTwoWheelerTestEnvironment(process.env); }
export function isCarsEnabled() { return isVerifiedCarsTestEnvironment(process.env); }
export type VehicleContext = Database["public"]["Tables"]["listing_vehicle_contexts"]["Row"];
export interface VehicleReference {
  family?: "cars";
  id: string; name: string; is_active: boolean; new_listing_enabled: boolean;
  version_id: string; path: string[]; fields: string[]; display_order: number;
}
export interface VehicleReferences { categories: VehicleReference[]; states: {id: string; label: string}[]; error?: string }
const pathShape = z.array(z.string()).length(3);
const bindingShape=z.object({listing_id:z.string().uuid(),category_id:z.string().uuid(),version_id:z.string().uuid()}).passthrough();
const contractShape=z.object({category_id:z.string().uuid(),version_id:z.string().uuid(),fields:z.array(z.string()),source_path:pathShape,display_order:z.number().int()});
const versionShape=z.object({id:z.string().uuid(),new_assignment_enabled:z.boolean()});
const categoryShape=z.object({id:z.string().uuid(),name:z.string().min(1),is_active:z.boolean(),new_listing_enabled:z.boolean()});
const discoveryShape=contractShape.extend({categories:categoryShape.nullable()});
const stateShape=z.array(z.object({id:z.string().uuid(),label:z.string().min(1)}));
export async function loadVehicleReferences(client: SupabaseClient<Database>, saved?: {listingId:string;categoryId:string;context:VehicleContext}, family: "two-wheelers"|"cars" = "two-wheelers"): Promise<VehicleReferences> {
  const cars=family==="cars";
  if (!(cars ? isCarsEnabled() : isTwoWheelerEnabled())) return { categories: [], states: [], error: "Vehicle Test integration is disabled" };
  const contracts=cars ? "car_category_contracts" : "vehicle_category_contracts";
  const versions=cars ? "car_contract_versions" : "vehicle_contract_versions";
  const fail=(error:string):VehicleReferences=>({categories:[],states:[],error});
  try {
  let retained:VehicleReference|undefined;
  if(saved){
    const binding=bindingShape.safeParse(saved.context);
    if(!binding.success || binding.data.listing_id!==saved.listingId || binding.data.category_id!==saved.categoryId) return fail("Saved vehicle binding could not be verified");
    resolutionFromContext(saved.context);
    const owner=await loadSavedCategoryContext(client,saved.listingId);
    if(owner.status!=="ready" || owner.context.category.id!==saved.categoryId || owner.context.category.macro_category!=="vehicles") return fail("Saved vehicle category is unavailable to your account");
    const [record,boundVersion]=await Promise.all([
      client.from(contracts).select("category_id,version_id,fields,source_path,display_order").eq("category_id",saved.categoryId).eq("version_id",binding.data.version_id).single(),
      client.from(versions).select("id,new_assignment_enabled").eq("id",binding.data.version_id).single(),
    ]);
    const contract=contractShape.safeParse(record.data),version=versionShape.safeParse(boundVersion.data);
    if(record.error || boundVersion.error || !contract.success || !version.success || contract.data.category_id!==saved.categoryId || contract.data.version_id!==binding.data.version_id || version.data.id!==binding.data.version_id) return fail("Saved vehicle category/version reference is unavailable");
    retained={...owner.context.category,version_id:contract.data.version_id,path:contract.data.source_path,fields:contract.data.fields,display_order:contract.data.display_order,...(cars?{family:"cars" as const}:{})};
  }
  const version = await client.from(versions).select("id,new_assignment_enabled").eq("contract_key", cars ? "cars-draft-v1" : "two-wheeler-draft-v1").single();
  const current=versionShape.safeParse(version.data);
  if (version.error || !current.success) return fail("Unable to load vehicle contract");
  const [paths, states] = await Promise.all([
    client.from(contracts).select("category_id,version_id,fields,source_path,display_order,categories(id,name,is_active,new_listing_enabled)").eq("version_id",current.data.id).order("display_order"),
    client.from("vehicle_registration_states").select("id,label").order("label"),
  ]);
  const parsedPaths=z.array(discoveryShape).safeParse(paths.data),parsedStates=stateShape.safeParse(states.data);
  if (paths.error || states.error || !parsedPaths.success || !parsedStates.success) return fail("Unable to load vehicle references");
  const categories = parsedPaths.data.flatMap(p => {
    const c = p.categories;
    if (!c || c.id!==p.category_id || c.id===retained?.id || !c.is_active || !c.new_listing_enabled || !current.data.new_assignment_enabled || p.version_id!==current.data.id) return [];
    return [{...c,version_id:p.version_id,path:p.source_path,fields:p.fields,display_order:p.display_order,...(cars?{family:"cars" as const}:{})}];
  });
  if(retained)categories.push(retained);
  categories.sort((a,b)=>a.display_order-b.display_order);
  return {categories,states:parsedStates.data};
  } catch { return fail("Saved vehicle references could not be loaded"); }
}
export function resolutionFromContext(c: VehicleContext): ModelResolution {
  return resolutionSchema.parse(c.mode === "not_listed" ? {mode:c.mode,brand_text:c.brand_text,model_text:c.model_text} : c.mode === "unanswered" ? {mode:c.mode,...(c.brand_id ? {brand_id:c.brand_id} : {})} : {mode:c.mode,brand_id:c.brand_id,model_id:c.model_id});
}
export async function saveVehicleDraft(client: SupabaseClient<Database>, form: FormData, listingId?: string) {
  if (!isTwoWheelerEnabled() && !isCarsEnabled()) return {error:"Vehicle Test integration is disabled"};
  try {
    for (const key of ["post_ad_entry","vehicle_version_id","vehicle_resolution","category_id","category_attributes","title","city_id","locality_id","description","condition","price_type","price_paise","pin_code","landmark"]) {
      if (form.getAll(key).length > 1) return {error:"Repeated vehicle draft field"};
    }
    const versionId = z.string().uuid().parse(form.get("vehicle_version_id"));
    const resolution = resolutionSchema.parse(JSON.parse(String(form.get("vehicle_resolution"))));
    const attributes: unknown = JSON.parse(String(form.get("category_attributes")));
    const categoryId = z.string().uuid().parse(form.get("category_id"));
    const tw=isTwoWheelerEnabled() ? await client.from("vehicle_category_contracts").select("source_path").eq("category_id", categoryId).eq("version_id",versionId).maybeSingle() : null;
    if(tw?.error)return {error:"Category/contract reference unavailable"};
    const car=!tw?.data && isCarsEnabled() ? await client.from("car_category_contracts").select("source_path").eq("category_id",categoryId).eq("version_id",versionId).maybeSingle() : null;
    if(car?.error)return {error:"Category/contract reference unavailable"};
    const contract=tw?.data ?? car?.data;
    if(!contract)return {error:"Category/contract reference unavailable"};
    const path = (car?.data ? carsV1 : twoWheelerV1).paths.find(p => JSON.stringify(p.path)===JSON.stringify(contract.source_path));
    if (!path) return {error:"Unsupported vehicle category"};
    const answers = car?.data ? validateCarAnswers(attributes,path,new Date()) : validateVehicleAnswers(attributes,path,new Date());
    if (answers.error) return {error:answers.error};
    const money = form.get("price_paise");
    if (money!==null && String(money)!=="" && !/^\d+$/.test(String(money))) return {error:"Price paise must be whole"};
    const common = draftListingSchema.safeParse({title:form.get("title"), category_id:categoryId,city_id:form.get("city_id")||null,locality_id:form.get("locality_id")||null,description:form.get("description")||null,condition:form.get("condition")||null,price_type:form.get("price_type")||null,price_paise:money ? Number(money) : null,pin_code:form.get("pin_code")||null,landmark:form.get("landmark")||null,category_attributes:answers.data});
    if (!common.success) return {error:common.error.issues[0].message};
    const {data,error}=await client.rpc(car?.data ? "save_car_draft" : "save_two_wheeler_draft",{
      // SQL accepts NULL for create; Supabase's generator does not express nullable RPC parameters.
      p_listing_id:(listingId??null) as unknown as string,p_listing:common.data as Json,p_version_id:versionId,p_resolution:resolution as Json,
    });
    return error ? {error:error.message} : {success:true,listingId:data};
  } catch (e) { return {error:e instanceof z.ZodError ? e.issues[0].message : "Malformed vehicle draft payload"}; }
}
