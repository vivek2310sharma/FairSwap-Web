"use client";
import { useEffect, useState } from "react";
import CarAnswerField from "./CarAnswerField";
import { z } from "zod";
import type { VehicleReference } from "@/lib/listings/two-wheeler/server";
import type { ModelResolution } from "@/lib/listings/two-wheeler/contract";
const row = z.object({id:z.string().uuid(),brand_id:z.string().uuid(),label:z.string(),brand:z.string(),raw:z.union([z.object({body_type:z.string(),segment:z.string(),status:z.string()}).passthrough(),z.object({vehicle_type:z.string(),category:z.string(),fuel_type:z.string(),status:z.string(),engine_cc:z.string()}).passthrough()]),review_required:z.boolean().optional(),compatibility:z.string(),eligible:z.boolean()});
const response=z.object({brands:z.array(z.object({id:z.string().uuid(),label:z.string()})),rows:z.array(row).max(25),selected:row.nullable(),total:z.number().int().min(0),offset:z.number().int().min(0),limit:z.number().int().min(1).max(25)});
type Lookup=z.infer<typeof response>;
const style="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const labels:Record<string,string>={year:"Manufacture year",km_driven:"Kilometres driven",owner_number:"Owner number (1 means first owner)",engine_cc:"Engine capacity (cc)",range_km:"Seller-estimated range (km / full charge)",battery_warranty_left:"Battery warranty remaining (whole months)",registration_state:"Registration declaration",insurance_valid_till:"Insurance valid until",variant:"Variant",color:"Colour"};
export default function TwoWheelerFields({category,states,answers,change,resolution,setResolution,submissionEnabled=false}: {category:VehicleReference;states:{id:string;label:string}[];answers:Record<string,unknown>;change:(key:string,value:unknown)=>void;resolution:ModelResolution;setResolution:(value:ModelResolution)=>void;submissionEnabled?:boolean}) {
  const cars=category.family==="cars";
  const statusLabel=(status:string)=>status.replaceAll("_"," ").replace(/^./,c=>c.toUpperCase());
  const rawLabel=(raw:Lookup["rows"][number]["raw"])=> "body_type" in raw ? `${raw.body_type} / ${raw.segment} / ${statusLabel(raw.status)}` : `${raw.vehicle_type} / ${raw.category} / ${raw.fuel_type} / ${statusLabel(raw.status)}`;
  const [view,setView]=useState<"mapped"|"unresolved"|"review">(resolution.mode==="unresolved" ? "unresolved" : "mapped");
  const [search,setSearch]=useState(""); const [offset,setOffset]=useState(0);
  const [lookup,setLookup]=useState<Lookup|null>(null);
  const [state,setState]=useState<"loading"|"error"|"ready">("loading");
  const brand="brand_id" in resolution ? resolution.brand_id : undefined;
  const selected="model_id" in resolution ? resolution.model_id : undefined;
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({category:category.id,version:category.version_id,view,search,offset:String(offset),limit:"25"});
    if(brand)params.set("brand",brand);if(selected)params.set("selected",selected);
    fetch(`/api/post-ad/${cars?"cars":"two-wheelers"}?${params}`,{signal:controller.signal}).then(async r=>{
      if(!r.ok)throw Error("Lookup failed");
      const data=response.parse(await r.json());if(controller.signal.aborted)return;setLookup(data);setState("ready");
    }).catch(()=>{if(!controller.signal.aborted)setState("error");});
    return ()=>controller.abort();
  },[category.id,category.version_id,cars,brand,selected,view,search,offset]);
  const reload=(action:()=>void)=>{setState("loading");action();};
  const changeBrand=(next:string)=>{
    if(selected && !window.confirm("Changing Brand clears the selected Model. Other specifications and common details stay. Continue?"))return;
    reload(()=>{setResolution({mode:"unanswered",...(next?{brand_id:next}:{})});setOffset(0);});
  };
  const retained=lookup?.selected;
  return <section className="space-y-4" aria-label={cars?"Cars V1 fields":"Two-wheeler V1 fields"}>
    <p className="rounded bg-amber-50 p-3 text-sm">{submissionEnabled?'Complete the details and photos, then submit the saved draft for Test review.':'You can save a vehicle draft. Test submission is currently disabled or unavailable.'} Approval and public publication remain disabled for these Test vehicle families. Catalogue classification uses FairSwap navigation mappings.</p>
    <label className="block text-sm">How would you like to find your model?<select aria-label="How would you like to find your model?" className={style} value={resolution.mode==="not_listed"?"not_listed":view} onChange={e=>{
      if((selected||(resolution.mode==="not_listed"&&(resolution.brand_text||resolution.model_text))) && !window.confirm("Changing model search clears Brand and Model selections and seller-entered Brand/Model text. Specifications and common details stay. Continue?"))return;
      if(e.target.value==="not_listed")setResolution({mode:"not_listed",brand_text:"",model_text:""});
      else {
        const nextView=e.target.value as typeof view;
        const action=()=>{setView(nextView);setResolution({mode:"unanswered"});setOffset(0);};
        // Reusing the same lookup must not enter loading without a changed effect dependency.
        if(nextView!==view||brand||selected||offset!==0)reload(action);else action();
      }
    }}><option value="mapped">Choose a matching model</option><option value="unresolved">Model needs category review — seller declares this category</option><option value="not_listed">Not listed — seller-entered text</option><option value="review">Browse other models (read only)</option></select></label>
    {cars&&category.fields.includes("battery_capacity_kwh")&&<CarAnswerField field="powertrain" answers={answers} change={change}/> }
    {category.fields.map(key=>{
      if(cars&&["fuel_type","transmission","seating_capacity","battery_capacity_kwh","range_km"].includes(key))return <CarAnswerField key={key} field={key} answers={answers} change={change}/>;
      if(key==="price"||key==="negotiable"||key==="condition")return <p key={key} className="text-xs text-gray-500">{key==="condition"?"Condition is set under Details below.":key==="price"?"Item price is set under Pricing below.":"Negotiability is set under Pricing below."}</p>;
      if(key==="brand")return <label key={key} className="block text-sm">Brand{resolution.mode==="not_listed" ? <input aria-label="Not listed brand" maxLength={100} className={style} value={resolution.brand_text} onChange={e=>setResolution({...resolution,brand_text:e.target.value})}/> : <select aria-label="Catalogue Brand" className={style} value={brand??""} disabled={state!=="ready"} onChange={e=>changeBrand(e.target.value)}><option value="">Select Brand</option>{brand&&!lookup?.brands.some(b=>b.id===brand)&&<option value={brand}>{retained?.brand??"Retained Brand (not eligible for this route)"}</option>}{lookup?.brands.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select>}</label>;
      if(key==="model")return <div key={key} className="space-y-2"><label className="block text-sm">Model{resolution.mode==="not_listed" ? <input aria-label="Not listed model" maxLength={150} className={style} value={resolution.model_text} onChange={e=>setResolution({...resolution,model_text:e.target.value})}/> : <select aria-label="Catalogue Model" className={style} disabled={!brand||state!=="ready"||view==="review"} value={selected??""} onChange={e=>{if(!e.target.value)setResolution({mode:"unanswered",...(brand?{brand_id:brand}:{})});else if(brand)setResolution({mode:view==="unresolved"?"unresolved":"catalogue",brand_id:brand,model_id:e.target.value});}}><option value="">Select Model</option>{selected&&!lookup?.rows.some(r=>r.id===selected)&&<option value={selected}>{retained?.label??"Retained Model"} — retained reference</option>}{lookup?.rows.map(r=><option key={r.id} value={r.id} disabled={!r.eligible}>{r.label} · {rawLabel(r.raw)}</option>)}</select>}</label>
        {resolution.mode!=="not_listed"&&<><label className="block text-xs">Search Model<input aria-label="Search Model" className={style} value={search} maxLength={100} disabled={!brand} onChange={e=>reload(()=>{setSearch(e.target.value);setOffset(0);})}/></label><p role="status" className="text-xs">{state==="loading"?"Loading catalogue… Existing selection is preserved.":state==="error"?"Lookup failed. Existing selection is preserved.":lookup?.total===0&&brand?"No models in this route. Use an explicit unresolved or Not listed route.":"Choose a model, or search by name."}</p><button type="button" disabled={offset===0||state!=="ready"} onClick={()=>reload(()=>setOffset(Math.max(0,offset-25)))}>Previous models</button><button type="button" disabled={state!=="ready"||!lookup||offset+25>=lookup.total} onClick={()=>reload(()=>setOffset(offset+25))} className="ml-4">Next models</button>{view==="review"&&<ul className="text-xs">{lookup?.rows.map(r=><li key={r.id}>{r.label}: {rawLabel(r.raw)} · {r.compatibility}</li>)}</ul>}
        {retained&&<p className="text-xs">Selected source: {rawLabel(retained.raw)}. {retained.eligible?"":"Unavailable for a new selection; retained reference."} Specifications remain seller-entered. {retained.review_required&&"Review required: import-only source entry or unresolved category classification."}</p>}</>}
        {resolution.mode==="unresolved"&&<p role="status" className="text-sm text-amber-800">Classification review required. The actual catalogue model is retained; this category is your declaration.</p>}
        {resolution.mode==="not_listed"&&<p className="text-xs">Seller declaration, not independently verified. Exact known brand/model matches must use their catalogue route.</p>}
      </div>;
      if(key==="year"||key==="km_driven") {
        const a=answers[key] as {state?:string;value?:number}|undefined;
        return <div key={key}><label className="block text-sm">{labels[key]}<select aria-label={`${key} answer`} className={style} value={a?.state??"unanswered"} onChange={e=>change(key,{state:e.target.value})}><option value="unanswered">Unanswered</option><option value="known">Known value</option><option value="unknown">Not known</option></select></label>{a?.state==="known"&&<label className="block text-xs">{labels[key]} value<input aria-label={`${key} value`} type="number" step="1" className={style} value={a.value??""} onChange={e=>change(key,{state:"known",...(e.target.value===""?{}:{value:Number(e.target.value)})})}/></label>}{a?.state==="known"&&a.value===undefined&&<p role="alert" className="text-xs text-red-700">Enter {labels[key].toLowerCase()} for a Known answer.</p>}</div>;
      }
      if(key==="registration_state") {
        const a=answers[key] as {state?:string;state_id?:string}|undefined;
        return <div key={key}><label className="block text-sm">{labels[key]}<select aria-label="Registration declaration" className={style} value={a?.state??"unanswered"} onChange={e=>change(key,{state:e.target.value})}><option value="unanswered">Unanswered</option><option value="provided">Provided</option><option value="unknown">Not known</option><option value="not_applicable">Not applicable — seller declaration</option></select></label>{a?.state==="provided"&&<label className="block text-xs">Registration state / UT<select aria-label="Registration state / UT" className={style} value={a.state_id??""} onChange={e=>change(key,{state:"provided",state_id:e.target.value})}><option value="">Select state / UT</option>{states.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}<p className="text-xs">Separate from listing location. This declaration does not determine a legal exemption.</p></div>;
      }
      const warranty=key==="battery_warranty_left";
      const value=warranty ? (answers[key] as {months?:number;as_of?:string}|undefined)?.months : answers[key];
      const numeric=["engine_cc","range_km","owner_number","battery_warranty_left"].includes(key);
      return <label key={key} className="block text-sm">{labels[key]??key}<input aria-label={key} className={style} type={key==="insurance_valid_till"?"date":numeric?"number":"text"} step={numeric?(["owner_number","battery_warranty_left"].includes(key)?"1":"any"):undefined} maxLength={key==="variant"?80:key==="color"?60:undefined} value={String(value??"")} onInput={key==="insurance_valid_till"?e=>change(key,e.currentTarget.value||undefined):undefined} onChange={e=>change(key,e.target.value===""?undefined:warranty?{months:Number(e.target.value)}:numeric?Number(e.target.value):e.target.value)}/>{warranty&&(answers[key] as {as_of?:string}|undefined)?.as_of&&<span className="text-xs">Seller answer as of {(answers[key] as {as_of:string}).as_of}; months are not automatically current.</span>}</label>;
    })}
  </section>;
}
