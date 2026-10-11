import "server-only";
import {z} from "zod";
import type {ListingCategoryReference,ListingAttributeReference} from "@/types/listing";

const category=z.object({
  id:z.string().uuid(), name:z.string().min(1).max(100), is_active:z.boolean(),
  macro_category:z.enum(["goods","vehicles","property"]).nullable(), new_listing_enabled:z.boolean(),
}).strict();
const attribute=z.object({
  id:z.string().uuid(), category_id:z.string().uuid(), name:z.string().min(1).max(100),
  label:z.string().min(1).max(100), value_type:z.enum(["text","number","select","boolean"]),
  is_required:z.boolean(), options:z.array(z.string()).nullable(),
  validation_rules:z.record(z.unknown()).nullable(), sort_order:z.number().int(),
}).strict();
export const savedContextSchema=z.object({category,attributes:z.array(attribute)}).strict().superRefine((v,ctx)=>{
  if(v.attributes.some(a=>a.category_id!==v.category.id)||new Set(v.attributes.map(a=>a.id)).size!==v.attributes.length||new Set(v.attributes.map(a=>a.name)).size!==v.attributes.length)
    ctx.addIssue({code:z.ZodIssueCode.custom,message:"Definitions do not match saved category"});
});
export type SavedContext=z.infer<typeof savedContextSchema>;
export type SavedCategoryReference=ListingCategoryReference & SavedContext["category"];
export type SavedAttributeReference=ListingAttributeReference;
interface Rpc {
  rpc:(name:"get_seller_listing_category_context",args:{p_listing_id:string})=>PromiseLike<{data:unknown;error:{code:string}|null}>;
}

// Call only from the verified Test-enabled edit/update paths with the actual
// route/action ID and the request-scoped authenticated client, never form context.
export async function loadSavedCategoryContext(client:Rpc,persistedListingId:string) {
  if(!z.string().uuid().safeParse(persistedListingId).success)return {status:"error" as const,reason:"invalid-listing"};
  let result:Awaited<ReturnType<Rpc["rpc"]>>;
  try {
    result=await client.rpc("get_seller_listing_category_context",{p_listing_id:persistedListingId});
  } catch {
    return {status:"error" as const,reason:"read-failed"};
  }
  if(result.error)return {status:"error" as const,reason:result.error.code==="42501"?"denied":"read-failed"};
  const parsed=savedContextSchema.safeParse(result.data);
  return parsed.success?{status:"ready" as const,context:parsed.data}:{status:"error" as const,reason:"invalid-result"};
}

export function classifyCategoryAssignment(operation:"create"|"update",selectedId:string,selectedReference:unknown,saved?:SavedContext) {
  if(operation==="update"&&saved&&selectedId===saved.category.id)return "retention";
  // Ordinary category SELECT returns full rows. Parse the required projection
  // without accepting the extra database columns as saved owner context.
  const parsed=category.passthrough().safeParse(selectedReference);
  if(!parsed.success||parsed.data.id!==selectedId)return "denied";
  if(parsed.data.macro_category===null)return "legacy-boundary";
  return parsed.data.macro_category==="goods"&&parsed.data.is_active&&parsed.data.new_listing_enabled?"new-assignment":"denied";
}
