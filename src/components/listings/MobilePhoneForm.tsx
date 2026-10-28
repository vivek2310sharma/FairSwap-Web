"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import type { City } from "@/types/listing";
import { CONDITIONS, INCLUDED, RAM, STORAGE, mobileSchema, mobileTitle, selectPostingCategory, type MobileCatalogue, type MobileSubmission } from "@/lib/listings/mobiles/contract";
import { readPostingRecovery, writePostingRecovery } from "@/lib/listings/posting-recovery";
import PincodeLocationPicker from "./PincodeLocationPicker";
import PreListingMediaUploader, { type PostingPhoto } from "./PreListingMediaUploader";
import PostingAIAssistant from "./PostingAIAssistant";
import MobileListingDetails from "./MobileListingDetails";
import { postingText, phoneValidationText, phoneValidationSummary, phoneErrorText, type PostingLocale } from "@/lib/listings/mobiles/locale";
const input="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 focus-visible:ring-2 focus-visible:ring-emerald-600";
const blank:MobileSubmission={selection:{category:"mobiles",subcategory:"mobile-phones",version:2},session_id:"",trade:"sell",brand_id:"",model_id:"",other_model:"",storage:"128 GB",ram:"",condition:"good",included:[],warranty_until:"",title:"",description:"",price_paise:0,negotiable:false,pin_code:"",city_id:"",locality_id:"",media_ids:[],plan_id:"free-v1"};
const draftSchema=mobileSchema.innerType().extend({session_id:z.string(),brand_id:z.string(),model_id:z.string(),title:z.string().max(150),description:z.string().max(5000),pin_code:z.string().max(6),city_id:z.string(),locality_id:z.string(),media_ids:z.array(z.string())});
const recoverySchema=z.object({version:z.literal(2),owner:z.string().uuid(),updated:z.number(),draft:draftSchema,manualTitle:z.boolean(),area:z.string(),priceText:z.string().max(20),photos:z.array(z.object({id:z.string().uuid(),state:z.enum(["pending","uploading","ready","failed"]),blob:z.instanceof(Blob).optional()})).max(8)});
type Issue={field:string;message:string};
export default function MobilePhoneForm({catalogue,ownerId,cities,maintenance=false}:{catalogue:MobileCatalogue;ownerId:string;cities:City[];maintenance?:boolean}) {
 const locale: PostingLocale = "en";const t=(text:string)=>postingText(locale,text);
 const router=useRouter();const form=useRef<HTMLFormElement>(null);const summary=useRef<HTMLDivElement>(null);
 const [draft,setDraft]=useState(blank);const [photos,setPhotos]=useState<PostingPhoto[]>([]);const [manualTitle,setManualTitle]=useState(false);
 const [phase,setPhase]=useState<"edit"|"preview"|"plan">("edit");const [loaded,setLoaded]=useState(false);const [sessionState,setSessionState]=useState<"initializing"|"ready"|"failed">("initializing");const [frozen,setFrozen]=useState(false);
 const sessionReady=sessionState==="ready";const retryInFlight=useRef(false);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [issues,setIssues]=useState<Issue[]>([]);const [area,setArea]=useState("");const [priceText,setPriceText]=useState("");const [modelSearch,setModelSearch]=useState("");const [brandSearch,setBrandSearch]=useState("");
 const model=catalogue.models.find(m=>m.id===draft.model_id&&m.brand_id===draft.brand_id);
 const update=<K extends keyof MobileSubmission>(key:K,value:MobileSubmission[K])=>setDraft(d=>({...d,[key]:value}));
 const locationChanged=useCallback((v:{pin_code:string;city_id:string;locality_id:string;area:string})=>{
  setDraft(d=>d.pin_code===v.pin_code&&d.city_id===v.city_id&&d.locality_id===v.locality_id?d:{...d,pin_code:v.pin_code,city_id:v.city_id,locality_id:v.locality_id});setArea(v.area);
 },[]);
 const refresh=useCallback(async(session=draft.session_id)=>{
  const r=await fetch(`/api/post-ad/sessions/${session}/media`,{cache:"no-store"});const data=await r.json();if(!r.ok)throw new Error(data.error);
  const remote=z.object({session:z.object({state:z.string()}),media:z.array(z.object({id:z.string().uuid(),state:z.enum(["uploading","ready","removed"]),url:z.string().nullable()}))}).parse(data);
  setFrozen(remote.session.state==="finalizing");
  setPhotos(current=>{
   const merged=current.map(p=>{const found=remote.media.find(m=>m.id===p.id);return found?.state==="ready"?{...p,state:"ready" as const,url:found.url??undefined}:p.state==="uploading"?{...p,state:"failed" as const}:p;});
   for(const p of remote.media)if(!merged.some(m=>m.id===p.id))merged.push({id:p.id,state:p.state==="ready"?"ready":"failed",url:p.url??undefined});
   return merged;
  });
 },[draft.session_id]);
 useEffect(()=>{
  if(!sessionReady)return;
  const renew=()=>{void refresh().catch(()=>{});};window.addEventListener("focus",renew);
  return()=>window.removeEventListener("focus",renew);
 },[sessionReady,refresh]);
 useEffect(()=>{
  let cancelled=false;
  async function init(){
   let restored: z.infer<typeof recoverySchema>|null=null;
   try{const p=recoverySchema.safeParse(await readPostingRecovery(ownerId));if(p.success&&p.data.owner===ownerId&&Date.now()-p.data.updated<24*60*60*1000)restored=p.data;}catch{if(!cancelled)setMessage("Local recovery is unavailable in this browser. Keep this page open until submission.");}
   if(cancelled)return;
   const session=restored?.draft.session_id||crypto.randomUUID();
   setDraft(restored?{...restored.draft,session_id:session}:{...blank,session_id:session});
   setPhotos(restored?.photos.map(p=>({...p,state:p.state==="uploading"?"failed":p.state}))??[]);setManualTitle(restored?.manualTitle??false);setPriceText(restored?.priceText??"");setArea(restored?.area??"");setLoaded(true);
   await initializeSession(session,()=>cancelled);
  }void init();return()=>{cancelled=true;};
  // Account changes remount this component via its account key.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ownerId]);
 async function initializeSession(session:string,cancelled=()=>false){
  setSessionState("initializing");
  try{
   selectPostingCategory(blank.selection,catalogue);
   const r=await fetch("/api/post-ad/sessions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:session})});const data=await r.json();if(!r.ok)throw new Error(data.error);
   if(cancelled())return;
   if(data.session?.state==="submitted"){await writePostingRecovery(ownerId,null);if(!cancelled())router.replace(`/account/listings/${data.session.listing_id}/edit`);return;}
   await refresh(session);
   if(!cancelled())setSessionState("ready");
  }catch(e){if(!cancelled()){setSessionState("failed");setMessage(e instanceof Error?e.message:"Session unavailable.");}}
 }
 async function retrySession(){
  if(sessionState!=="failed"||retryInFlight.current)return;
  retryInFlight.current=true;setMessage("");
  try{await initializeSession(draft.session_id);}finally{retryInFlight.current=false;}
 }
 useEffect(()=>{
  if(!loaded)return;
  const timer=setTimeout(()=>{void writePostingRecovery(ownerId,{version:2,owner:ownerId,updated:Date.now(),draft,manualTitle,area,priceText,photos:photos.map(({id,state,blob})=>({id,state,blob}))}).catch(()=>setMessage("Local recovery could not save. Keep this page open until submission."));},350);
  return()=>clearTimeout(timer);
 },[loaded,ownerId,draft,manualTitle,area,priceText,photos]);
 const title=manualTitle?draft.title:mobileTitle(model?.other?draft.other_model:model?.name??"",draft.storage,draft.condition);
 function submission():MobileSubmission {
  const data=new FormData(form.current!);const pin=String(data.get("pin_code")??draft.pin_code);const city=String(data.get("city_id")??draft.city_id);const locality=String(data.get("locality_id")??draft.locality_id);
  return {...draft,title,price_paise:draft.trade==="giveaway"?0:Math.round(Number(priceText)*100),negotiable:draft.trade==="sell"&&draft.negotiable,pin_code:pin,city_id:city,locality_id:locality,media_ids:photos.filter(p=>p.state==="ready").map(p=>p.id),other_model:model?.other?draft.other_model:"",warranty_until:draft.included.includes("Under warranty")?draft.warranty_until:""};
 }
 function validate(){
  const p=mobileSchema.safeParse(submission());const next:Issue[]=p.success?[]:p.error.issues.map(i=>({field:String(i.path[0]),message:i.message}));
  if(!model)next.push({field:"model_id",message:"Choose a model for this brand."});
  if(model?.other&&draft.other_model.trim().length<2)next.push({field:"other_model",message:"Enter the model name for staff review."});
  if(photos.some(p=>p.state!=="ready"))next.push({field:"media_ids",message:"Upload or remove unfinished photos."});
  setIssues(next);if(next.length){setTimeout(()=>summary.current?.focus(),0);return null;}return p.success?p.data:null;
 }
 function focus(field:string){setPhase("edit");setTimeout(()=>{const el=document.getElementById(`mobile-${field}`)??document.getElementById(field==="pin_code"?"pincode_picker_input":"locality_picker_select");el?.focus();el?.scrollIntoView({block:"center",behavior:"smooth"});},0);}
 async function submit(){const value=validate();if(!value)return;setBusy(true);setMessage("");try{
  const r=await fetch("/api/post-ad/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});const result=await r.json();
  if(!r.ok){if(result.issues)setIssues(result.issues);throw new Error(result.error);}
  await writePostingRecovery(ownerId,null).catch(()=>{});router.replace(`/account/listings/${z.string().uuid().parse(result.listing_id)}/edit`);
 }catch(e){setMessage(e instanceof Error?e.message:"Submission could not be confirmed; retry with this same session.");await refresh().catch(()=>{});}finally{setBusy(false);}}
 const label=(field:string,text:string,node:React.ReactNode)=><label className="block text-sm font-medium" htmlFor={`mobile-${field}`}>{t(text)}{node}</label>;
 const uniqueIssues=Array.from(new Map(issues.map(issue=>[issue.field,issue])).values());
 if(!loaded)return <p role="status">{t("Restoring your posting…")}</p>;
 return <div className="space-y-5" lang={locale}>
  <h1 className="text-2xl font-bold">{t("Mobile Phones")}</h1><p>{t("Have your bill and box ready — buyers trust them.")}</p><p className="text-sm">{t("Pickup only. FairSwap does not currently verify IMEI or device authenticity.")}</p>
  {message&&<p role="alert" className="rounded-lg border border-amber-300 p-3">{phoneErrorText(locale,message)}</p>}
  {sessionState==="initializing"&&<p role="status">{t("Preparing photo upload…")}</p>}
  {sessionState==="failed"&&<button type="button" className="rounded-lg border px-4 py-3" onClick={()=>void retrySession()}>{t("Retry photo upload")}</button>}
  {uniqueIssues.length>0&&<div ref={summary} tabIndex={-1} role="alert" className="rounded-lg border border-red-400 p-4"><p className="font-semibold">{phoneValidationSummary(locale,uniqueIssues[0].field,uniqueIssues.length-1)}</p><ul>{uniqueIssues.map(issue=><li key={issue.field}><button type="button" className="text-left underline" onClick={()=>focus(issue.field)}>{phoneValidationText(locale,issue.field,issue.message)}</button></li>)}</ul></div>}
  <form ref={form} noValidate onSubmit={e=>{e.preventDefault();const value=validate();if(value){setDraft(value);setPhase("preview");}}} className="space-y-6">
   <div hidden={phase!=="edit"} className="space-y-6">
    <fieldset disabled={busy||maintenance} className="space-y-6">
     {label("trade","Trade type",<select id="mobile-trade" className={input} value={draft.trade} onChange={e=>{update("trade",e.target.value as "sell"|"giveaway");if(e.target.value==="giveaway")update("negotiable",false);}}><option value="sell">{t("Sell")}</option><option value="giveaway">{t("Give away")}</option></select>)}
     {sessionReady&&<PreListingMediaUploader locale={locale} photos={photos} onChange={setPhotos} sessionId={draft.session_id} disabled={busy||maintenance||frozen} onReady={()=>refresh()}/>}
     <PostingAIAssistant locale={locale}/>
     {label("brand-search","Search brands",<input id="mobile-brand-search" type="search" className={input} value={brandSearch} onChange={e=>setBrandSearch(e.target.value)}/>)}
     {label("brand_id","Brand",<select id="mobile-brand_id" className={input} value={draft.brand_id} onChange={e=>{update("brand_id",e.target.value);update("model_id","");update("other_model","");setModelSearch("");}}><option value="">{t("Choose brand")}</option>{catalogue.brands.filter(b=>b.id===draft.brand_id||[b.name,...b.aliases].some(s=>s.toLowerCase().includes(brandSearch.toLowerCase()))).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>)}
     {label("model-search","Search models",<input id="mobile-model-search" type="search" className={input} value={modelSearch} onChange={e=>setModelSearch(e.target.value)} disabled={!draft.brand_id}/>)}
     {label("model_id","Model",<select id="mobile-model_id" className={input} value={draft.model_id} disabled={!draft.brand_id} onChange={e=>{update("model_id",e.target.value);update("other_model","");}}><option value="">{t("Choose model")}</option>{catalogue.models.filter(m=>m.brand_id===draft.brand_id&&(m.id===draft.model_id||m.other||[m.name,...m.aliases].some(s=>s.toLowerCase().includes(modelSearch.toLowerCase())))).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>)}
     {model?.other&&label("other_model","Model name (staff will review)",<input id="mobile-other_model" className={input} maxLength={100} value={draft.other_model} onChange={e=>update("other_model",e.target.value)}/>)}
     {label("storage","Storage",<select id="mobile-storage" className={input} value={draft.storage} onChange={e=>update("storage",e.target.value as MobileSubmission["storage"])}>{STORAGE.map(s=><option key={s} value={s}>{t(s)}</option>)}</select>)}
     {label("ram","RAM (optional)",<select id="mobile-ram" className={input} value={draft.ram} onChange={e=>update("ram",e.target.value as MobileSubmission["ram"])}><option value="">{t("Not specified")}</option>{RAM.map(s=><option key={s} value={s}>{t(s)}</option>)}</select>)}
     {label("condition","Condition",<select id="mobile-condition" className={input} value={draft.condition} onChange={e=>update("condition",e.target.value as MobileSubmission["condition"])}>{Object.entries(CONDITIONS).map(([v,l])=><option key={v} value={v}>{t(l)}</option>)}</select>)}
     <fieldset id="mobile-included"><legend className="font-medium">{t("What's included? (seller-declared)")}</legend>{INCLUDED.map(item=><label key={item} className="mt-2 flex min-h-11 items-center gap-3"><input type="checkbox" checked={draft.included.includes(item)} onChange={e=>update("included",e.target.checked?[...draft.included,item]:draft.included.filter(i=>i!==item))}/>{t(item)}</label>)}</fieldset>
     {draft.included.includes("Under warranty")&&label("warranty_until","Warranty expiry month / year",<input id="mobile-warranty_until" type="month" className={input} value={draft.warranty_until} onChange={e=>update("warranty_until",e.target.value)}/>)}
     {label("title","Title",<input id="mobile-title" maxLength={150} className={input} value={title} onChange={e=>{setManualTitle(true);update("title",e.target.value);}}/>)}
     {label("description","Description",<textarea id="mobile-description" rows={5} maxLength={5000} className={input} placeholder={t("Battery health, repairs and reason for selling. Keep contact and payment details in FairSwap chat.")} value={draft.description} onChange={e=>update("description",e.target.value)}/>)}
     {draft.trade==="sell"&&<>{label("price_paise","Price (₹)",<input id="mobile-price_paise" type="text" inputMode="decimal" className={input} value={priceText} onChange={e=>setPriceText(e.target.value)}/>)}<label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={draft.negotiable} onChange={e=>update("negotiable",e.target.checked)}/>{t("Negotiable")}</label></>}
     <PincodeLocationPicker key={ownerId} locale={locale} hideLandmark onResolvedChange={locationChanged} cities={cities} initialPinCode={draft.pin_code} initialCityId={draft.city_id} initialLocalityId={draft.locality_id}/>
     <button type="submit" disabled={!sessionReady} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{t("Preview / Continue")}</button>
    </fieldset>
   </div>
   {phase!=="edit"&&<section className="space-y-4" aria-label="Buyer preview">
    <h2 className="text-xl font-semibold">{draft.title}</h2><div className="grid grid-cols-2 gap-2">{photos.filter(p=>p.state==="ready"&&p.url).map(p=><Image key={p.id} src={p.url!} width={800} height={800} unoptimized alt="Listing photo" className="aspect-square rounded-lg object-cover"/>)}</div>
    <p className="text-xl font-bold">{draft.trade==="giveaway"?t("Free"):`₹${(draft.price_paise/100).toLocaleString("en-IN")}${draft.negotiable?" · Negotiable":""}`}</p>
    <p className="whitespace-pre-wrap">{draft.description}</p><p>{area}</p>
    <MobileListingDetails locale={locale} details={{model:model?.other?draft.other_model:model?.name??"",storage:draft.storage,ram:draft.ram,condition:draft.condition,included:draft.included,warranty_until:draft.warranty_until}}/>
    {phase==="plan"?<fieldset className="rounded-lg border p-4"><legend className="font-semibold">{t("Listing plan")}</legend><label className="flex min-h-11 items-center gap-3"><input type="radio" checked readOnly name="plan_id" value="free-v1"/>{t("Free — submit your listing for review")}</label></fieldset>:<button type="button" className="rounded-lg bg-emerald-700 px-5 py-3 text-white" onClick={()=>setPhase("plan")}>{t("Continue")}</button>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="rounded-lg border px-5 py-3" onClick={()=>setPhase("edit")}>{t("Back to details")}</button>{phase==="plan"&&<button type="button" disabled={busy||maintenance||!sessionReady} onClick={()=>void submit()} className="rounded-lg bg-emerald-700 px-5 py-3 text-white disabled:opacity-50">{t(busy?"Submitting…":"Submit for review")}</button>}</div>
   </section>}
  </form>
  {frozen&&<div><p role="status">Your photos are prepared for submission. Retry the same submission to complete it.</p><button type="button" className="rounded-lg border px-4 py-3" onClick={()=>{if(validate())setPhase("plan");}}>{t("Continue submission")}</button></div>}
 </div>;
}
