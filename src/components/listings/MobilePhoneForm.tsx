"use client";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, RotateCcw, ShieldAlert } from "lucide-react";
import type { City } from "@/types/listing";
import { CONDITIONS, INCLUDED, RAM, STORAGE, selectPostingCategory, type MobileCatalogue } from "@/lib/listings/mobiles/contract";
import { readPostingRecovery, writePostingRecovery } from "@/lib/listings/posting-recovery";
import { phoneValidationText, phoneErrorText } from "@/lib/listings/mobiles/locale";
import PincodeLocationPicker from "./PincodeLocationPicker";
import PreListingMediaUploader, { type PostingPhoto } from "./PreListingMediaUploader";
import SearchCombobox from "./posting/SearchCombobox";
import MobileBuyerPreview from "./posting/MobileBuyerPreview";
import { STEP_LABELS, validatePhoneWizard, reachablePhoneStep, blankPhoneDraft, generatedPhoneTitle, phoneRecoverySchema, fieldStep, type PhoneDraft, type PhoneRecovery } from "./posting/mobile-wizard";
import styles from "./posting/Posting.module.css";
type Issue = {
    field: string;
    message: string;
};
function focusPostingField(field: string) {
 const el=document.getElementById(`mobile-${field}`)??document.getElementById(field==="pin_code"?"pincode_picker_input":field==="city_id"?"city_picker_select":"locality_picker_select");
 const target=el instanceof HTMLSelectElement&&el.disabled?document.getElementById("pincode_picker_input"):el;
 target?.focus();target?.scrollIntoView({block:"center",behavior:"auto"});
}
export default function MobilePhoneForm({ catalogue, ownerId, cities, maintenance = false, maintenanceMessage }: {
    catalogue: MobileCatalogue;
    ownerId: string;
    cities: City[];
    maintenance?: boolean;
    maintenanceMessage?: string;
}) {
    const { replace, push } = useRouter();
    const form = useRef<HTMLFormElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const pendingFocus = useRef<string|null>(null);
    const [draft, setDraft] = useState<PhoneDraft>(blankPhoneDraft);
    const [photos, setPhotos] = useState<PostingPhoto[]>([]);
    const [manualTitle, setManualTitle] = useState(false);
    const [step, setStep] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [recovery, setRecovery] = useState<PhoneRecovery | null>(null);
    const [sessionState, setSessionState] = useState<"initializing" | "ready" | "failed">("initializing");
    const [frozen, setFrozen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [issues, setIssues] = useState<Issue[]>([]);
    const [area, setArea] = useState("");
    const [priceText, setPriceText] = useState("");
    const [saveState, setSaveState] = useState("Saving on this device…");
    const [savedRecord, setSavedRecord] = useState<{draft:PhoneDraft;photos:PostingPhoto[];step:number;manualTitle:boolean;area:string;priceText:string}|null>(null);
    const savedCurrent = savedRecord?.draft===draft&&savedRecord.photos===photos&&savedRecord.step===step&&savedRecord.manualTitle===manualTitle&&savedRecord.area===area&&savedRecord.priceText===priceText;
    const sessionReady = sessionState === "ready";
    const retryInFlight = useRef(false);
    const submitting = useRef(false);
    const resolved = useRef(false);
    const mounted = useRef(true);
    const activeSession = useRef("");
    const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
    const latestRecovery = useRef<PhoneRecovery|null>(null);
    const brand = catalogue.brands.find(b => b.id === draft.brand_id);
    const model = catalogue.models.find(m => m.id === draft.model_id && m.brand_id === draft.brand_id);
    const title = manualTitle ? draft.title : generatedPhoneTitle(brand?.name ?? "", model?.other ? draft.other_model : model?.name ?? "", draft.storage, draft.condition);
    const clearIssue = (field: string) => setIssues(current => current.filter(i => i.field !== field));
    const update = <K extends keyof PhoneDraft>(key: K, value: PhoneDraft[K]) => { setDraft(d => ({ ...d, [key]: value })); clearIssue(key); };
    const locationChanged = useCallback((v: {
        pin_code: string;
        city_id: string;
        locality_id: string;
        area: string;
    }) => { setDraft(d => d.pin_code === v.pin_code && d.city_id === v.city_id && d.locality_id === v.locality_id ? d : { ...d, pin_code: v.pin_code, city_id: v.city_id, locality_id: v.locality_id }); setArea(v.area); }, [setDraft, setArea]);
    const refresh = useCallback(async (session: string) => {
        const r = await fetch(`/api/post-ad/sessions/${session}/media`, { cache: "no-store" });
        const data = await r.json();
        if (!r.ok)
            throw new Error(data.error);
        const remote = z.object({ session: z.object({ state: z.string() }), media: z.array(z.object({ id: z.string().uuid(), state: z.enum(["uploading", "ready", "removed"]), url: z.string().nullable() })) }).parse(data);
        if (!mounted.current || activeSession.current !== session)
            return;
        setFrozen(remote.session.state === "finalizing");
        setPhotos(current => {
            const removed = new Set(remote.media.filter(p => p.state === "removed").map(p => p.id));
            const merged = current.filter(p => !removed.has(p.id)).map(p => { const found = remote.media.find(m => m.id === p.id); return found?.state === "ready" ? { ...p, state: "ready" as const, url: found.url ?? undefined } : p; });
            for (const p of remote.media)
                if (p.state !== "removed" && !merged.some(m => m.id === p.id))
                    merged.push({ id: p.id, state: p.state === "ready" ? "ready" : "failed", url: p.url ?? undefined });
            return merged;
        });
    }, [setPhotos, setFrozen]);
    const initializeSession = useCallback(async (session: string) => {
        activeSession.current = session;
        setSessionState("initializing");
        try {
            selectPostingCategory(blankPhoneDraft().selection, catalogue);
            const r = await fetch("/api/post-ad/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session }) });
            const data = await r.json();
            if (!r.ok)
                throw new Error(data.error);
            if (!mounted.current || activeSession.current !== session)
                return;
            if (data.session?.state === "submitted") {
                submitting.current = true;
                await saveQueue.current;
                await writePostingRecovery(ownerId, null);
                replace(`/account/listings/${z.string().uuid().parse(data.session.listing_id)}/edit`);
                return;
            }
            await refresh(session);
            if (mounted.current && activeSession.current === session)
                setSessionState("ready");
        }
        catch (e) {
            if (mounted.current && activeSession.current === session) {
                setSessionState("failed");
                setMessage(e instanceof Error ? e.message : "Session unavailable.");
            }
        }
    }, [catalogue, ownerId, refresh, replace]);
    const initializeOnMount = useEffectEvent(initializeSession);
    useEffect(() => {
        mounted.current = true;
        let cancelled = false;
        async function init() {
            let found: PhoneRecovery | null = null;
            try {
                const p = phoneRecoverySchema.safeParse(await readPostingRecovery(ownerId));
                if (p.success && p.data.owner === ownerId && Date.now() >= p.data.updated && Date.now() - p.data.updated < 24 * 60 * 60 * 1000)
                    found = p.data;
            }
            catch {
                if (!cancelled)
                    setMessage("Local recovery is unavailable in this browser. Keep this page open until submission.");
            }
            if (cancelled)
                return;
            setLoaded(true);
            if (found) {
                setRecovery(found);
                return;
            }
            resolved.current = true;
            const session = crypto.randomUUID();
            setDraft({ ...blankPhoneDraft(), session_id: session });
            void initializeOnMount(session);
        }
        void init();
        return () => { cancelled = true; mounted.current = false; };
    }, [ownerId]);
    useEffect(() => { if (!sessionReady || recovery)
        return; const renew = () => { void refresh(draft.session_id).catch(() => { }); }; window.addEventListener("focus", renew); return () => window.removeEventListener("focus", renew); }, [sessionReady, recovery, refresh, draft.session_id]);
    useEffect(() => {
        if (!loaded || !resolved.current || recovery || submitting.current || !draft.session_id)
            return;
        const record:PhoneRecovery = { version: 2, owner: ownerId, updated: Date.now(), draft, step, manualTitle, area, priceText, photos: photos.map(({ id, state, blob }) => ({ id, state, blob })) };latestRecovery.current=record;
        const timer = setTimeout(() => { saveQueue.current = saveQueue.current.catch(() => { }).then(() => submitting.current ? undefined : writePostingRecovery(ownerId, record)).then(() => { if (mounted.current)
            {setSaveState("Saved on this device");setSavedRecord({draft,photos,step,manualTitle,area,priceText});} }).catch(() => { if (mounted.current)
            setSaveState("Could not save on this device. Keep this page open."); }); }, 350);
        return () => clearTimeout(timer);
    }, [loaded, recovery, ownerId, draft, step, manualTitle, area, priceText, photos]);
    // Flush the latest authorized record on route exit; never write a pending recovery or resurrect a submitted draft.
    useEffect(()=>()=>{const record=latestRecovery.current;if(!record||!resolved.current||submitting.current)return;saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>submitting.current?undefined:writePostingRecovery(record.owner,record)).catch(()=>{});},[]);
    function chooseRecovery(resume: boolean) { if (!recovery || resolved.current)
        return; resolved.current = true; const value = resume ? recovery : null; const session = value?.draft.session_id || crypto.randomUUID(); setDraft(value ? { ...value.draft, session_id: session } : { ...blankPhoneDraft(), session_id: session }); setPhotos(value?.photos.map(p => ({ ...p, state: p.state === "uploading" ? "failed" : p.state })) ?? []); setManualTitle(value?.manualTitle ?? false); setPriceText(value?.priceText ?? ""); setArea(value?.area ?? ""); setStep(0); setRecovery(null); void initializeSession(session); }
    function draftSubmission() { return { ...draft, title, price_paise: draft.trade === "giveaway" ? 0 : Math.round(Number(priceText) * 100), negotiable: draft.trade === "sell" && draft.negotiable, pin_code: draft.pin_code, city_id: draft.city_id, locality_id: draft.locality_id, media_ids: photos.filter(p => p.state === "ready").map(p => p.id), other_model: model?.other ? draft.other_model : "", warranty_until: draft.included.includes("Under warranty") ? draft.warranty_until : "" }; }
    function submission() { const data = form.current ? new FormData(form.current) : null; return { ...draftSubmission(), pin_code: String(data?.get("pin_code") ?? draft.pin_code), city_id: String(data?.get("city_id") ?? draft.city_id), locality_id: String(data?.get("locality_id") ?? draft.locality_id) }; }
    function getIssues() {
        const result = validatePhoneWizard(submission(), catalogue, photos, priceText);
        return { ...result, issues: result.issues.map(i => ({ ...i, message: ({ storage: "Choose storage.", condition: "Choose the condition that best fits.", ram: "Choose RAM or leave it unspecified." } as Record<string,string>)[i.field] ?? phoneValidationText("en", i.field, i.message) })) };
    }
    function navigate(target: number) {
        if (busy || maintenance) return;
        if (target <= step) { setStep(target); setIssues([]); return; }
        const blocked = getIssues().issues.filter(i => fieldStep(i.field) < target);
        setIssues(blocked);
        if (blocked.length) { focusField(blocked[0].field); return; }
        setStep(target);
    }
    // Focus in the same commit as step rendering. Timers can steal focus from a fast typist.
    useLayoutEffect(()=>{if(pendingFocus.current){focusPostingField(pendingFocus.current);pendingFocus.current=null;}else heading.current?.focus();},[step]);
    function focusField(field:string){const validation=getIssues().issues; const first=validation.find(i=>fieldStep(i.field)<fieldStep(field)); if(first) field=first.field; const nextStep=fieldStep(field);if(nextStep===step){focusPostingField(field);return;}pendingFocus.current=field;setStep(nextStep);}
    function next() { navigate(Math.min(5, step + 1)); }
    async function submit() {
        if (submitting.current || busy || maintenance || !sessionReady || recovery)
            return;
        const value = getIssues();
        if (value.issues.length || !value.parsed.success) {
            setIssues(value.issues);
            if (value.issues[0])
                focusField(value.issues[0].field);
            return;
        }
        submitting.current = true;
        setBusy(true);
        setMessage("");
        try {
            const r = await fetch("/api/post-ad/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value.parsed.data) });
            const result = await r.json();
            if (!r.ok) {
                if (Array.isArray(result.issues)) {
                    const safe = z.array(z.object({ field: z.string(), message: z.string() })).safeParse(result.issues);
                    if (safe.success)
                        setIssues(safe.data);
                }
                throw new Error(result.error);
            }
            const listingId = z.string().uuid().parse(result.listing_id);
            await saveQueue.current.catch(() => { });
            await writePostingRecovery(ownerId, null).catch(() => { });
            replace(`/account/listings/${listingId}/edit`);
        }
        catch (e) {
            submitting.current = false;
            setMessage(e instanceof Error ? e.message : "Submission could not be confirmed; retry with this same session.");
            await refresh(draft.session_id).catch(() => { });
        }
        finally {
            setBusy(false);
        }
    }
    const issue = (field: string) => issues.find(i => i.field === field)?.message;
    const error = (field: string) => issue(field) ? <p id={`mobile-${field}-error`} className={styles.error}><CircleAlert aria-hidden="true"/><span>{issue(field)}</span></p> : null;
    const attributes = (field: string) => ({ id: `mobile-${field}`, "aria-invalid": !!issue(field), "aria-describedby": issue(field) ? `mobile-${field}-error` : undefined });
    const field = (key: "other_model" | "warranty_until" | "description", label: string, node: React.ReactNode) => <div><label htmlFor={`mobile-${key}`}>{label}{node}</label>{error(key)}</div>;
    if (!loaded)
        return <p role="status">Checking for a saved listing…</p>;
    if (recovery)
        return <section className={styles.card} aria-labelledby="resume-heading"><h1 id="resume-heading">Pick up where you left off?</h1><p>A phone listing is saved on this device. It is not synced to your account.</p><div className={styles.choices}><button className={styles.primary} type="button" onClick={() => chooseRecovery(true)}>Resume saved listing</button><button className={styles.button} type="button" onClick={() => chooseRecovery(false)}>Start fresh</button></div></section>;
    const reachable = reachablePhoneStep(validatePhoneWizard(draftSubmission(), catalogue, photos, priceText).issues);
    const price = draft.trade === "giveaway" ? "Free" : priceText && Number.isFinite(Number(priceText)) ? `₹${Number(priceText).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Your price";
    return <div className={step === 5 ? styles.reviewing : undefined} lang="en"><p className={styles.eyebrow}>MOBILE PHONES · {step === 5 ? "REVIEW" : `STEP ${step + 1} OF 5`}</p><h1 className={styles.wizardHeading} ref={heading} tabIndex={-1}>{step === 5 ? "Ready for a second life?" : "Your next owner is out there."}</h1>
 {maintenance && <p role="alert" className={styles.errorBox}>{maintenanceMessage ?? "Posting is temporarily unavailable. Your saved details are safe."}</p>}{message && <p role="alert" className={styles.errorBox}>{phoneErrorText("en", message)}</p>}
 {sessionState === "initializing" && <p role="status">Preparing photo upload…</p>}{sessionState === "failed" && <button type="button" className={styles.button} onClick={async () => { if (retryInFlight.current)
        return; retryInFlight.current = true; setMessage(""); try {
        await initializeSession(draft.session_id);
    }
    finally {
        retryInFlight.current = false;
    } }}>Retry photo upload</button>}

 <div className={styles.columns}><div><ol className={styles.steps} aria-label="Posting steps">{STEP_LABELS.map((label, i) => <li key={label}><button type="button" disabled={busy || maintenance} aria-disabled={i > step && i > reachable} data-complete={i < reachable} aria-label={`Step ${i + 1}: ${label}`} aria-current={step === i ? "step" : undefined} onClick={() => navigate(i)}><b>{i < reachable ? <><Check aria-hidden="true" size={18}/><span className="sr-only">Completed</span></> : i + 1}</b><span>{label}</span></button></li>)}</ol>
 {issues.length > 0 && <div role="alert" className={styles.errorBox}><strong>Check the highlighted details</strong>{issues.map(i => <button type="button" key={i.field} onClick={() => focusField(i.field)}>{i.message}</button>)}</div>}
 <form ref={form} noValidate onSubmit={e => { e.preventDefault(); if (step < 5)
        next(); }}><fieldset disabled={busy || maintenance} className="min-w-0">
 <section {...attributes("media_ids")} tabIndex={-1} className={styles.card} style={{ display: step === 0 ? undefined : "none" }} aria-label="Photos">{sessionReady ? <PreListingMediaUploader photos={photos} onChange={p => { setPhotos(p); clearIssue("media_ids"); }} sessionId={draft.session_id} disabled={busy || maintenance || frozen} onReady={() => refresh(draft.session_id)}/> : <p className={styles.muted}>Your photos will be available when the photo session is ready.</p>}{error("media_ids")}</section>
 <section className={styles.card} style={{ display: step === 1 ? undefined : "none" }} aria-label="Phone details"><h2>Which phone is it?</h2><p className={styles.muted}>Choose the details printed on your phone or its box.</p><SearchCombobox id="mobile-brand_id" label="Brand" options={catalogue.brands} value={draft.brand_id} error={issue("brand_id")} onChange={id => { setDraft(d => ({ ...d, brand_id: id, model_id: "", other_model: "" })); clearIssue("brand_id"); clearIssue("model_id"); }}/>{error("brand_id")}<div className={styles.choices} aria-label="Popular brands">{catalogue.brands.slice(0, 3).map(b => <button type="button" key={b.id} className={`${styles.button} ${draft.brand_id === b.id ? styles.selected : ""}`} aria-pressed={draft.brand_id === b.id} onClick={() => { setDraft(d => ({ ...d, brand_id: b.id, model_id: "", other_model: "" })); clearIssue("brand_id"); }}>{b.name}</button>)}</div><SearchCombobox id="mobile-model_id" label="Model" options={catalogue.models.filter(m => m.brand_id === draft.brand_id)} value={draft.model_id} disabled={!draft.brand_id} error={issue("model_id")} onChange={id => { update("model_id", id); update("other_model", ""); }}/>{error("model_id")}{model?.other && field("other_model", "Model name", <input {...attributes("other_model")} maxLength={100} value={draft.other_model} onChange={e => update("other_model", e.target.value)}/>)}<div className={styles.pair}><div><label htmlFor="mobile-storage">Storage<select {...attributes("storage")} value={draft.storage} onChange={e => update("storage", e.target.value as PhoneDraft["storage"])}><option value="">Choose storage</option>{STORAGE.map(s => <option key={s}>{s}</option>)}</select></label>{error("storage")}</div><div><label htmlFor="mobile-ram">RAM (optional)<select {...attributes("ram")} value={draft.ram} onChange={e => update("ram", e.target.value as PhoneDraft["ram"])}><option value="">Not specified</option>{RAM.map(s => <option key={s}>{s}</option>)}</select></label>{error("ram")}</div></div><small className={styles.muted}>Specs are seller-declared. Choose the configuration of your device.</small></section>
 <section className={styles.card} style={{ display: step === 2 ? undefined : "none" }} aria-label="Condition and description"><h2>A little honesty goes a long way.</h2><div {...attributes("condition")} tabIndex={-1} role="group" aria-label="Condition">{Object.entries(CONDITIONS).map(([v, label]) => <button type="button" key={v} className={`${styles.button} ${styles.condition} ${draft.condition === v ? styles.selected : ""}`} aria-pressed={draft.condition === v} onClick={() => update("condition", v as PhoneDraft["condition"])}>{label}{draft.condition === v ? <Check size={20} aria-hidden="true"/> : <Circle size={20} aria-hidden="true"/>}</button>)}</div>{error("condition")}<fieldset><legend>What’s included? (seller-declared)</legend><div className={styles.accessories}>{INCLUDED.map(item => <button key={item} type="button" className={`${styles.button} ${draft.included.includes(item) ? styles.selected : ""}`} aria-pressed={draft.included.includes(item)} onClick={() => { setDraft(d => ({ ...d, included: d.included.includes(item) ? d.included.filter(i => i !== item) : [...d.included, item], warranty_until: item === "Under warranty" && d.included.includes(item) ? "" : d.warranty_until })); clearIssue("warranty_until"); }}>{draft.included.includes(item) && <Check size={18} aria-hidden="true"/>}{item}</button>)}</div></fieldset>{draft.included.includes("Under warranty") && field("warranty_until", "Warranty expiry month / year", <input {...attributes("warranty_until")} type="month" min={new Date().toISOString().slice(0, 7)} value={draft.warranty_until} onChange={e => update("warranty_until", e.target.value)}/>)}<div><label htmlFor="mobile-title">Title<input {...attributes("title")} maxLength={150} value={title} onChange={e => { setManualTitle(true); update("title", e.target.value); }}/></label>{error("title")}<button type="button" className={styles.back} onClick={() => { setManualTitle(false); clearIssue("title"); }}><RotateCcw size={16} aria-hidden="true"/>Use automatically generated title</button></div>{field("description", "Description", <textarea {...attributes("description")} rows={5} maxLength={5000} value={draft.description} placeholder="Battery health, repairs, visible wear and why you’re selling…" onChange={e => update("description", e.target.value)}/>)}<p className={styles.muted}>10–5,000 characters. Keep contact and payment details in FairSwap chat.</p></section>
 <section className={styles.card} style={{ display: step === 3 ? undefined : "none" }} aria-label="Price"><h2>Make it a fair deal.</h2><div className={styles.choices} role="group" aria-label="Trade type">{(["sell", "giveaway"] as const).map(v => <button type="button" key={v} className={`${styles.button} ${draft.trade === v ? styles.selected : ""}`} aria-pressed={draft.trade === v} onClick={() => { setDraft(d => ({ ...d, trade: v, negotiable: v === "giveaway" ? false : d.negotiable })); clearIssue("price_paise"); }}>{v === "sell" ? "Sell" : "Give away"}</button>)}</div>{draft.trade === "sell" ? <><div><label htmlFor="mobile-price_paise">Price (₹)<input {...attributes("price_paise")} inputMode="decimal" value={priceText} maxLength={20} onChange={e => { setPriceText(e.target.value); clearIssue("price_paise"); }}/></label>{error("price_paise")}<p className={styles.price}>{price}</p></div><button type="button" role="switch" aria-checked={draft.negotiable} className={styles.switch} onClick={() => update("negotiable", !draft.negotiable)}><span>Negotiable</span><span className={styles.track} aria-hidden="true"><span /></span></button></> : <p className={styles.notice}>Your listing will show “Free”. No asking price or negotiation is needed.</p>}</section>
 <section className={`${styles.card} ${styles.location}`} style={{ display: step === 4 ? undefined : "none" }} aria-label="Location"><h2>Find someone nearby.</h2><PincodeLocationPicker validationErrors={{ pin_code: issue("pin_code"), city_id: issue("city_id"), locality_id: issue("locality_id") }} key={`${ownerId}-${draft.session_id}`} locale="en" hideLandmark onResolvedChange={locationChanged} cities={cities} initialPinCode={draft.pin_code} initialCityId={draft.city_id} initialLocalityId={draft.locality_id}/>{error("pin_code")}{error("city_id")}{error("locality_id")}</section>
 {step === 5 && <section className={styles.card} aria-label="Submission review"><h2>Review your listing</h2><p>Check your photos and details in the buyer preview.</p><fieldset><legend>Listing plan</legend><label className="flex min-h-12 items-center gap-3"><input type="radio" name="plan_id" value="free-v1" checked readOnly style={{ width: 20, minHeight: 20 }}/>Free — submit your listing for review</label></fieldset><p className={styles.muted}>Pickup only. FairSwap does not currently verify IMEI or device authenticity.</p>{STEP_LABELS.map((label, i) => <button type="button" key={label} className={styles.button} onClick={() => setStep(i)}>Edit {label}</button>)}</section>}
 </fieldset></form></div><MobileBuyerPreview title={title} price={price} description={draft.description} area={area} photos={photos} facts={[draft.condition ? CONDITIONS[draft.condition] : "", draft.storage, draft.ram ? `${draft.ram} RAM` : "", draft.trade === "sell" && draft.negotiable ? "Negotiable" : ""]}/></div>
 <aside className={styles.safety}><ShieldAlert aria-hidden="true" size={22}/><p>To receive money, you never need to enter a UPI PIN, scan a payment QR code or share an OTP.</p></aside>
 {frozen && <p role="status" className={styles.notice}>Your photos are prepared for submission. Retry the same submission to complete it.</p>}
 <footer className={styles.footer}><div><span className={styles.save} role="status">{saveState.startsWith("Could not")?saveState:savedCurrent?"Saved on this device":"Saving on this device…"}</span><button type="button" className={styles.button} disabled={busy} onClick={() => { if (step === 0) {
        push("/account/listings/new");
        return;
    } setStep(s => Math.max(0, s - 1)); setIssues([]);  }}><ArrowLeft size={18} aria-hidden="true"/>Back</button><button type="button" className={styles.primary} disabled={busy || maintenance || (step === 5 && !sessionReady)} onClick={() => step === 5 ? void submit() : next()}>{busy ? "Submitting…" : step === 5 ? "Submit for review" : step === 4 ? "Review listing" : "Continue"}{step < 5 && <ArrowRight size={18} aria-hidden="true"/>}</button></div></footer>
 </div>;
}
