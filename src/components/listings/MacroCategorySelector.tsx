"use client";
import { useMemo, useState } from "react";
import {
  Armchair, BookOpen, Briefcase, Car, House, Laptop, PawPrint, Refrigerator,
  Search, ShieldAlert, Shirt, Smartphone, Wrench,
} from "lucide-react";
import { buildMacroCategoryUrl, type MacroCategory } from "@/lib/listings/macro-category";
import {
  POST_AD_CATALOGUE,
  capabilitiesFromAvailability,
  isMainActionable,
  localize,
  resolveSub,
  searchCatalogue,
  type MainCategory,
  type PostAdCapabilities,
} from "@/lib/listings/post-ad-category-catalogue";
import PostAdSubcategoryChooser, { SubChoice, SubNotice, type ChooserActions } from "./PostAdSubcategoryChooser";

export type MacroCategoryAvailability = Record<
  MacroCategory,
  { available: true } | { available: false; reason: string }
>;

interface MacroCategorySelectorProps {
  /** Presentation only; future route activation also requires server/DB gates. */
  availability: MacroCategoryAvailability;
  /** Per-family readiness derived server-side; falls back to `availability`. */
  capabilities?: PostAdCapabilities;
  hrefForSection?: (macro: MacroCategory) => string;
  onChooseSection?: (macro: MacroCategory) => void;
  integrated?: boolean;
}

const icons = {
  mobile: Smartphone, vehicle: Car, property: House, appliance: Refrigerator, computer: Laptop,
  furniture: Armchair, fashion: Shirt, books: BookOpen, pets: PawPrint, services: Wrench, jobs: Briefcase,
} as const;

function TrustNote({ main }: { main: MainCategory }) {
  const { status, message, disclaimer } = main.trust;
  const label = status === "planned" ? "Planned" : "Coming soon";
  return (
    <aside aria-label={`${main.label.en} trust information`} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-gray-800">
      {status === "available" ? (
        <p>{message}</p>
      ) : (
        <>
          <p className="font-semibold">Safer transactions are on the way</p>
          <p>{message} — {label}.</p>
          <p className="mt-1 text-xs text-gray-600">{disclaimer}</p>
        </>
      )}
    </aside>
  );
}

export default function MacroCategorySelector({
  availability,
  capabilities,
  hrefForSection = buildMacroCategoryUrl,
  onChooseSection,
}: MacroCategorySelectorProps) {
  const caps = useMemo(
    () => capabilities ?? capabilitiesFromAvailability({
      goods: availability.goods.available,
      vehicles: availability.vehicles.available,
      property: availability.property.available,
    }),
    [capabilities, availability],
  );
  const [mainId, setMainId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const main = POST_AD_CATALOGUE.find(c => c.id === mainId);
  const hits = useMemo(() => searchCatalogue(query), [query]);
  const pickedHit = hits.find(h => h.sub?.id === subId)?.sub;
  const searching = query.trim().length >= 2;
  const actions: ChooserActions = { caps, hrefForSection, onChooseSection, selectedSubId: subId, onSelectSub: setSubId };

  return (
    <section aria-label="Ad categories" className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">What would you like to list?</h1>
        <p className="mt-1 text-sm text-gray-600">Step 1 of 3 · Choose a category</p>
      </div>

      <div className="relative">
        <label htmlFor="post-ad-category-search" className="sr-only">Search categories</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          id="post-ad-category-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={e => { setQuery(e.target.value); setSubId(null); }}
          placeholder="e.g. iPhone 13, Activa, fridge, sofa"
          className="block min-h-11 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {searching ? (
        <div aria-live="polite" className="space-y-3">
          {hits.length === 0 ? (
            <p role="status" className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
              No categories match &ldquo;{query.trim()}&rdquo;. Try a broader word, or clear the search to browse all categories.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">{hits.length === 1 ? "1 match" : `${hits.length} matches`}. Choose the one that fits.</p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hits.map(({ main: m, sub }) => (
                  <li key={`${m.id}:${sub?.id ?? ""}`} className="min-w-0">
                    {sub ? (
                      <SubChoice sub={sub} parent={m} actions={actions} showParent />
                    ) : (
                      <button type="button" onClick={() => { setQuery(""); setMainId(m.id); setSubId(null); }}
                        className="flex min-h-11 w-full items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                        {localize(m.label)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <SubNotice sub={pickedHit && !resolveSub(pickedHit, caps).macro ? pickedHit : undefined} />
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {POST_AD_CATALOGUE.map(c => {
              const Icon = icons[c.icon];
              const selected = c.id === mainId;
              const soon = !c.hideComingSoonBadge && !isMainActionable(c, caps);
              return (
                <li key={c.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-expanded={selected}
                    aria-controls="post-ad-subcategories"
                    onClick={() => { setMainId(selected ? null : c.id); setSubId(null); }}
                    className={`flex h-full min-h-11 w-full min-w-0 flex-col items-start gap-2 rounded-xl border bg-white p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${selected ? "border-emerald-600 bg-emerald-50" : "border-gray-200 hover:border-emerald-500 hover:bg-emerald-50"}`}
                  >
                    <Icon aria-hidden="true" className="h-7 w-7 shrink-0 text-emerald-600" />
                    <span className="break-words text-sm font-semibold text-gray-900">{localize(c.label)}</span>
                    {c.label.hi && <span lang="hi" className="break-words text-xs text-gray-600">{c.label.hi}</span>}
                    <span className="hidden text-xs leading-5 text-gray-600 sm:block">{c.description}</span>
                    {soon && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{c.id === 'everything-else' ? 'Not available' : 'Coming soon'}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div id="post-ad-subcategories" aria-live="polite">
            {main && (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-gray-900">{localize(main.label)}</h2>
                <PostAdSubcategoryChooser main={main} actions={actions} />
                <TrustNote main={main} />
              </div>
            )}
          </div>
        </>
      )}

      <p className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        To receive money, you never need to enter a UPI PIN, scan a payment QR code or share an OTP.
      </p>
    </section>
  );
}
