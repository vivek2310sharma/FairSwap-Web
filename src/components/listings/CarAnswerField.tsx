"use client";
import { carAnswerOptions, carDeclarationError, isCompleteCarDeclaration, type CarDeclarationField } from "@/lib/listings/cars/answer-options";
const style="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const labels:Record<string,string>={fuel_type:"Fuel — seller declaration",transmission:"Transmission — seller declaration",powertrain:"Powertrain — seller declaration",battery_capacity_kwh:"Traction-battery capacity (kWh)",range_km:"Electric-only range (km per charge)",seating_capacity:"Seating capacity"};
const placeholders:Record<string,string>={fuel_type:"Select fuel",transmission:"Select transmission",powertrain:"Select powertrain"};
type Answer={state?:string;value?:string|number;other?:string};
export default function CarAnswerField({field,answers,change}:{field:string;answers:Record<string,unknown>;change:(key:string,value:unknown)=>void}) {
  if(field==="seating_capacity")return <label className="block text-sm">{labels[field]}<input aria-label={field} type="number" min="1" step="1" className={style} value={String(answers[field]??"")} onChange={e=>change(field,e.target.value===""?undefined:Number(e.target.value))}/></label>;
  const declaration=field==="fuel_type"||field==="transmission"||field==="powertrain";
  const options=declaration?carAnswerOptions[field as keyof typeof carAnswerOptions]:[];
  const a=answers[field] as Answer|undefined;
  const knownPowertrain=isCompleteCarDeclaration("powertrain",answers.powertrain);
  const incomplete=declaration?carDeclarationError(field as CarDeclarationField,a):a?.state==="known"&&a.value===undefined?`Enter a value for ${labels[field]}.`:undefined;
  const replace=(state:string)=>{
    if(field==="powertrain"&&state!=="known"&&["battery_capacity_kwh","range_km"].some(k=>(answers[k] as Answer|undefined)?.state==="known")) {
      if(!window.confirm("Changing powertrain clears known battery and range answers. Other details stay. Continue?"))return;
      for(const k of ["battery_capacity_kwh","range_km"])if((answers[k] as Answer|undefined)?.state==="known")change(k,{state:"unanswered"});
    }
    change(field,{state,...(state==="known"&&field==="range_km"?{basis:"electric_only"}:{})});
  };
  return <div className="space-y-1"><label className="block text-sm">{labels[field]}<select aria-label={`${field} answer`} className={style} value={a?.state??"unanswered"} onChange={e=>replace(e.target.value)}><option value="unanswered">Unanswered</option><option value="unknown">Not known</option>{!declaration&&<option value="not_applicable">Not applicable — seller declaration</option>}<option value="known" disabled={!declaration&&!knownPowertrain}>Known value</option></select></label>
    {a?.state==="known"&&(declaration?<><label className="block text-xs">{labels[field]} value<select aria-label={`${field} value`} className={style} value={String(a.value??"")} onChange={e=>change(field,{state:"known",...(e.target.value===""?{}:{value:e.target.value}),...(e.target.value==="other"?{other:""}:{})})}><option value="">{placeholders[field]}</option>{options.map(o=><option key={o} value={o}>{o.replaceAll("_"," ")}</option>)}</select></label>{a.value==="other"&&<label className="block text-xs">Other detail<input aria-label={`${field} Other detail`} className={style} maxLength={80} value={a.other??""} onChange={e=>change(field,{...a,other:e.target.value})}/></label>}</>:<label className="block text-xs">{labels[field]} value<input aria-label={`${field} value`} className={style} type="number" disabled={!knownPowertrain} min={field==="range_km"?0:undefined} step="any" value={String(a.value??"")} onChange={e=>change(field,{state:"known",...(e.target.value===""?{}:{value:Number(e.target.value)}),...(field==="range_km"?{basis:"electric_only"}:{})})}/></label>)}
    {incomplete&&<p role="alert" className="text-xs text-red-700">{incomplete}</p>}
    {!declaration&&<p className="text-xs">Select a supported powertrain and complete any Other detail before a known value. Hybrid answers may remain unanswered, unknown or not applicable. Zero electric-only range is distinct from unknown.</p>}
  </div>;
}
