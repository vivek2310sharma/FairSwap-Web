"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, ShieldAlert, X } from "lucide-react";
import { buildMacroCategoryUrl, type MacroCategory } from "@/lib/listings/macro-category";
import { POST_AD_CATALOGUE, capabilitiesFromAvailability, isMainActionable, resolveSub, searchCatalogue, type PostAdCapabilities } from "@/lib/listings/post-ad-category-catalogue";
import PostAdSubcategoryChooser, { SubChoice, SubNotice, type ChooserActions } from "./PostAdSubcategoryChooser";
import { getMainCategoryIcon } from "./post-ad-category-icons";
import styles from "./posting/Posting.module.css";
export type MacroCategoryAvailability = Record<MacroCategory, {
    available: true;
} | {
    available: false;
    reason: string;
}>;
interface Props {
    availability: MacroCategoryAvailability;
    capabilities?: PostAdCapabilities;
    hrefForSection?: (macro: MacroCategory) => string;
    onChooseSection?: (macro: MacroCategory) => void;
    integrated?: boolean;
}
export default function MacroCategorySelector({ availability, capabilities, hrefForSection = buildMacroCategoryUrl, onChooseSection }: Props) {
    const caps = useMemo(() => capabilities ?? capabilitiesFromAvailability({ goods: availability.goods.available, vehicles: availability.vehicles.available, property: availability.property.available }), [capabilities, availability]);
    const [mainId, setMainId] = useState<string | null>(null);
    const [subId, setSubId] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [compact, setCompact] = useState(false);
    const sheet = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const main = POST_AD_CATALOGUE.find(c => c.id === mainId);
    const hits = useMemo(() => searchCatalogue(query), [query]);
    const searching = query.trim().length >= 2;
    const picked = hits.find(h => h.sub?.id === subId)?.sub;
    useEffect(() => { if (!window.matchMedia)
        return; const media = window.matchMedia("(max-width:700px)"); const sync = () => setCompact(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
    useEffect(() => { if (compact && main && !searching && !sheet.current?.open)
        sheet.current?.showModal?.(); }, [compact, main, searching]);
    const close = () => { sheet.current?.close(); setMainId(null); setSubId(null); (document.querySelector<HTMLButtonElement>(`[data-main-category="${mainId}"]`)??trigger.current)?.focus(); };
    const actions: ChooserActions = { caps, hrefForSection, onChooseSection, selectedSubId: subId, onSelectSub: setSubId };
    const panel = main ? <><h2 id="post-ad-subcategory-heading">{main.label.en}</h2><PostAdSubcategoryChooser main={main} actions={actions}/><p className={styles.muted}>{main.trust.disclaimer}</p></> : <><p className={styles.eyebrow}>A SMALL START</p><h2 id="post-ad-subcategory-heading">Good things deserve another go.</h2><p className={styles.muted}>Choose a category. We’ll help with the details, one step at a time.</p></>;
    return <section aria-label="Ad categories"><div className={styles.eyebrow}>PASS IT ON, WITH FAIRSWAP</div><h1>What would you like to list?</h1><p className={styles.muted}>{main ? "Choose a subcategory to continue." : "Choose a category to continue."}</p>
 <div className={styles.categoryLayout}><div className={styles.search}><label htmlFor="post-ad-category-search" className="sr-only">Search categories</label><Search size={20} aria-hidden="true"/><input id="post-ad-category-search" type="search" autoComplete="off" value={query} onChange={e => { setQuery(e.target.value); setSubId(null); }} placeholder="e.g. iPhone 13, Activa, fridge, sofa"/></div></div>
 <div className={styles.categoryLayout}>{searching ? <div aria-live="polite">{hits.length === 0 ? <p role="status">No categories match “{query.trim()}”. Try a broader word or clear the search.</p> : <><p className={styles.muted}>{hits.length === 1 ? "1 match" : `${hits.length} matches`}. Choose the one that fits.</p><ul className={styles.subgrid}>{hits.map(({ main: m, sub }) => { const Icon = getMainCategoryIcon(m.id); return <li key={`${m.id}:${sub?.id ?? ""}`}>{sub ? <SubChoice sub={sub} parent={m} actions={actions} showParent/> : <button type="button" onClick={e => { trigger.current = e.currentTarget; setQuery(""); setMainId(m.id); setSubId(null); }}><Icon aria-hidden="true" size={28}/>{m.label.en}</button>}</li>; })}</ul><SubNotice sub={picked && !resolveSub(picked, caps).macro ? picked : undefined}/></>}</div> : <ul className={styles.tiles}>{POST_AD_CATALOGUE.map(c => { const Icon = getMainCategoryIcon(c.id); const selected = c.id === mainId; const soon = !c.hideComingSoonBadge && !isMainActionable(c, caps); return <li key={c.id}><button type="button" data-main-category={c.id} aria-pressed={selected} aria-expanded={selected} aria-controls="post-ad-subcategories" onClick={e => { trigger.current = e.currentTarget; setMainId(selected ? null : c.id); setSubId(null); }} className={`${styles.tile} ${selected ? styles.selected : ""}`}><Icon aria-hidden="true" className="h-7 w-7"/><span className="font-semibold">{c.label.en}</span><small>{c.description}</small>{soon && <small>Coming soon</small>}{selected && <span className={styles.tileCheck}><Check aria-hidden="true" size={16}/></span>}</button></li>; })}</ul>}
 {compact ? <dialog id="post-ad-subcategories" ref={sheet} aria-labelledby="post-ad-subcategory-heading" className={styles.sheet} onCancel={e => { e.preventDefault(); close(); }}><button type="button" className={`${styles.button} mb-4 ml-auto flex`} onClick={close}><X aria-hidden="true" size={18}/>Close</button>{panel}</dialog> : <div id="post-ad-subcategories" className={styles.panel} aria-live="polite">{panel}</div>}</div>
 <aside className={styles.safety}><ShieldAlert aria-hidden="true" size={22}/><p>To receive money, you never need to enter a UPI PIN, scan a payment QR code or share an OTP.</p></aside></section>;
}
