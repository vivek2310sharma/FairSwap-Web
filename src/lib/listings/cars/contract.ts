import { z } from "zod";
import definition from "./v1.json";
import { numericLimit, validateVehicleAnswers } from "../two-wheeler/contract";
import {carDeclarationError,type CarDeclarationField} from "./answer-options";

/** Test draft policy. Provenance and raw catalogue facts remain separate. */
export const carsV1 = definition;
export type CarPath = typeof definition.paths[number];
const emptyStates = [z.object({state:z.literal("unanswered")}).strict(), z.object({state:z.literal("unknown")}).strict()] as const;
function declaration(options: string[]) {
  return z.discriminatedUnion("state", [...emptyStates, z.object({state:z.literal("known"),value:z.enum(options as [string,...string[]]),other:z.string().trim().min(1).max(80).optional()}).strict()]).superRefine((a,ctx)=>{
    if(a.state==="known" && (a.value==="other" ? !a.other : a.other!==undefined)) ctx.addIssue({code:"custom",message:"Other detail must accompany only the Other option"});
  });
}
const number = z.number().finite().min(0).max(numericLimit);
const quantity = (range:boolean)=>z.discriminatedUnion("state", [...emptyStates,z.object({state:z.literal("not_applicable")}).strict(), range ? z.object({state:z.literal("known"),value:number,basis:z.literal("electric_only")}).strict() : z.object({state:z.literal("known"),value:number.positive()}).strict()]);
const extras = z.object({fuel_type:declaration(definition.options.fuel_type).optional(),transmission:declaration(definition.options.transmission).optional(),powertrain:declaration(definition.options.powertrain).optional(),seating_capacity:number.int().positive().optional(),battery_capacity_kwh:quantity(false).optional(),range_km:quantity(true).optional()}).strict();
export function validateCarAnswers(raw: unknown, path: Pick<CarPath,"fields">, now:Date) {
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) return {error:"Car answers must be an object"};
  const common:Record<string,unknown>={},additional:Record<string,unknown>={};
  for(const [k,v] of Object.entries(raw)) (k in extras.shape ? additional : common)[k]=v;
  const shared=validateVehicleAnswers(common,path,now);
  if(shared.error)return shared;
  for(const field of ["fuel_type","transmission","powertrain"] as CarDeclarationField[]){
    const error=carDeclarationError(field,additional[field]);
    if(error)return {error};
  }
  for(const field of ["battery_capacity_kwh","range_km"]){
    const a=additional[field] as {state?:unknown;value?:unknown}|undefined;
    if(a?.state==="known"&&a.value===undefined)return {error:`Enter a value for ${field==="range_km"?"electric-only range":"traction-battery capacity"}.`};
  }
  const parsed=extras.safeParse(additional);
  if(!parsed.success)return {error:parsed.error.issues[0].message};
  for(const k of Object.keys(parsed.data)) if(!path.fields.includes(k) && !(k==="powertrain"&&path.fields.includes("battery_capacity_kwh")))return {error:`${k} does not apply to this category`};
  if([parsed.data.range_km,parsed.data.battery_capacity_kwh].some(a=>a?.state==="known")&&parsed.data.powertrain?.state!=="known")return {error:"Declare powertrain before known battery/range answers"};
  return {data:{...shared.data,...parsed.data},error:undefined};
}
export type RawCar = {brand:string;model:string;body_type:string;segment:string;status:string};
export function carCompatibility(raw:RawCar,path:CarPath):"exact"|"grouped"|"unresolved"|"incompatible" {
  if(!definition.knownSegments.includes(raw.segment))return "incompatible";
  const leaf=path.path[2];
  if(["Electric & Hybrid Cars","Vintage & Classic Cars"].includes(leaf))return "unresolved";
  if(leaf==="Luxury Cars")return definition.luxurySegments.includes(raw.segment)?"grouped":"incompatible";
  const mapping=definition.bodyMappings.find(m=>m.body===raw.body_type);
  if(mapping)return mapping.leaf===leaf?mapping.kind as "exact"|"grouped":"incompatible";
  return definition.unresolvedBodies.includes(raw.body_type)?"unresolved":"incompatible";
}
