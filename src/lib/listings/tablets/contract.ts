import { z } from "zod";
import { phoneRiskSignals } from "../mobiles/contract";
export { CONDITIONS, RAM } from "../mobiles/contract";
export const STORAGE = ["16 GB","32 GB","64 GB","128 GB","256 GB","512 GB","1 TB","2 TB","Not sure"] as const;
export const CONNECTIVITY = {wifi:"Wi-Fi only",lte:"Wi-Fi + 4G/LTE",five_g:"Wi-Fi + 5G",unknown:"Not sure"} as const;
export const SCREEN = {working:"Fully functional",marked:"Cracked or marked but works",fault:"Touch / display fault",unknown:"Unsure"} as const;
export const BATTERY = {normal:"Normal",reduced:"Reduced battery life",charging_fault:"Charging problem",untested:"Cannot test"} as const;
export const LOCK = {clear:"Transferable: no Activation Lock, FRP or company/school management",locked:"Cannot transfer without an account or management lock",unknown:"Not sure"} as const;
export const INCLUDED = ["Original box","Bill/invoice","Charger","Charging cable","Stylus/pen","Keyboard","Protective cover/case","Under warranty"] as const;
export const tabletSelection = z.object({category:z.literal("mobiles"),subcategory:z.literal("tablets"),version:z.literal(1)}).strict();
export const tabletBase = z.object({
 selection:tabletSelection,session_id:z.string().uuid(),brand_id:z.string().uuid(),model_id:z.string().uuid(),other_model:z.string().trim().max(100),
 storage:z.enum(STORAGE),connectivity:z.enum(["wifi","lte","five_g","unknown"]),ram:z.string().regex(/^(?:[23468]|12|16) GB$|^$/),colour:z.string().trim().max(40),hardware_model_number:z.string().regex(/^[A-Za-z][A-Za-z0-9-]{1,19}$|^$/),
 condition:z.enum(["new","like_new","good","fair","poor"]),screen_touch_status:z.enum(["working","marked","fault","unknown"]),battery_charging_status:z.enum(["normal","reduced","charging_fault","untested"]),transfer_lock_status:z.enum(["clear","locked","unknown"]),
 powers_on:z.enum(["yes","no","untested"]),repair_history:z.enum(["none","screen","battery","other","unknown"]),other_defects:z.string().trim().max(1000),
 included:z.array(z.enum(INCLUDED)).max(8),stylus_description:z.string().trim().max(100),keyboard_description:z.string().trim().max(100),warranty_until:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).or(z.literal("")),
 title:z.string().trim().min(3).max(150),description:z.string().trim().min(10).max(5000),trade:z.enum(["sell","giveaway"]),price_paise:z.number().int().min(0).max(100000000),negotiable:z.boolean(),pin_code:z.string().regex(/^[1-9]\d{5}$/),city_id:z.string().uuid(),locality_id:z.string().uuid(),media_ids:z.array(z.string().uuid()).min(1).max(8),plan_id:z.literal("free-v1")
}).strict();
export function tabletRefinements(v:z.infer<typeof tabletBase>,ctx:z.RefinementCtx){
 const issue=(field:string,message:string)=>ctx.addIssue({code:"custom",path:[field],message});
 if(v.transfer_lock_status!=="clear")issue("transfer_lock_status","Resolve Activation Lock, FRP and organization management before publishing. Your private draft can be kept.");
 if(v.condition==="poor"||v.powers_on==="no")issue("powers_on","Non-working / parts-only tablet posting is not available yet. Keep a private draft.");
 if((v.screen_touch_status!=="working"||v.battery_charging_status!=="normal"||v.repair_history==="other")&&v.other_defects.length<3)issue("other_defects","Describe faults, uncertainty or repairs.");
 for(const [item,key] of [["Stylus/pen","stylus_description"],["Keyboard","keyboard_description"]] as const)if(!v.included.includes(item)&&v[key])issue(key,"Clear details for accessories that are not included.");
 if(v.included.includes("Under warranty")?(!v.warranty_until||v.warranty_until<new Date().toISOString().slice(0,7)||Number(v.warranty_until.slice(0,4))>new Date().getUTCFullYear()+10):!!v.warranty_until)issue("warranty_until","Declare a current warranty expiry only when under warranty.");
 if((v.trade==="sell"&&v.price_paise<1)||(v.trade==="giveaway"&&(v.price_paise!==0||v.negotiable)))issue("price_paise","Check price and trade type.");
 if(new Set(v.media_ids).size!==v.media_ids.length)issue("media_ids","Choose distinct photos.");
 if(new Set(v.included).size!==v.included.length)issue("included","Choose distinct accessories.");
 if(tabletRiskSignals(v).length)issue("description","Remove personal identifiers, contact/payment links and advance-payment requests.");
}
export const tabletSchema=tabletBase.superRefine(tabletRefinements);
export type TabletSubmission=z.infer<typeof tabletSchema>;
export const tabletCatalogueSchema=z.object({version:z.literal(1),revision:z.literal("tablets-v1"),selection:tabletSelection,listing_category_id:z.string().uuid(),enabled:z.boolean(),brands:z.array(z.object({id:z.string().uuid(),name:z.string(),aliases:z.array(z.string()),sort_order:z.number()})),models:z.array(z.object({id:z.string().uuid(),brand_id:z.string().uuid(),name:z.string(),aliases:z.array(z.string()),sort_order:z.number(),other:z.boolean(),family:z.string(),generation:z.string(),screen_inches:z.string(),storage:z.array(z.enum(STORAGE)).min(1),connectivity:z.array(z.enum(["wifi","lte","five_g","unknown"])).min(1)}))});
export type TabletCatalogue=z.infer<typeof tabletCatalogueSchema>;
export function tabletCatalogueIssues(v:{brand_id:string;model_id:string;storage:string;connectivity:string;other_model:string},c:TabletCatalogue){
 const m=c.models.find(m=>m.id===v.model_id&&m.brand_id===v.brand_id);const issues:{field:string;message:string}[]=[];
 if(!c.brands.some(b=>b.id===v.brand_id))issues.push({field:"brand_id",message:"Choose a brand."});
 if(!m)issues.push({field:"model_id",message:"Choose a model for this brand."});
 if(m){if(!m.storage.some(s=>s===v.storage))issues.push({field:"storage",message:"Choose storage supported by this model."});if(!m.connectivity.some(s=>s===v.connectivity))issues.push({field:"connectivity",message:"Choose connectivity supported by this model."});if(m.other?v.other_model.trim().length<2:!!v.other_model)issues.push({field:"other_model",message:"Enter a model name only for Other model."});}
 return issues;
}
export function tabletRiskSignals(v:Partial<TabletSubmission>){
 const text=[v.title,v.description,v.other_model,v.colour,v.hardware_model_number,v.other_defects,v.stylus_description,v.keyboard_description].filter(Boolean).join(" ").normalize("NFKC");
 return [...phoneRiskSignals(text),...(/(?:pay|send|transfer|भेज|भुगतान).{0,40}(?:advance|deposit|booking|security|पहले|अग्रिम)|(?:advance|deposit|booking amount).{0,40}(?:required|reserve|first|pay)/i.test(text)?["advance_payment_request"]:[]),...(/\b\d(?:[ -]?\d){13,}\b|\b(?:imei|serial(?: number)?|password|passcode)\s*[:=#]\s*\S+|\b(?=[A-Z0-9]*\d)[A-Z0-9]{10,}\b|https?:\/\/|\b\S+@\S+\.\S+/i.test(text)?["sensitive_identifier_or_link"]:[])];
}
export function selectPostingCategory(input:unknown,c:TabletCatalogue){const v=tabletSelection.parse(input);if(!c.enabled)throw Error("Tablets are unavailable.");return v;}
