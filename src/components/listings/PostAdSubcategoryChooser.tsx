"use client";
import Link from "next/link";
import { SubcategoryIcon } from "./post-ad-category-icons";
import type { ReactNode } from "react";
import type { MacroCategory } from "@/lib/listings/macro-category";
import {
  resolveSub,
  type MainCategory,
  type PostAdCapabilities,
  type Readiness,
  type SubCategory,
} from "@/lib/listings/post-ad-category-catalogue";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";
const tile = `flex h-full min-h-11 w-full min-w-0 items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left text-sm font-medium text-gray-900 ${focusRing}`;

export interface ChooserActions {
  caps: PostAdCapabilities;
  hrefForSection: (macro: MacroCategory) => string;
  onChooseSection?: (macro: MacroCategory) => void;
  selectedSubId: string | null;
  onSelectSub: (id: string) => void;
}

const badgeText: Record<Readiness, string | null> = {
  available: null,
  "draft-only": "Draft only",
  "coming-soon": "Coming soon",
  unavailable: "Not available",
};

export function SubChoice({ sub, parent, actions, showParent = false }: {
  sub: SubCategory; parent: MainCategory; actions: ChooserActions; showParent?: boolean;
}) {
  const { readiness, macro } = resolveSub(sub, actions.caps);
  const badge = badgeText[readiness];
  const selected = actions.selectedSubId === sub.id;
  const body: ReactNode = (
    <>
      <SubcategoryIcon parentId={parent.id} id={sub.id} />
      <span className="min-w-0 flex-1">
        <span className="block break-words">{sub.label}</span>
        {showParent && <span className="block text-xs font-normal text-gray-500">in {parent.label.en}{sub.group ? ` · ${sub.group}` : ""}</span>}
        {badge && <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{badge}</span>}
      </span>
    </>
  );
  const cls = `${tile} ${selected ? "border-emerald-600 bg-emerald-50" : "hover:border-emerald-500 hover:bg-emerald-50"}`;
  if (macro) {
    return (
      <Link
        href={sub.route.kind === "mobile-phones" ? "/account/listings/new?posting=mobile-phones" : actions.hrefForSection(macro)}
        prefetch={false}
        onClick={sub.route.kind !== "mobile-phones" && actions.onChooseSection ? (e) => { e.preventDefault(); actions.onChooseSection?.(macro); } : undefined}
        className={cls}
      >
        {body}
      </Link>
    );
  }
  return (
    <button type="button" aria-pressed={selected} onClick={() => actions.onSelectSub(sub.id)} className={cls}>
      {body}
    </button>
  );
}

export function SubNotice({ sub }: { sub: SubCategory | undefined }) {
  if (!sub) return null;
  if (sub.guidance) return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Coming soon</p>
      <p>{sub.guidance}</p>
    </div>
  );
  if (sub.route.kind === "blocked") {
    return (
      <div role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-semibold">Not available</p>
        <p>Live-animal ads are not available on FairSwap.</p>
      </div>
    );
  }
  return (
    <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Coming soon</p>
      <p>We&apos;re working on bringing this category to FairSwap.</p>
    </div>
  );
}

export default function PostAdSubcategoryChooser({ main, actions }: { main: MainCategory; actions: ChooserActions }) {
  const subs = main.subs;
  if (!subs.length) return <SubNotice sub={{ id: main.id, label: main.label.en, route: { kind: "none" } }} />;
  const selectedSub = subs.find(s => s.id === actions.selectedSubId);
  const props = { parent: main, actions };
  const anyActionable = subs.some(s => resolveSub(s, actions.caps).macro);

  const groups = [...new Set(subs.map(s => s.group ?? ""))];
  const list = (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g}>
          {g && <h3 className="mb-2 text-sm font-semibold text-gray-700">{g}</h3>}
          <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {subs.filter(s => (s.group ?? "") === g).map(s => <li key={s.id} className="min-w-0"><SubChoice sub={s} {...props} /></li>)}
          </ul>
        </div>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      {list}
      {main.id === "property" && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Beware of fake landlords. Verify the property and the landlord&apos;s authority before paying any advance or security deposit. Never pay merely to arrange a viewing.</p>}
      {main.id === "fashion" && <p className="text-xs text-gray-600">Men, Women and Kids include clothing and footwear.</p>}
      {anyActionable && <p className="text-xs text-gray-600">Available options open the existing posting form.</p>}
      <SubNotice sub={selectedSub && !resolveSub(selectedSub, actions.caps).macro ? selectedSub : undefined} />
    </div>
  );
}
