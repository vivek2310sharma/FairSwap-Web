import {z} from "zod";
import {accessoryType,BRANDS,visibleSpecs} from "./catalogue";
export const CONDITIONS={sealed:"Brand new — sealed",open_box:"Open box — unused",like_new:"Like new",good:"Good",fair:"Fair",parts:"For parts / not working"} as const;
export const ORIGINALITY={original:"Manufacturer-original",third_party:"Third-party compatible",unbranded:"Unbranded",unknown:"Not sure"} as const;
export const accessoryBase=z.object({
 selection:z.object({category:z.literal("mobiles"),subcategory:z.literal("mobile-accessories"),version:z.literal(1)}).strict(),session_id:z.string().uuid(),
 type:z.string(),brand:z.string().trim().min(1).max(80),other_brand:z.string().trim().max(80),product_model:z.string().trim().max(100),originality:z.enum(["original","third_party","unbranded","unknown"]),
 compatibility:z.object({state:z.enum(["seller","unknown"]),device_brand:z.string().trim().max(80),device_model:z.string().trim().max(100),standard:z.string().trim().max(120)}).strict(),
 specs:z.record(z.union([z.string().trim().max(150),z.number().finite()])),quantity:z.number().int().min(1).max(100),bundle_contents:z.string().trim().min(2).max(500),
 condition:z.enum(["sealed","open_box","like_new","good","fair","parts"]),working:z.enum(["working","faulty","not_tested","not_applicable"]),faults:z.string().trim().max(1000),bill:z.boolean(),box:z.boolean(),warranty_until:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).or(z.literal("")),
 safety:z.enum(["safe","hazardous","not_sure","not_applicable"]),title:z.string().trim().min(3).max(150),description:z.string().trim().min(10).max(5000),
 trade:z.enum(["sell","giveaway"]),price_paise:z.number().int().min(0).max(100000000),negotiable:z.boolean(),pin_code:z.string().regex(/^[1-9]\d{5}$/),city_id:z.string().uuid(),locality_id:z.string().uuid(),media_ids:z.array(z.string().uuid()).min(1).max(8),plan_id:z.literal("free-v1")
}).strict();
export function refineAccessory(v:Omit<z.infer<typeof accessoryBase>,"condition"|"working"|"safety"|"originality">&{condition:string;working:string;safety:string;originality:string},ctx:z.RefinementCtx){
 const issue=(field:string,message:string)=>ctx.addIssue({code:"custom",path:field.split("."),message});
 const t=accessoryType(v.type);if(!t){issue("type","Choose an accessory type.");return;}
 if(!BRANDS.includes(v.brand))issue("brand","Choose an accessory manufacturer.");
 if((v.brand==="Other")!==(v.other_brand.length>=2))issue("other_brand","Enter the accessory manufacturer only when Other is selected.");
 if(v.brand!=="Other"&&v.other_brand)issue("other_brand","Clear the other manufacturer.");
 if(v.brand==="Unbranded"&&v.originality!=="unbranded")issue("originality","Choose Unbranded for an unbranded accessory.");
 if(["stylus","keyboard-case","audio"].includes(v.type)&&v.product_model.length<2)issue("product_model","Enter the product model/name, or explicitly enter Not sure.");
 if(v.compatibility.state==="seller"){
  if(t.exact&&(!v.compatibility.device_brand||!v.compatibility.device_model))issue("compatibility","Enter the exact compatible brand and model / generation.");
  if(!t.exact&&!v.compatibility.standard&&!v.compatibility.device_model)issue("compatibility","Enter a supported standard or exact device model.");
 }else if(v.compatibility.device_brand||v.compatibility.device_model||v.compatibility.standard)issue("compatibility","Clear the compatibility declaration when unknown.");
 const fields=visibleSpecs(v.type,v.specs);
 for(const s of fields){const value=v.specs[s.key];if(s.kind==="number"?(typeof value!=="number"||value<(s.min??0)||value>(s.max??1e6)||(s.integer&&!Number.isInteger(value))):typeof value!=="string"||value.length<1||(s.options&&!s.options.includes(value)))issue("specs."+s.key,`Check ${s.label.toLowerCase()}.`);}
 for(const key of Object.keys(v.specs))if(!fields.some(s=>s.key===key))issue("specs."+key,"Remove specifications that do not apply to this type.");
 if(t.electronic&&v.working==="not_applicable")issue("working","Declare the working status.");
 if(!t.electronic&&v.working!=="not_applicable")issue("working","Working status does not apply to this type.");
 if((v.working==="faulty"||v.condition==="parts")&&v.faults.length<3)issue("faults","Describe the faults or damage.");
 if(t.safety&&v.safety!=="safe")issue("safety","Do not list swollen, leaking, overheating or electrically unsafe items. Only list an item you can declare safe.");
 if(!t.safety&&v.safety!=="not_applicable")issue("safety","Safety declaration does not apply to this type.");
 if(v.specs.cable_condition==="Damaged / exposed wires")issue("safety","Exposed or damaged charging wires cannot be listed.");
 if(v.warranty_until&&(v.warranty_until<new Date().toISOString().slice(0,7)||v.warranty_until>`${new Date().getUTCFullYear()+10}-${new Date().toISOString().slice(5,7)}`))issue("warranty_until","Enter a current warranty expiry within ten years.");
 if((v.trade==="sell"&&v.price_paise<1)||(v.trade==="giveaway"&&(v.price_paise!==0||v.negotiable)))issue("price_paise","Check the price and trade type.");
 if(new Set(v.media_ids).size!==v.media_ids.length)issue("media_ids","Choose distinct photos.");
}
export const accessorySchema=accessoryBase.superRefine(refineAccessory);
export type AccessorySubmission=z.infer<typeof accessorySchema>;
export const accessoryCatalogueSchema=z.object({version:z.literal(1),revision:z.literal("accessories-v1"),enabled:z.boolean(),listing_category_id:z.string().uuid()}).strict();
export type AccessoryCatalogue=z.infer<typeof accessoryCatalogueSchema>;
