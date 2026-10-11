"use client";
import { useEffect, useRef, useState } from 'react';
import { amountKeys, catalogueScope, type SourceCategory } from '../../../src/lib/listings/csv-fields/contract';
import { lookupResultSchema, type LookupResult } from '../../../src/lib/listings/csv-fields/catalogue';
import { confirmBrandChange, evaluateField, proposalFor, valuesSchema } from '../../../src/lib/listings/csv-fields/rules';
import { proposalForPath, proposalIssues, type ProposedField } from '../../../src/lib/listings/csv-fields/two-wheeler-proposal';

const control = 'mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100';
type LookupState = 'unstarted' | 'ready' | 'loading' | 'empty' | 'error';
function ProposalDetails({field,value}: {field:ProposedField;value:unknown}) {
  const issues=proposalIssues(field,value,new Date().getFullYear());
  return <div className="mt-2 space-y-1 text-xs text-gray-700">
    <p>Proposed draft: {field.requirements.draft}; proposed submission: {field.requirements.submission}. Source requiredness remains unknown.</p>
    <p>Units: {field.units??'none'}. {field.meaning}</p>
    <details><summary>Proposed bounds, options and storage</summary><p>Bounds: {field.bounds.integer?'whole numbers; ':''}{field.bounds.min!==null?`${field.bounds.exclusiveMin?'greater than':'minimum'} ${field.bounds.min}; `:''}{field.bounds.upperBound??''}{field.bounds.maxLength!==null?`maximum ${field.bounds.maxLength} characters`:''}</p>{field.bounds.unresolvedReason && <p>Unresolved bound/meaning: {field.bounds.unresolvedReason}</p>}<p>Options: {field.options.source??'none'}. {field.options.unresolvedReason}</p><p>Visibility: {field.visibility.scope}. Lookup-dependent: {String(field.rule.lookupDependent??false)}.</p><p>Value handling: {field.valueHandling.policy}</p><p className="break-all">Definition: {field.definitionId}</p><p>Proposed persistence (unresolved): {field.persistence.target}</p></details>
    {issues.map(issue=><p key={issue} role="status" className="text-amber-900">Advisory only: {issue}</p>)}
  </div>;
}
function BrandConfirmation({cancel, confirm}: {cancel: () => void; confirm: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {ref.current?.showModal();}, []);
  return <dialog ref={ref} aria-label="Confirm incompatible model removal" onCancel={e => {e.preventDefault(); cancel();}} className="m-auto max-w-md rounded border border-amber-400 bg-amber-50 p-6 backdrop:bg-black/30"><p>Proposed rule: changing brand will clear the incompatible selected model. Other values stay.</p><div className="mt-4 flex gap-3"><button type="button" autoFocus onClick={cancel}>Keep brand and model</button><button type="button" onClick={confirm}>Clear model and change brand</button></div></dialog>;
}
export default function CsvFields({category, values: rawValues, change}: {category: SourceCategory; values: Record<string, unknown>; change: (values: Record<string, unknown>) => void}) {
  const values = valuesSchema.parse(rawValues);
  const covered = !!catalogueScope(category.path[1]);
  const proposal=proposalForPath(category.reviewKey);
  const brand = String(values.brand ?? '');
  const model = String(values.model ?? '');
  const [simulation, setSimulation] = useState('ready');
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [view,setView]=useState('leaf');
  const [brands,setBrands]=useState<string[]>([]);
  const [lookup, setLookup] = useState<{key: string; status: LookupState; data?: LookupResult}>({key: '', status: 'loading'});
  const [pendingBrand, setPendingBrand] = useState<string | null>(null);
  const query = new URLSearchParams({path: category.reviewKey, brand, selected: model, offset: String(offset), search,view}).toString();
  const status: LookupState = simulation !== 'ready' ? simulation as LookupState : lookup.key !== query ? 'loading' : lookup.status;
  const data = lookup.key === query ? lookup.data : undefined;
  useEffect(() => {
    if (!covered || simulation==='unstarted') return;
    const controller = new AbortController();
    fetch('/api/catalogue?' + query, {signal: controller.signal}).then(async response => {
      if (!response.ok) throw new Error('Lookup failed');
      const result = lookupResultSchema.parse(await response.json());
      setBrands(result.brands);
      setLookup({key: query, status: brand && (result.total === 0 || result.selectableTotal===0) ? 'empty' : 'ready', data: result});
    }).catch(error => {if (error.name !== 'AbortError') setLookup({key: query, status: 'error'});});
    return () => controller.abort();
  }, [query, covered, brand, simulation]);
  const changeBrand = (nextBrand: string, confirmed = false) => {
    const result = confirmBrandChange({values, nextBrand}, confirmed);
    if (result.needsConfirmation) setPendingBrand(nextBrand);
    else {change(result.values); setOffset(0); setSearch(''); setPendingBrand(null);}
  };
  return <section aria-label="CSV field contract" className="space-y-4">
    <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm"><h3 className="font-semibold">Source-derived applicability</h3><p>{category.path.join(' → ')}</p><p>{category.source.file}:{category.source.row} · source order {category.sourceOrder + 1}</p><p className="break-all">Review key: {category.reviewKey} (not a database ID)</p><p className="break-words">Exact field order: {category.raw.key_fields}</p><p>Requiredness, bounds and options: unknown. These rules cannot authorize publishing.</p></div>
    <p className="text-sm text-amber-900">Proposed behaviour: controls below demonstrate drafting only. Common title, price, condition and location mappings remain undecided; source omission does not remove the common form.</p>
    {proposal && <aside className="rounded border border-amber-300 bg-amber-50 p-3 text-sm"><h3 className="font-semibold">Motorcycle/Scooter proposal overlay v1 — not approved</h3><p>All {proposal.fields.length} fields retain source order. Proposed types, units and submission requirements below are advisory; existing common draft minimums stay intact. No submit or publish validation is activated.</p><p>No new Motorcycle fuel or electric-bike battery-capacity field is added. CNG and other raw fuel hints remain distinct.</p></aside>}
    {category.path[0] === 'Property' && <p className="text-sm">Source amount basis: {category.fields.filter(f => amountKeys.includes(f.key)).map(f => f.key).join(', ') || 'not supplied'}. No conversion to the illustrative common price.</p>}
    {covered ? <>
      <label className="text-sm">Proposed lookup state<select className={control} value={simulation} onChange={e => setSimulation(e.target.value)}>{['ready', 'unstarted', 'loading', 'error', 'empty'].map(s => <option key={s}>{s}</option>)}</select></label>
      {status === 'unstarted' && <p role="status">Model lookup unstarted or missing. Model stays disabled; selected value retained.</p>}
      {status === 'loading' && <p role="status">Loading model lookup…</p>}
      {status === 'error' && <p role="alert">Model lookup failed. Values retained; choose ready to retry.</p>}
      {status === 'empty' && <p role="status">No matching models. No fallback option has been invented.</p>}
      {proposal && <label className="text-sm">Compatibility review view<select className={control} value={view} onChange={e=>{setView(e.target.value);setOffset(0);setSearch('');}}><option value="leaf">Explicit proposed leaf matches</option><option value="review">Broad-group rows for review (all statuses)</option></select></label>}
      {proposal && data && <section aria-label="Compatibility coverage" className="rounded border p-3 text-sm"><p>Source rows: {data.coverageSummary.sourceRows}; broad-group rows: {data.coverageSummary.broadGroupRows}; outside group: {data.coverageSummary.outsideBroadGroup}.</p><p>Proposed compatible: {data.coverageSummary.proposedCompatible}; unresolved: {data.coverageSummary.unresolved}; other leaf: {data.coverageSummary.incompatible}; approved compatible: 0.</p>{view==='review' && <ol>{data.rows.map(row=><li key={row.id} className="mt-2 border-t pt-2"><p>{row.raw.brand} {row.raw.model} · raw status {row.raw.status}</p><p>{row.source.file}:{row.source.row} · {data.compatibilities[row.id].sourceType} / {data.compatibilities[row.id].sourceStyle}</p><p>{data.compatibilities[row.id].status}: {data.compatibilities[row.id].reason}</p></li>)}</ol>}</section>}
      <details className="rounded border p-3"><summary>Unresolved catalogue crosswalk</summary><p>{data?.crosswalk.note ?? 'Proposed broad-group lookup; exact leaf style/body/segment/powertrain mapping remains unverified.'}</p><p>Taxonomy leaf: {category.path[2]}</p><p className="break-words">Raw catalogue dimensions: {data?.crosswalk.catalogueLabels.join(' | ') ?? 'Awaiting source lookup'}</p></details>
    </> : <p className="text-sm">No dedicated model catalogue supplied for this group. Brand/model widgets remain unresolved.</p>}
    <ol className="grid gap-3 sm:grid-cols-2">{category.fields.map(field => {
      const proposedField=proposal?.fields.find(f=>f.definitionId===field.id);
      const rule = proposedField?.rule??proposalFor(field, covered);
      const state = evaluateField({field: field.key, applicable: true, values, rule, ...(field.key === 'model' && covered && status!=='unstarted' ? {lookup: status} : {})});
      return <li key={field.id} className="rounded border p-3 text-sm" hidden={!state.visible}>
        <label htmlFor={field.id} className="font-semibold">{field.order}. {field.key}</label>
        <p className="text-xs text-gray-600">Required: {state.required} · {state.widget === 'unresolved' ? 'Widget/options/bounds undecided' : 'Proposed ' + state.widget} · visible: {String(state.visible)} · enabled: {String(state.enabled)}</p>
        {proposedField && <ProposalDetails field={proposedField} value={values[field.key]} />}
        {state.widget === 'boolean' ? <select id={field.id} className={control} disabled={!state.enabled} value={values[field.key] === true ? 'yes' : values[field.key] === false ? 'no' : ''} onChange={e => change({...values, [field.key]: e.target.value === '' ? null : e.target.value === 'yes'})}><option value="">Unanswered</option><option value="yes">Yes</option><option value="no">No</option></select>
          : state.widget === 'number-sample' ? <input id={field.id} className={control} type="number" disabled={!state.enabled} value={String(values[field.key] ?? '')} onChange={e => change({...values, [field.key]: e.target.value === '' ? null : Number(e.target.value)})} />
          : state.widget === 'number' ? <input id={field.id} className={control} type="number" step="any" disabled={!state.enabled} value={String(values[field.key]??'')} onChange={e=>change({...values,[field.key]:e.target.value===''?null:Number(e.target.value)})} />
          : state.widget === 'text' || state.widget === 'date' ? <input id={field.id} className={control} type={state.widget==='date'?'date':'text'} disabled={!state.enabled} value={String(values[field.key]??'')} onChange={e=>change({...values,[field.key]:e.target.value===''?null:e.target.value})} />
          : state.widget === 'linked-common' ? <p className="mt-2 text-xs">Proposed common-field mapping remains unresolved. Use the existing common pricing controls below; no duplicate attribute is written.</p>
          : covered && field.key === 'brand' ? <select id={field.id} className={control} disabled={!state.enabled || brands.length===0} value={brand} onChange={e => changeBrand(e.target.value)}><option value="">Select source brand</option>{brands.map(b => <option key={b}>{b}</option>)}</select>
          : covered && field.key === 'model' ? <><select id={field.id} className={control} disabled={!state.enabled} value={model} onChange={e => change({...values, model: e.target.value})}><option value="">Select source model</option>{model && !data?.rows.some(r=>r.id===model) && <option value={model}>{data?.selected?.raw.model??'Retained review selection'} — {data?.selected?.raw.status??model}</option>}{data?.rows.map(r => <option key={r.id} value={r.id} disabled={!!proposal && data.compatibilities[r.id].status!=='proposed-compatible'}>{r.raw.model} — {r.raw.status}</option>)}</select><label className="mt-2 block">Search source models<input className={control} value={search} onChange={e => {setSearch(e.target.value); setOffset(0);}} /></label><p>{data ? `${data.rows.length} of ${data.total} matching models (page ${Math.floor(offset / data.limit) + 1})` : 'No lookup page loaded'}</p><button type="button" disabled={!data || offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous models</button> <button type="button" disabled={!data || offset + data.limit >= data.total} onClick={() => setOffset(offset + 20)}>Next models</button></>
          : <p className="mt-2 text-xs">Unresolved: {field.proposal['Review note']}. {field.proposal['Input hint - PROPOSED']}; proposal only.</p>}
      </li>;
    })}</ol>
    {data?.selected && <div className="rounded bg-gray-50 p-3 text-sm"><h3 className="font-semibold">Raw catalogue row — hints, not immutable year/variant specifications</h3><p>{data.selected.source.file}:{data.selected.source.row}</p><pre className="whitespace-pre-wrap break-words">{JSON.stringify(data.selected.raw, null, 2)}</pre>{data.selected.catalogue==='two-wheelers' && data.selected.raw.engine_cc === '' && <p>engine_cc blank: unknown, not zero.</p>}<p>Raw status is preserved; posting eligibility remains undecided.</p>{proposal && <p>Selected model compatibility: {data.compatibilities[data.selected.id].status}; approval: false.</p>}</div>}
    {pendingBrand !== null && <BrandConfirmation cancel={() => setPendingBrand(null)} confirm={() => changeBrand(pendingBrand, true)} />}
  </section>;
}
