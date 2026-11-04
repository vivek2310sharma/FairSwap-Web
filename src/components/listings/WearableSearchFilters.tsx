import type { SearchFilters } from "@/types/listing";
import { DEVICE_TYPES, DEVICE_TYPE_LABELS, CONNECTIVITY, type DeviceType } from "@/lib/listings/wearables/contract";
import { loadWearableBrandsForSearch, wearableModelsFor } from "@/lib/listings/wearables/server";

/**
 * Server-rendered (no client JS, low-bandwidth) filter panel for Smartwatches & Wearables.
 * Offers only filters backed by validated stored data: type, brand, model, "transfer-ready (seller-reported)" and connectivity.
 * Condition, price and location use the shared filters. There is no ring-size or charger filter in V1.
 */
export default function WearableSearchFilters({ filters }: { filters: Partial<SearchFilters> }) {
  const type = filters.wearable_type as DeviceType | undefined;
  const brands = loadWearableBrandsForSearch(type);
  const models = type && filters.wearable_brand ? wearableModelsFor(filters.wearable_brand, type) : [];
  const keep = ["q", "category", "city", "locality", "condition", "price_min", "price_max", "sort"] as const;
  const sel = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm";
  return <form action="/search" method="get" className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Wearable filters">
    {keep.map(k => filters[k] !== undefined && filters[k] !== "" ? <input key={k} type="hidden" name={k} value={String(filters[k])}/> : null)}
    <label className="text-sm">Type<select name="wearable_type" defaultValue={type ?? ""} className={sel}><option value="">Any type</option>{DEVICE_TYPES.map(t => <option key={t} value={t}>{DEVICE_TYPE_LABELS[t]}</option>)}</select></label>
    <label className="text-sm">Brand<select name="wearable_brand" defaultValue={filters.wearable_brand ?? ""} className={sel}><option value="">Any brand</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label className="text-sm">Model<select name="wearable_model" defaultValue={filters.wearable_model ?? ""} className={sel} disabled={!models.length}><option value="">{models.length ? "Any model" : "Choose type and brand, then Apply"}</option>{models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <label className="text-sm">Connectivity<select name="wearable_connectivity" defaultValue={filters.wearable_connectivity ?? ""} className={sel}><option value="">Any</option><option value="bluetooth">{CONNECTIVITY.bluetooth}</option><option value="lte">{CONNECTIVITY.lte}</option></select></label>
    <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="wearable_transfer_ready" value="true" defaultChecked={filters.wearable_transfer_ready === "true"} className="size-5"/>Seller says signed out / reset</label>
    <div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="min-h-11 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white">Apply wearable filters</button><p className="mt-2 text-xs text-muted-foreground">Filters use what sellers reported; FairSwap does not verify wearables.</p></div>
  </form>;
}
