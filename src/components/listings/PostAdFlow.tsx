"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import MacroCategorySelector from "./MacroCategorySelector";
import { ListingDetailsFields, ListingPricingFields, type CommonDetails } from "./ListingFormFields";
import type { CategoryAttribute } from "@/types/listing";
import type { MacroCategory } from "@/lib/listings/macro-category";
import type { PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
export interface PostAdCategory { id: string; name: string; macro: MacroCategory; group?: string }
export type CategoryData = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; categories: PostAdCategory[]; attributes: CategoryAttribute[] };
export interface PostAdDraft extends Omit<CommonDetails, "condition"> { condition: string | null; category_id: string; section: MacroCategory; price_type: string; price_rupees: string; location: string; pin_code: string; category_attributes: Record<string, unknown> }
interface Props { macro: MacroCategory | null; invalidQuery?: boolean; data: CategoryData; hrefForSection: (macro: MacroCategory) => string; navigate: (macro: MacroCategory | null, replace?: boolean) => void; onPreview: (draft: PostAdDraft) => void; notice?: ReactNode; groups?: string[]; renderCategoryFields?: (category: PostAdCategory, values: Record<string, unknown>, change: (values: Record<string, unknown>) => void) => ReactNode }
const fieldClass = "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
export function ConfirmChange({confirm, cancel,description}: {confirm: () => void; cancel: () => void;description?:string}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal?.(); }, []);
  return <dialog ref={ref} open={typeof HTMLDialogElement === "undefined" ? true : undefined} onCancel={(e) => { e.preventDefault(); cancel(); }} aria-labelledby="change-title" className="m-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/30">
    <h2 id="change-title" className="text-lg font-semibold">Remove category-specific details?</h2><p className="mt-3 text-sm text-gray-600">{description??'Changing category or section will remove incompatible category attributes and clear the selected category. Your title, description, pricing and location will stay.'}</p>
    <div className="mt-5 flex flex-wrap gap-3"><button autoFocus type="button" onClick={cancel} className="rounded-lg border px-4 py-2">Cancel / stay</button><button type="button" onClick={confirm} className="rounded-lg bg-emerald-700 px-4 py-2 text-white">Remove details and continue</button></div>
  </dialog>;
}
export default function PostAdFlow(props: Props | LiveProps) {
  return "renderForm" in props ? <LivePostAdFlow {...props} /> : <PreviewPostAdFlow {...props} />;
}
interface LiveProps {
  capabilities?: PostAdCapabilities;
  vehiclesAvailable?: boolean;
  propertyAvailable?: boolean;
  macro: MacroCategory | null;
  invalidQuery?: boolean;
  navigate: (macro: MacroCategory | null, replace?: boolean) => void;
  hrefForSection: (macro: MacroCategory) => string;
  renderForm: (controls: { section: MacroCategory | null; onAttributesChanged: (entered: boolean) => void; resetCategoryVersion: number }) => ReactNode;
}
function LivePostAdFlow({macro: routeMacro, invalidQuery, navigate, hrefForSection, renderForm,vehiclesAvailable=false,propertyAvailable=false,capabilities}: LiveProps) {
  const [observed, setObserved] = useState(routeMacro);
  const [macro, setMacro] = useState(routeMacro);
  const [formSection,setFormSection]=useState(routeMacro??'goods');
  if(macro!==null&&formSection!==macro)setFormSection(macro);
  const [entered, setEntered] = useState(false);
  const [resetCategoryVersion, setResetCategoryVersion] = useState(0);
  const [pending, setPending] = useState<{next: MacroCategory | null; external: boolean} | null>(null);
  if (observed !== routeMacro) {
    setObserved(routeMacro);
    if (routeMacro !== macro) {
      if (entered) setPending({next: routeMacro, external: true});
      else { setMacro(routeMacro); setResetCategoryVersion(v => v + 1); }
    }
  }
  const request = (next: MacroCategory | null) => {
    if (entered) setPending({next, external: false});
    else navigate(next);
  };
  return <div className="space-y-6">
    {invalidQuery && <p role="alert">Invalid or repeated section value. Choose a section to continue.</p>}
    <div hidden={macro !== null}>
      <MacroCategorySelector integrated capabilities={capabilities} availability={{goods: {available: true}, vehicles: {available: vehiclesAvailable, reason: "Vehicle posting is not integrated yet."}, property: {available: propertyAvailable, reason: "Property posting is not integrated yet."}}} hrefForSection={hrefForSection} onChooseSection={request} />
    </div>
    <div hidden={macro === null} className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm text-emerald-700">Selected section</p><h1 className="text-2xl font-bold">{macro === "goods" ? "Goods" : macro === "vehicles" ? "Vehicles" : "Property"}</h1>{macro && macro !== "goods" && !(macro === "vehicles" && vehiclesAvailable) && !(macro==='property'&&propertyAvailable) && <p role="status">Unavailable: {macro === "vehicles" ? "Vehicle" : "Property"} posting is not integrated yet.</p>}</div>
      <button type="button" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold" onClick={() => request(null)}>Change section</button>
    </div>
    {/* Keep the same form mounted across search-only navigation to preserve common values. */}
    <div hidden={macro !== "goods" && !(macro === "vehicles" && vehiclesAvailable) && !(macro==='property'&&propertyAvailable)}>{renderForm({section:macro??formSection,onAttributesChanged: setEntered, resetCategoryVersion})}</div>
    {pending && <ConfirmChange description={macro==='property'?'Changing section clears Property details, rental declarations and private society text. Your title, description and location will stay.':macro==='vehicles'?'Changing section clears vehicle answers, Brand and Model selections, and seller-entered Brand/Model text. Your title, description, item pricing and location will stay.':undefined} cancel={() => { if (pending.external) navigate(macro, true); setPending(null); }} confirm={() => { setEntered(false); setResetCategoryVersion(v => v + 1); if (pending.external) setMacro(pending.next); else navigate(pending.next); setPending(null); }} />}
  </div>;
}
function PreviewPostAdFlow({macro: routeMacro, invalidQuery, data, hrefForSection, navigate, onPreview, notice, groups, renderCategoryFields}: Props) {
  const [observed, setObserved] = useState(routeMacro);
  const [macro, setMacro] = useState(routeMacro);
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [pendingGroup, setPendingGroup] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [common, setCommon] = useState<CommonDetails>({title: "", description: "", condition: "good"});
  const [priceType, setPriceType] = useState("fixed"); const [priceRupees, setPriceRupees] = useState("");
  const [location, setLocation] = useState(""); const [pinCode, setPinCode] = useState("");
  const [pending, setPending] = useState<{macro: MacroCategory | null; category: string; external: boolean} | null>(null);
  const hasAttributes = Object.values(attributes).some(v => v !== "" && v !== null && v !== undefined);
  // Reconcile URL-only navigation (including Back/Forward), without history patches.
  if (observed !== routeMacro) {
    setObserved(routeMacro);
    if (routeMacro !== macro) {
      if (hasAttributes) setPending({macro: routeMacro, category: "", external: true});
      else { setMacro(routeMacro); setCategory(""); setAttributes({}); }
    }
  }
  const request = (next: MacroCategory | null, nextCategory = "") => {
    if (next === macro && nextCategory === category) return;
    if (hasAttributes) setPending({macro: next, category: nextCategory, external: false});
    else { setCategory(nextCategory); setAttributes({}); if (next !== macro) navigate(next); }
  };
  const categories = data.status === "ready" ? data.categories.filter(c => c.macro === macro) : [];
  const selected = categories.find(c => c.id === category);
  const currentGroup = groups?.includes(group) ? group : "";
  const leafCategories = groups ? categories.filter(c => c.group === currentGroup) : categories;
  const activeAttributes = data.status === "ready" && selected ? data.attributes.filter(a => a.category_id === selected.id) : [];
  const title = macro ? macro[0].toUpperCase() + macro.slice(1) : "";
  return <div className="space-y-6">
    {notice}
    {invalidQuery && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">Invalid or repeated section value. Choose a section to continue.</p>}
    {!macro ? <MacroCategorySelector availability={{goods: {available: true}, vehicles: {available: true}, property: {available: true}}} hrefForSection={hrefForSection} onChooseSection={next => request(next)} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-emerald-700">Selected section</p><h1 className="text-2xl font-bold">{title}</h1>{macro !== "goods" && <p className="text-sm text-amber-800">Preview-only — not a released posting capability.</p>}</div><button type="button" onClick={() => request(null)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold">Change section</button></div>
      <form onSubmit={e => { e.preventDefault(); if (selected && macro) onPreview({...common, condition: macro === "property" ? null : common.condition, section: macro, category_id: selected.id, price_type: priceType, price_rupees: priceRupees, location, pin_code: pinCode, category_attributes: attributes}); }} className="space-y-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <section className="space-y-4"><h2 className="border-b pb-2 text-base font-semibold">1. Category & Type</h2>
        {data.status === "loading" && <p role="status">Loading categories…</p>}
        {data.status === "error" && <p role="alert">Unable to load categories: {data.message}</p>}
        {data.status === "ready" && categories.length === 0 && <p role="status">No categories are available in this section.</p>}
        {groups && <label className="block text-xs font-semibold">Source group<select className={fieldClass} value={selected?.group ?? currentGroup} disabled={data.status !== "ready"} onChange={e => {if (hasAttributes) {setPendingGroup(e.target.value); request(macro);} else {setGroup(e.target.value); request(macro);}}}><option value="">Select a group</option>{groups.map(g => <option key={g}>{g}</option>)}</select></label>}
        <label className="block text-xs font-semibold" htmlFor="flow-category">Category *</label><select id="flow-category" name="category_id" required value={selected?.id ?? ""} disabled={data.status !== "ready" || !leafCategories.length} onChange={e => request(macro, e.target.value)} className={fieldClass}><option value="">Select a category</option>{leafCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {selected && renderCategoryFields?.(selected, attributes, setAttributes)}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{activeAttributes.map(a => <div key={a.id}><label htmlFor={"attribute-"+a.id} className="text-xs font-semibold">{a.label}{a.is_required ? " *" : ""}</label>{a.value_type === "select" ? <select id={"attribute-"+a.id} className={fieldClass} value={String(attributes[a.name] ?? "")} onChange={e => setAttributes({...attributes, [a.name]: e.target.value})}><option value="">Select {a.label}…</option>{a.options?.map(o => <option key={o}>{o}</option>)}</select> : <input id={"attribute-"+a.id} className={fieldClass} type={a.value_type === "number" ? "number" : "text"} value={String(attributes[a.name] ?? "")} onChange={e => setAttributes({...attributes, [a.name]: a.value_type === "number" && e.target.value ? Number(e.target.value) : e.target.value})} />}</div>)}</div></section>
        <ListingDetailsFields common={common} onCommonChange={(field, value) => setCommon({...common, [field]: value})} isProperty={macro === "property"} />
        <section className="space-y-4"><h2 className="border-b pb-2 font-semibold">3. Location</h2><p className="text-sm text-gray-500">Enter sample location details. No location lookup is performed.</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">City / locality<input name="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Vaishali Nagar, Jaipur" className={fieldClass} /></label><label className="text-xs font-semibold">PIN code<input name="pin_code" inputMode="numeric" maxLength={6} value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="302021" className={fieldClass} /></label></div></section>
        <ListingPricingFields priceType={priceType} priceRupees={priceRupees} setPriceType={setPriceType} setPriceRupees={setPriceRupees} />
        {macro === "property" && <p className="text-sm text-amber-800">Illustrative pricing only. Sale / rent intent and Property validation await integration; this is not a property posting contract.</p>}
        {priceType !== "free" && priceRupees && <p className="text-sm text-emerald-800">Sample amount: {new Intl.NumberFormat("en-IN", {style: "currency", currency: "INR", maximumFractionDigits: 2}).format(Number(priceRupees))}</p>}
        <aside className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Photos come after a real draft is saved on the listing edit screen. Uploads are unavailable in this preview.</aside>
        <button type="submit" disabled={!selected || data.status !== "ready"} className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-40">Preview draft data</button>
      </form>
    </>}
    {pending && <ConfirmChange cancel={() => { if(pending.external) navigate(macro, true); setPendingGroup(null); setPending(null); }} confirm={() => {setAttributes({}); setCategory(pending.category); if (pendingGroup !== null) setGroup(pendingGroup); setPendingGroup(null); if (pending.external) setMacro(pending.macro); else if (pending.macro !== macro) navigate(pending.macro); setPending(null);}} />}
  </div>;
}