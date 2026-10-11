"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PostAdFlow, { type PostAdDraft, type CategoryData } from '../../../src/components/listings/PostAdFlow';
import { sourceCategories, groupsFor } from '../../../src/lib/listings/csv-fields/contract';
import CsvFields from './CsvFields';
import type { MacroCategory } from '../../../src/lib/listings/macro-category';
import { parsePreviewQuery, previewSectionUrl } from '../navigation';
export default function Preview() {
 const router=useRouter(); const query=useSearchParams(); const parsed=parsePreviewQuery(query);
 const [simulation,setSimulation]=useState('ready'); const [summary,setSummary]=useState<PostAdDraft|null>(null);
 const macro=parsed.status === 'valid' ? parsed.macroCategory : null;
 const data: CategoryData=simulation === 'loading' ? {status:'loading'} : simulation === 'error' ? {status:'error',message:'Simulated preview error. Choose Ready to retry.'} : {status:'ready',categories:simulation === 'empty' ? [] : sourceCategories.map(c => ({id:c.reviewKey,name:c.path[2],group:c.path[1],macro:c.path[0].toLowerCase() as MacroCategory})),attributes:[]};
 return <><div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-900">CSV-backed UI preview — no listing will be saved.</p><p className="mt-1 text-sm text-emerald-800">202 source paths. Facts and proposals shown separately. Unsaved preview input stays during this flow; reload discards it. Real Goods recovery is unchanged.</p></div>
 <PostAdFlow macro={macro} invalidQuery={parsed.status === 'invalid'} data={data} groups={macro ? groupsFor(macro) : []} renderCategoryFields={(selected,values,change) => <CsvFields key={selected.id} category={sourceCategories.find(c=>c.reviewKey===selected.id)!} values={values} change={change} />} hrefForSection={previewSectionUrl} navigate={(macro,replace) => {setSummary(null); router[replace ? 'replace' : 'push'](previewSectionUrl(macro),{scroll:false});}} onPreview={setSummary} />
 <details className="mt-8 rounded-lg border bg-white p-4"><summary className="cursor-pointer text-sm font-medium">Preview adapter: simulate category states</summary><label className="mt-3 block text-sm">Simulated data state <select className="ml-3 rounded border p-2" value={simulation} onChange={e=>setSimulation(e.target.value)}><option value="ready">Ready</option><option value="loading">Loading (simulated)</option><option value="empty">Empty (simulated)</option><option value="error">Error (simulated)</option></select></label></details>
 {summary && <section aria-label="In-memory draft summary" className="mt-6 rounded-xl border border-emerald-200 bg-white p-6"><h2 className="text-lg font-semibold">In-memory preview data — not saved</h2><p className="mt-2 text-sm">No listing ID, submission or upload was created.</p><pre className="mt-4 whitespace-pre-wrap break-all text-xs">{JSON.stringify(summary,null,2)}</pre></section>}
 </>;
}
