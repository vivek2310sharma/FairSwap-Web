"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, RotateCcw, ShieldAlert } from "lucide-react";
import type { City } from "@/types/listing";
import { CONDITIONS, INCLUDED, RAM, STORAGE, OTHER_TABLET_BRAND, CONNECTIVITY, SCREEN, BATTERY, LOCK, selectPostingCategory, type TabletCatalogue } from "@/lib/listings/tablets/contract";
import { readPostingRecovery, writePostingRecovery } from "@/lib/listings/posting-recovery";
import { phoneValidationText, phoneErrorText } from "@/lib/listings/mobiles/locale";
import PincodeLocationPicker from "./PincodeLocationPicker";
import PreListingMediaUploader, { type PostingPhoto } from "./PreListingMediaUploader";
import SearchCombobox from "./posting/SearchCombobox";
import MobileBuyerPreview from "./posting/MobileBuyerPreview";
import { STEP_LABELS, validateTabletStep, validateTabletWizard, reachableTabletStep, blankTabletDraft, generatedTabletTitle, tabletRecoverySchema, fieldStep, type TabletDraft, type TabletRecovery } from "./posting/tablet-wizard";
import { PostingSessionError, sessionErrors, sessionFailure, sessionRecoveryChoicesSchema, type SessionErrorCode, type SessionRecoveryChoice } from "@/lib/listings/mobiles/session-errors";
function canPrepareBlankSession(draft:TabletDraft,photos:unknown[],price:string,manual:boolean,area:string){const blank=blankTabletDraft();return !photos.length&&!price&&!manual&&!area&&(Object.keys(blank) as (keyof TabletDraft)[]).every(k=>k==="session_id"||JSON.stringify(draft[k])===JSON.stringify(blank[k]));}
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
export default function TabletForm({ catalogue, ownerId, cities, maintenance = false, maintenanceMessage }: {
    catalogue: TabletCatalogue;
    ownerId: string;
    cities: City[];
    maintenance?: boolean;
    maintenanceMessage?: string;
}) {
    const { replace, push } = useRouter();
    const form = useRef<HTMLFormElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const pendingFocus = useRef<string|null>(null);
    const [draft, setDraft] = useState<TabletDraft>(blankTabletDraft);
    const [photos, setPhotos] = useState<PostingPhoto[]>([]);
    const [manualTitle, setManualTitle] = useState(false);
    const [step, setStep] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [recovery, setRecovery] = useState<TabletRecovery | null>(null);
    const [sessionState, setSessionState] = useState<"idle" | "initializing" | "ready" | "failed">("idle");
    const [sessionCode, setSessionCode] = useState<SessionErrorCode | null>(null);
    const [sessionChoices, setSessionChoices] = useState<SessionRecoveryChoice[]>([]);
    const [releaseChoice, setReleaseChoice] = useState<string | null>(null);
    const [sessionAction, setSessionAction] = useState(false);
    const [replaceExpired, setReplaceExpired] = useState(false);
    const preparedSession = useRef<{nonce:string;id:string}|null>(null);
    const preparation = useRef<{nonce:string;promise:Promise<void>}|null>(null);
    const releaseInFlight = useRef(false);
    const initialization = useRef<{id:string;promise:Promise<string|null>} | null>(null);
    const [frozen, setFrozen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [issues, setIssues] = useState<Issue[]>([]);
    const [area, setArea] = useState("");
    const [priceText, setPriceText] = useState("");
    const [saveState, setSaveState] = useState("Saving on this device…");
    const [savedRecord, setSavedRecord] = useState<{draft:TabletDraft;photos:PostingPhoto[];step:number;manualTitle:boolean;area:string;priceText:string}|null>(null);
    const savedCurrent = savedRecord?.draft===draft&&savedRecord.photos===photos&&savedRecord.step===step&&savedRecord.manualTitle===manualTitle&&savedRecord.area===area&&savedRecord.priceText===priceText;
    const sessionReady = sessionState === "ready";
    const retryInFlight = useRef(false);
    const submitting = useRef(false);
    const resolved = useRef(false);
    const mounted = useRef(true);
    const activeSession = useRef("");
    const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
    const latestRecovery = useRef<TabletRecovery|null>(null);
    const brand = catalogue.brands.find(b => b.id === draft.brand_id);
    const model = catalogue.models.find(m => m.id === draft.model_id && m.brand_id === draft.brand_id);
    const otherBrand = brand?.name === OTHER_TABLET_BRAND;
    const brandName = otherBrand ? draft.other_brand?.trim() || "" : brand?.name ?? "";
    const modelName = model?.other ? draft.other_model.trim() : model?.name ?? "";
    const storage = draft.storage_other ?? draft.storage;
    const title = manualTitle ? draft.title : generatedTabletTitle(brandName, modelName, storage, draft.connectivity);
    const clearIssue = (field: string) => setIssues(current => current.filter(i => i.field !== field));
    const update = <K extends keyof TabletDraft>(key: K, value: TabletDraft[K]) => { setDraft(d => ({ ...d, [key]: value })); clearIssue(key); };
    const locationChanged = useCallback((v: {
        pin_code: string;
        city_id: string;
        locality_id: string;
        area: string;
    }) => { setDraft(d => d.pin_code === v.pin_code && d.city_id === v.city_id && d.locality_id === v.locality_id ? d : { ...d, pin_code: v.pin_code, city_id: v.city_id, locality_id: v.locality_id }); setArea(v.area); }, [setDraft, setArea]);
    const refresh = useCallback(async (session: string) => {
        const bound = await fetch(`/api/post-ad/tablets/sessions?session_id=${session}`, {cache:"no-store"}); if(!bound.ok)throw sessionFailure(await bound.json());
        const r = await fetch(`/api/post-ad/sessions/${session}/media`, { cache: "no-store" });
        const data = await r.json();
        if (!r.ok)
            throw sessionFailure(data);
        const remote = z.object({ session: z.object({ state: z.string(), listing_id: z.string().uuid().optional() }), media: z.array(z.object({ id: z.string().uuid(), state: z.enum(["uploading", "ready", "removed"]), url: z.string().nullable() })) }).parse(data);
        if (!mounted.current || activeSession.current !== session)
            return;
        setFrozen(remote.session.state === "finalizing");
        setPhotos(current => {
            const removed = new Set(remote.media.filter(p => p.state === "removed").map(p => p.id));
            const merged = current.filter(p => !removed.has(p.id)).map(p => { const found = remote.media.find(m => m.id === p.id); return found?.state === "ready" ? { ...p, state: "ready" as const, url: found.url ?? undefined } : p.state === "ready" ? { ...p, state: "failed" as const, error: "Photo not confirmed. Retry or add it again." } : p; });
            for (const p of remote.media)
                if (p.state !== "removed" && !merged.some(m => m.id === p.id))
                    merged.push({ id: p.id, state: p.state === "ready" ? "ready" : "failed", url: p.url ?? undefined });
            return merged;
        });
        return remote.session;
    }, [setPhotos, setFrozen]);
    const loadSessionChoices = useCallback(async () => {
        const response = await fetch("/api/post-ad/tablets/sessions", {cache:"no-store"});
        const data = await response.json();
        if (!response.ok) throw sessionFailure(data);
        const parsed = sessionRecoveryChoicesSchema.parse(data);
        if (mounted.current) setSessionChoices(parsed.sessions);
    }, []);
    function prepareBlankSession(): Promise<void> {
        const nonce=draft.session_id;
        if (preparation.current?.nonce===nonce) return preparation.current.promise;
        if (sessionState!=="idle" || busy || maintenance || !canPrepareBlankSession(draft,photos,priceText,manualTitle,area) || preparedSession.current?.nonce===nonce) return Promise.resolve();
        const promise=(async()=>{
            setSessionState("initializing");
            try {
                const response=await fetch("/api/post-ad/tablets/sessions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:nonce,operation:"create_empty"})});
                const data=await response.json();if(!response.ok)throw sessionFailure(data);
                const id=z.string().uuid().parse(data.session?.id);
                if(!mounted.current || activeSession.current!==nonce)return;
                // This unclaimed ID NEVER enters IndexedDB or the draft. Cancel is safely rotatable.
                preparedSession.current={nonce,id};setSessionState("idle");
            } catch(error) {
                if(!mounted.current || activeSession.current!==nonce)return;
                const failure=error instanceof PostingSessionError?error:sessionFailure(null);
                setSessionState("failed");setSessionCode(failure.code);setMessage(failure.message);
                if(failure.code==="UPLOAD_SESSION_LIMIT")await loadSessionChoices().catch(()=>{});
            }
        })();
        preparation.current={nonce,promise};void promise.finally(()=>{if(preparation.current?.promise===promise)preparation.current=null;});return promise;
    }
    const initializeSession = useCallback((session: string): Promise<string|null> => {
        if (initialization.current?.id === session) return initialization.current.promise;
        const promise = (async () => {
            let activeId = session;
            activeSession.current = session;
            setSessionState("initializing"); setSessionCode(null);
            try {
                selectPostingCategory(blankTabletDraft().selection, catalogue);
                if (preparation.current?.nonce === session) await preparation.current.promise;
                // Persist the chosen id before allocation, so a lost response retries that id.
                await saveQueue.current.catch(() => {});
                const record = latestRecovery.current;
                if (record?.owner === ownerId && record.draft.session_id === session) {
                    saveQueue.current = saveQueue.current.catch(() => {}).then(() => submitting.current ? undefined : writePostingRecovery(`${ownerId}:tablets-v1`,record));
                    await saveQueue.current.catch(() => { if (mounted.current) setSaveState("Could not save on this device. Keep this page open."); });
                }
                if (!mounted.current || activeSession.current !== session) return null;
                const prepared=preparedSession.current?.nonce===session?preparedSession.current:null;
                const r = await fetch("/api/post-ad/tablets/sessions", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(prepared?{session_id:prepared.id,operation:"claim_draft"}:{session_id:session,operation:"acquire_draft"})});
                const data = await r.json();
                if (!r.ok) throw sessionFailure(data);
                if (!mounted.current || activeSession.current !== session) return null;
                if (data.session?.state === "submitted") {
                    submitting.current = true;
                    await saveQueue.current.catch(() => {}); await writePostingRecovery(`${ownerId}:tablets-v1`,null).catch(() => {});
                    replace(`/account/listings/${z.string().uuid().parse(data.session.listing_id)}/edit`);
                    return null;
                }
                const resolvedId=z.string().uuid().parse(data.session?.id??session);
                if (prepared || resolvedId!==session) {
                    const claimedId=resolvedId;
                    if((prepared && claimedId!==prepared.id) || data.session?.draft_protected!==true)throw sessionFailure(null);
                    activeId=claimedId;activeSession.current=claimedId;
                    const latest=latestRecovery.current;
                    if(latest?.owner===ownerId && latest.draft.session_id===session){
                        const claimed={...latest,draft:{...latest.draft,session_id:claimedId}};
                        latestRecovery.current=claimed;
                        saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>submitting.current?undefined:writePostingRecovery(`${ownerId}:tablets-v1`,claimed));
                        await saveQueue.current.catch(()=>{if(mounted.current)setSaveState("Could not save on this device. Keep this page open.");});
                    }
                    setDraft(current=>current.session_id===session?{...current,session_id:claimedId}:current);
                    preparedSession.current=null;
                }
                await refresh(activeId);
                if (mounted.current && activeSession.current === activeId) { setSessionState("ready"); setMessage(""); return activeId; }
            } catch (error) {
                if (mounted.current && activeSession.current === activeId) {
                    const failure = error instanceof PostingSessionError ? error : sessionFailure(null);
                    setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message);
                    if (failure.code === "UPLOAD_SESSION_LIMIT") await loadSessionChoices().catch(() => {});
                }
            }
            return null;
        })();
        initialization.current = {id:session,promise};
        void promise.finally(() => { if (initialization.current?.promise === promise) initialization.current = null; });
        return promise;
    }, [catalogue, ownerId, refresh, replace, loadSessionChoices]);
    async function restoreSession(session: string) {
        activeSession.current = session; setSessionState("initializing");
        try {
            const remote = await refresh(session);
            if (!mounted.current || activeSession.current !== session || !remote) return;
            if (remote.state === "submitted" && remote.listing_id) {
                submitting.current = true; await saveQueue.current.catch(() => {}); await writePostingRecovery(`${ownerId}:tablets-v1`,null).catch(() => {});
                replace(`/account/listings/${remote.listing_id}/edit`); return;
            }
            setSessionState("ready");
        } catch (error) {
            if (!mounted.current || activeSession.current !== session) return;
            const failure = error instanceof PostingSessionError ? error : sessionFailure(null);
            // A locally saved UUID may never have been allocated. Only an explicit upload creates it.
            setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message);
        }
    }
    async function releaseSession() {
        if (!releaseChoice || releaseInFlight.current) return;
        releaseInFlight.current = true; setSessionAction(true);
        try {
            const response = await fetch("/api/post-ad/tablets/sessions", {method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:releaseChoice})});
            const data = await response.json(); if (!response.ok) throw sessionFailure(data);
            setReleaseChoice(null); setSessionCode(null); setSessionState("idle");
            setMessage("Unused photo session released. Retry your photo upload to continue.");
            await loadSessionChoices();
        } catch (error) {
            const failure = error instanceof PostingSessionError ? error : sessionFailure(null);
            setSessionCode(failure.code); setMessage(failure.message);
            await loadSessionChoices().catch(() => {});
        } finally { releaseInFlight.current = false; setSessionAction(false); }
    }
    function restartExpiredSession() {
        const session = crypto.randomUUID(); activeSession.current = session; preparedSession.current=null;
        setDraft(d => ({...d,session_id:session,media_ids:[]}));
        setPhotos(current => current.filter(p => p.blob).map(p => ({...p,id:crypto.randomUUID(),state:"pending",error:undefined})));
        setFrozen(false); setStep(0); setIssues([]); setSessionCode(null); setSessionState("idle"); setReplaceExpired(false);
        setMessage("Your listing details are retained. Upload the photos into the new session; previous server photos follow their existing expiry policy.");
    }
    useEffect(() => {
        mounted.current = true;
        let cancelled = false;
        async function init() {
            let found: TabletRecovery | null = null;
            try {
                const p = tabletRecoverySchema.safeParse(await readPostingRecovery(`${ownerId}:tablets-v1`));
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
            setDraft({ ...blankTabletDraft(), session_id: session });
            activeSession.current = session;
        }
        void init();
        return () => { cancelled = true; mounted.current = false; };
    }, [ownerId]);
    useEffect(() => { if (!sessionReady || recovery)
        return; const renew = () => { void refresh(draft.session_id).catch(error => { if (!mounted.current) return; const failure = error instanceof PostingSessionError ? error : sessionFailure(null); setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message); }); }; window.addEventListener("focus", renew); return () => window.removeEventListener("focus", renew); }, [sessionReady, recovery, refresh, draft.session_id]);
    useEffect(() => {
        if (!loaded || !resolved.current || recovery || submitting.current || !draft.session_id)
            return;
        const record:TabletRecovery = { version: 1, owner: ownerId, updated: Date.now(), draft, step, manualTitle, area, priceText, photos: photos.map(({ id, state, blob }) => ({ id, state, blob })) };latestRecovery.current=record;
        const timer = setTimeout(() => { saveQueue.current = saveQueue.current.catch(() => { }).then(() => submitting.current || latestRecovery.current!==record ? undefined : writePostingRecovery(`${ownerId}:tablets-v1`, record)).then(() => { if (mounted.current)
            {setSaveState("Saved on this device");setSavedRecord({draft,photos,step,manualTitle,area,priceText});} }).catch(() => { if (mounted.current)
            setSaveState("Could not save on this device. Keep this page open."); }); }, 350);
        return () => clearTimeout(timer);
    }, [loaded, recovery, ownerId, draft, step, manualTitle, area, priceText, photos]);
    // Flush the latest authorized record on route exit; never write a pending recovery or resurrect a submitted draft.
    useEffect(()=>()=>{const record=latestRecovery.current;if(!record||!resolved.current||submitting.current)return;saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>submitting.current?undefined:writePostingRecovery(`${record.owner}:tablets-v1`,record)).catch(()=>{});},[]);
    function chooseRecovery(resume: boolean) { if (!recovery || resolved.current)
        return; resolved.current = true; const value = resume ? recovery : null; const session = value?.draft.session_id || crypto.randomUUID(); setDraft(value ? { ...blankTabletDraft(), ...value.draft, session_id: session } : { ...blankTabletDraft(), session_id: session }); setPhotos(value?.photos.map(p => ({ ...p, state: p.state === "uploading" ? "failed" : p.state })) ?? []); setManualTitle(value?.manualTitle ?? false); setPriceText(value?.priceText ?? ""); setArea(value?.area ?? ""); setStep(0); setRecovery(null); setSessionCode(null); setSessionState("idle"); setMessage(""); activeSession.current = session; if (value?.photos.some(p => p.state !== "pending")) void restoreSession(session); }
    function draftSubmission() { return { ...draft, other_brand: otherBrand ? draft.other_brand ?? "" : "", title, price_paise: draft.trade === "giveaway" ? 0 : Math.round(Number(priceText) * 100), negotiable: draft.trade === "sell" && draft.negotiable, pin_code: draft.pin_code, city_id: draft.city_id, locality_id: draft.locality_id, media_ids: photos.filter(p => p.state === "ready").map(p => p.id), other_model: model?.other ? draft.other_model : "", warranty_until: draft.included.includes("Under warranty") ? draft.warranty_until : "" }; }
    function submission() { const data = form.current ? new FormData(form.current) : null; return { ...draftSubmission(), pin_code: String(data?.get("pin_code") ?? draft.pin_code), city_id: String(data?.get("city_id") ?? draft.city_id), locality_id: String(data?.get("locality_id") ?? draft.locality_id) }; }
    const localizeIssues = (values: Issue[]) => values.map(i => ({ ...i, message: i.message.startsWith("Invalid") ? ({storage:"Choose storage.",condition:"Choose the condition that best fits.",ram:"Choose RAM or leave it unspecified.",connectivity:"Choose connectivity.",screen_touch_status:"Declare the screen and touch status.",battery_charging_status:"Declare the battery and charging status.",transfer_lock_status:"Declare whether account and organization locks are cleared.",hardware_model_number:"Use a hardware model number such as A2696; leave serial numbers out."} as Record<string,string>)[i.field] ?? phoneValidationText("en",i.field,i.message) : phoneValidationText("en",i.field,i.message) }));
    function getIssues() {
        const result = validateTabletWizard(submission(), catalogue, photos, priceText);
        return { ...result, issues: localizeIssues(result.issues) };
    }
    function showIssues(values: Issue[]) {
        const first = values[0];
        setIssues(first ? values.filter(i => fieldStep(i.field) === fieldStep(first.field)) : []);
        if (first) focusField(first.field);
    }
    function navigate(target: number) {
        // Native disabled blocks pointer/keyboard activation; guard synthetic/stale events too.
        if (busy || maintenance || (target > step && (!sessionReady || target > reachable))) return;
        setStep(target); setIssues([]);
    }
    // Focus in the same commit as step rendering. Timers can steal focus from a fast typist.
    useLayoutEffect(()=>{if(pendingFocus.current){focusPostingField(pendingFocus.current);pendingFocus.current=null;}else heading.current?.focus();},[step]);
    function focusField(field: string) {
        const nextStep = fieldStep(field);
        if (nextStep === step) { focusPostingField(field); return; }
        pendingFocus.current = field; setStep(nextStep);
    }
    function next() {
        if (busy || maintenance || !sessionReady) return;
        const current = step === 4 ? getIssues().issues : localizeIssues(validateTabletStep(step, submission(), catalogue, photos, priceText));
        if (current.length) { showIssues(current); return; }
        // A background media refresh can invalidate an earlier step while editing.
        if (reachable < step) { showIssues(getIssues().issues); return; }
        setIssues([]); setStep(Math.min(5, step + 1));
    }
    async function submit() {
        if (submitting.current || busy || maintenance || !sessionReady || recovery)
            return;
        const value = getIssues();
        if (value.issues.length || !value.parsed.success) {
            showIssues(value.issues);
            return;
        }
        submitting.current = true;
        setBusy(true);
        setMessage("");
        try {
            const r = await fetch("/api/post-ad/tablets/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value.parsed.data) });
            const result = await r.json();
            if (!r.ok) {
                if (Array.isArray(result.issues)) {
                    const safe = z.array(z.object({ field: z.string(), message: z.string() })).safeParse(result.issues);
                    if (safe.success)
                        showIssues(safe.data.slice().sort((a,b) => fieldStep(a.field)-fieldStep(b.field)));
                }
                throw new Error(result.error);
            }
            const listingId = z.string().uuid().parse(result.listing_id);
            await saveQueue.current.catch(() => { });
            await writePostingRecovery(`${ownerId}:tablets-v1`, null).catch(() => { });
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
    const error = (field: string) => issue(field) ? <p id={`mobile-${field}-error`} role="alert" className={styles.error}><CircleAlert aria-hidden="true"/><span>{issue(field)}</span></p> : null;
    const attributes = (field: string) => ({ id: `mobile-${field}`, "aria-invalid": !!issue(field), "aria-describedby": issue(field) ? `mobile-${field}-error` : undefined });
    const field = (key: keyof TabletDraft, label: string, node: React.ReactNode) => <div><label htmlFor={`mobile-${key}`}>{label}{node}</label>{error(key)}</div>;
    const select = <K extends keyof TabletDraft>(key:K,label:string,options:Record<string,string>) => field(key,label,<select {...attributes(key)} value={String(draft[key])} onChange={e=>update(key,e.target.value as TabletDraft[K])}><option value="">Choose an answer</option>{Object.entries(options).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>);
    if (!loaded)
        return <p role="status">Checking for a saved listing…</p>;
    if (recovery)
        return <section className={styles.card} aria-labelledby="resume-heading"><h1 id="resume-heading">Pick up where you left off?</h1><p>A tablet listing is saved on this device. It is not synced to your account.</p><div className={styles.choices}><button className={styles.primary} type="button" onClick={() => chooseRecovery(true)}>Resume saved listing</button><button className={styles.button} type="button" onClick={() => chooseRecovery(false)}>Start fresh</button></div></section>;
    const brandOptions = catalogue.brands
        .map(option => option.name === OTHER_TABLET_BRAND
            ? { ...option, name: "Other Brand", alwaysVisible: true }
            : option)
        .sort((a, b) => Number("alwaysVisible" in a) - Number("alwaysVisible" in b));
    const modelOptions = catalogue.models.filter(option => option.brand_id === draft.brand_id)
        .map(option => ({ ...option, alwaysVisible: option.other }))
        .sort((a, b) => Number(a.other) - Number(b.other));
    function chooseBrand(id: string) {
        const selected = catalogue.brands.find(option => option.id === id);
        const fallback = selected?.name === OTHER_TABLET_BRAND
            ? catalogue.models.find(option => option.brand_id === id && option.other)
            : undefined;
        setDraft(current => current.brand_id === id ? current : {
            ...current, brand_id: id, other_brand: "", model_id: fallback?.id ?? "", other_model: "",
        });
        setIssues(current => current.filter(issue => !["brand_id", "other_brand", "model_id", "other_model"].includes(issue.field)));
    }
    function chooseModel(id: string) {
        setDraft(current => current.model_id === id ? current : { ...current, model_id: id, other_model: "" });
        setIssues(current => current.filter(issue => !["model_id", "other_model"].includes(issue.field)));
    }
    const textField = (key: "other_brand" | "other_model" | "storage_other" | "ram_other" | "connectivity_other", label: string, maxLength: number) =>
        field(key, label, <input {...attributes(key)} maxLength={maxLength} value={draft[key] ?? ""} onChange={event => update(key, event.target.value)}/>);
    function specField(
        key: "storage" | "ram" | "connectivity", label: string, placeholder: string,
        options: Record<string, string>, fallback: "Not sure" | "" | "unknown",
    ) {
        const custom = `${key}_other` as const;
        return field(key, label, <select {...attributes(key)} value={draft[custom] === undefined ? draft[key] : "other"} onChange={event => {
            const value = event.target.value;
            setDraft(current => ({
                ...current, [key]: value === "other" ? fallback : value, [custom]: value === "other" ? "" : undefined,
            }));
            setIssues(current => current.filter(issue => issue.field !== key && issue.field !== custom));
        }}>
            <option value="">{placeholder}</option>
            {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            <option value="other">Other</option>
        </select>);
    }
    const reachable = reachableTabletStep(validateTabletWizard(draftSubmission(), catalogue, photos, priceText).issues);
    const price = draft.trade === "giveaway" ? "Free" : priceText && Number.isFinite(Number(priceText)) ? `₹${Number(priceText).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Your price";
    return <div className={step === 5 ? styles.reviewing : undefined} lang="en"><p className={styles.eyebrow}>TABLETS · {step === 5 ? "REVIEW" : `STEP ${step + 1} OF 5`}</p><h1 className={styles.wizardHeading} ref={heading} tabIndex={-1}>{step === 5 ? "Ready for a second life?" : "Your next owner is out there."}</h1>
 {maintenance && <p role="alert" className={styles.errorBox}>{maintenanceMessage ?? "Posting is temporarily unavailable. Your saved details are safe."}</p>}{message && <p role="alert" className={styles.errorBox}>{phoneErrorText("en", message)}</p>}
 {sessionState === "initializing" && <p role="status">Preparing photo upload…</p>}{sessionState === "failed" && <button type="button" className={styles.button} onClick={async () => { if (retryInFlight.current)
        return; retryInFlight.current = true; setMessage(""); try {
        await initializeSession(draft.session_id);
    }
    finally {
        retryInFlight.current = false;
    } }}>Retry photo upload</button>}


 {sessionState === "idle" && <p className={styles.muted}>Choose photos, then upload them to continue.</p>}
 {(sessionCode === "UPLOAD_SESSION_LIMIT" || sessionCode === "UPLOAD_SESSION_PROTECTED") && <section className={styles.card} aria-label="Photo session recovery"><h2>Recover photo session capacity</h2><p>Review only a photo-free session you no longer need, including on another tab or device. A session without photos can still have a local draft. Sessions with any photo history or a submission in progress are protected. No photos or saved listing details will be deleted here.</p><button type="button" className={styles.button} disabled={sessionAction} onClick={() => void loadSessionChoices().catch(() => setMessage("Could not refresh session choices. Retry shortly."))}>Refresh session choices</button><ul>{sessionChoices.map(choice => <li key={choice.id}><p>Started {new Date(choice.created_at).toLocaleString("en-IN")} · {choice.id.slice(0,8)} · {choice.can_rotate ? "Certified blank: eligible for rotation" : choice.can_abandon ? "No photos: local draft protected or unknown" : "Protected: photo history or submission"}</p>{choice.can_abandon && <button type="button" className={styles.button} disabled={sessionAction} onClick={() => setReleaseChoice(choice.id)}>Review release of session {choice.id.slice(0,8)}</button>}</li>)}</ul>{sessionChoices.length === 0 && <p>No releasable session is currently listed. Refresh, finish an existing listing on its original device, or wait for its normal expiry.</p>}{releaseChoice && <div className={styles.notice}><p>Release unused session {releaseChoice.slice(0,8)}? Another tab or device may still use it. Its saved listing details stay on that device, but it will need a new photo session.</p><button type="button" className={styles.button} disabled={sessionAction} onClick={() => setReleaseChoice(null)}>Keep session</button><button type="button" className={styles.primary} disabled={sessionAction} onClick={() => void releaseSession()}>Confirm release of unused session</button></div>}</section>}
 {sessionCode === "UPLOAD_SESSION_EXPIRED" && <div className={styles.notice}>{replaceExpired ? <><p>Keep your listing details and retry blobs in a new session? Photos without a local copy must be added again. Previous server photos are not deleted by this action.</p><button type="button" className={styles.button} onClick={() => setReplaceExpired(false)}>Keep expired draft</button><button type="button" className={styles.primary} onClick={restartExpiredSession}>Start new session and re-upload photos</button></> : <button type="button" className={styles.button} onClick={() => setReplaceExpired(true)}>Start a new photo session</button>}</div>}

 <div className={styles.columns}><div><ol className={styles.steps} aria-label="Posting steps">{STEP_LABELS.map((label, i) => <li key={label}><button type="button" disabled={busy || maintenance || (i > step && (!sessionReady || i > reachable))} data-complete={i < reachable} aria-label={`Step ${i + 1}: ${label}`} aria-current={step === i ? "step" : undefined} onClick={() => navigate(i)}><b>{i < reachable ? <><Check aria-hidden="true" size={18}/><span className="sr-only">Completed</span></> : i + 1}</b><span>{label}</span></button></li>)}</ol>

 <form ref={form} noValidate onSubmit={e => { e.preventDefault(); if (step < 5)
        next(); }}><fieldset disabled={busy || maintenance} className="min-w-0">
 <section {...attributes("media_ids")} tabIndex={-1} className={styles.card} style={{ display: step === 0 ? undefined : "none" }} aria-label="Photos">{<PreListingMediaUploader photos={photos} onChange={p => { setPhotos(p); clearIssue("media_ids"); }} sessionId={draft.session_id} disabled={busy || maintenance || frozen || sessionAction} photoLabel="Tablet" guidance="Display on, rear, corners, ports, faults and included stylus or keyboard. Redact personal information on invoices." onPrepareSession={prepareBlankSession} ensureSession={() => sessionReady ? Promise.resolve(draft.session_id) : initializeSession(draft.session_id)} onSessionError={code => { setSessionState("failed"); setSessionCode(code); setMessage(sessionErrors[code].message); }} onReady={async () => { await refresh(activeSession.current); }}/> }<div className={styles.choices} aria-label="Photo order">{photos.map((p,i)=><button key={p.id} type="button" className={styles.button} disabled={i===0||busy||maintenance||frozen||photos.some(p=>p.state==="uploading")} onClick={()=>setPhotos(current=>{const next=[...current];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Move photo {i+1} earlier</button>)}</div>{error("media_ids")}</section>
 <section className={styles.card} style={{ display: step === 1 ? undefined : "none" }} aria-label="Tablet details">
    <h2>Which tablet is it?</h2>
    <p className={styles.muted}>Choose the details printed on your tablet or its box.</p>
    <SearchCombobox id="mobile-brand_id" label="Brand" options={brandOptions} value={draft.brand_id} error={issue("brand_id")} onChange={chooseBrand}/>
    {error("brand_id")}
    <div className={styles.choices} aria-label="Popular brands">
        {brandOptions.slice(0, 3).map(option => <button type="button" key={option.id} className={`${styles.button} ${draft.brand_id === option.id ? styles.selected : ""}`} aria-pressed={draft.brand_id === option.id} onClick={() => chooseBrand(option.id)}>{option.name}</button>)}
    </div>
    {otherBrand && textField("other_brand", "Brand name", 100)}
    {!otherBrand && <SearchCombobox id="mobile-model_id" label="Model" options={modelOptions} value={draft.model_id} disabled={!draft.brand_id} error={issue("model_id")} onChange={chooseModel}/>}
    {error("model_id")}
    {model?.other && textField("other_model", "Model name", 100)}
    <div className={styles.pair}>
        <div>
            {specField("storage", "Storage", "Choose storage", Object.fromEntries(STORAGE.map(value => [value, value])), "Not sure")}
            {draft.storage_other !== undefined && textField("storage_other", "Other storage (e.g. 8 GB)", 8)}
        </div>
        <div>
            {specField("ram", "RAM (optional)", "Not specified", Object.fromEntries(RAM.map(value => [value, value])), "")}
            {draft.ram_other !== undefined && textField("ram_other", "Other RAM (e.g. 1 GB)", 6)}
        </div>
    </div>
    {specField("connectivity", "Connectivity", "Choose connectivity", CONNECTIVITY, "unknown")}
    {draft.connectivity_other !== undefined && textField("connectivity_other", "Other connectivity", 60)}
    {field("colour","Colour (optional)",<input {...attributes("colour")} value={draft.colour} maxLength={40} onChange={e=>update("colour",e.target.value)}/>)}
    {field("hardware_model_number","Hardware model number (optional, e.g. A2696)",<input {...attributes("hardware_model_number")} value={draft.hardware_model_number} maxLength={20} onChange={e=>update("hardware_model_number",e.target.value)}/>)}
    <p className={styles.muted}>Use Settings → About for the model name. Never enter an IMEI, serial number, account or password.</p>
    <small className={styles.muted}>Specs are seller-declared. Choose the configuration of your device.</small>
 </section>
 <section className={styles.card} style={{ display: step === 2 ? undefined : "none" }} aria-label="Condition and description"><h2>A little honesty goes a long way.</h2><div {...attributes("condition")} tabIndex={-1} role="group" aria-label="Condition">{Object.entries(CONDITIONS).map(([v, label]) => <button type="button" key={v} className={`${styles.button} ${styles.condition} ${draft.condition === v ? styles.selected : ""}`} aria-pressed={draft.condition === v} onClick={() => update("condition", v as TabletDraft["condition"])}>{label}{draft.condition === v ? <Check size={20} aria-hidden="true"/> : <Circle size={20} aria-hidden="true"/>}</button>)}</div>{error("condition")}{select("screen_touch_status","Screen and touch",SCREEN)}{select("battery_charging_status","Battery and charging",BATTERY)}{select("transfer_lock_status","Activation Lock, FRP and organization management",LOCK)}{draft.transfer_lock_status&&draft.transfer_lock_status!=="clear"&&<p className={styles.notice}>Remove the prior owner’s Apple/Google account and company or school management before publishing. Ask the owner or administrator to resolve it. You can keep a private draft.</p>}{select("repair_history","Repair history",{none:"No repairs",screen:"Screen repaired",battery:"Battery replaced",other:"Other repairs",unknown:"Not sure"})}{(draft.condition==="poor"||draft.screen_touch_status==="fault"||draft.battery_charging_status==="charging_fault")&&select("powers_on","Does it power on?",{yes:"Yes",no:"No",untested:"Cannot test"})}{field("other_defects","Repairs, other defects or uncertainty",<textarea {...attributes("other_defects")} value={draft.other_defects} maxLength={1000} onChange={e=>update("other_defects",e.target.value)}/>)}<fieldset><legend>What’s included? (seller-declared)</legend><div className={styles.accessories}>{INCLUDED.map(item => <button key={item} type="button" className={`${styles.button} ${draft.included.includes(item) ? styles.selected : ""}`} aria-pressed={draft.included.includes(item)} onClick={() => { setDraft(d => ({ ...d, included: d.included.includes(item) ? d.included.filter(i => i !== item) : [...d.included, item], stylus_description:item==="Stylus/pen"?"":d.stylus_description,keyboard_description:item==="Keyboard"?"":d.keyboard_description,warranty_until: item === "Under warranty" && d.included.includes(item) ? "" : d.warranty_until })); clearIssue("warranty_until"); }}>{draft.included.includes(item) && <Check size={18} aria-hidden="true"/>}{item}</button>)}</div></fieldset>{draft.included.includes("Stylus/pen")&&field("stylus_description","Stylus model / generation (optional)",<input {...attributes("stylus_description")} value={draft.stylus_description} maxLength={100} onChange={e=>update("stylus_description",e.target.value)}/>)}{draft.included.includes("Keyboard")&&field("keyboard_description","Keyboard model (optional)",<input {...attributes("keyboard_description")} value={draft.keyboard_description} maxLength={100} onChange={e=>update("keyboard_description",e.target.value)}/>)}{draft.included.includes("Under warranty") && field("warranty_until", "Warranty expiry month / year", <input {...attributes("warranty_until")} type="month" min={new Date().toISOString().slice(0, 7)} value={draft.warranty_until} onChange={e => update("warranty_until", e.target.value)}/>)}<div><label htmlFor="mobile-title">Title<input {...attributes("title")} maxLength={150} value={title} onChange={e => { setManualTitle(true); update("title", e.target.value); }}/></label>{error("title")}<button type="button" className={styles.back} onClick={() => { setManualTitle(false); clearIssue("title"); }}><RotateCcw size={16} aria-hidden="true"/>Use automatically generated title</button></div>{field("description", "Description", <textarea {...attributes("description")} rows={5} maxLength={5000} value={draft.description} placeholder="Battery health, repairs, visible wear and why you’re selling…" onChange={e => update("description", e.target.value)}/>)}<p className={styles.muted}>10–5,000 characters. Keep contact and payment details in FairSwap chat.</p></section>
 <section className={styles.card} style={{ display: step === 3 ? undefined : "none" }} aria-label="Price"><h2>Make it a fair deal.</h2><div className={styles.choices} role="group" aria-label="Trade type">{(["sell", "giveaway"] as const).map(v => <button type="button" key={v} className={`${styles.button} ${draft.trade === v ? styles.selected : ""}`} aria-pressed={draft.trade === v} onClick={() => { setDraft(d => ({ ...d, trade: v, negotiable: v === "giveaway" ? false : d.negotiable })); clearIssue("price_paise"); }}>{v === "sell" ? "Sell" : "Give away"}</button>)}</div>{draft.trade === "sell" ? <><div><label htmlFor="mobile-price_paise">Price (₹)<input {...attributes("price_paise")} inputMode="decimal" value={priceText} maxLength={20} onChange={e => { setPriceText(e.target.value); clearIssue("price_paise"); }}/></label>{error("price_paise")}<p className={styles.price}>{price}</p></div><button type="button" role="switch" aria-checked={draft.negotiable} className={styles.switch} onClick={() => update("negotiable", !draft.negotiable)}><span>Negotiable</span><span className={styles.track} aria-hidden="true"><span /></span></button></> : <p className={styles.notice}>Your listing will show “Free”. No asking price or negotiation is needed.</p>}</section>
 <section className={`${styles.card} ${styles.location}`} style={{ display: step === 4 ? undefined : "none" }} aria-label="Location"><h2>Find someone nearby.</h2><PincodeLocationPicker validationErrors={{ pin_code: issue("pin_code"), city_id: issue("city_id"), locality_id: issue("locality_id") }} key={`${ownerId}-${draft.session_id}`} locale="en" hideLandmark onResolvedChange={locationChanged} cities={cities} initialPinCode={draft.pin_code} initialCityId={draft.city_id} initialLocalityId={draft.locality_id}/>{error("pin_code")}{error("city_id")}{error("locality_id")}</section>
 {step === 5 && <section className={styles.card} aria-label="Submission review"><h2>Review your listing</h2><p>Check your photos and details in the buyer preview.</p><fieldset><legend>Listing plan</legend><label className="flex min-h-12 items-center gap-3"><input type="radio" name="plan_id" value="free-v1" checked readOnly style={{ width: 20, minHeight: 20 }}/>Free — submit your listing for review</label></fieldset><p className={styles.muted}>Pickup only. FairSwap does not currently verify authenticity, ownership, functionality, IMEI or accessories. All details are seller-declared.</p>{STEP_LABELS.map((label, i) => <button type="button" key={label} className={styles.button} onClick={() => navigate(i)}>Edit {label}</button>)}</section>}
 </fieldset></form></div><MobileBuyerPreview emptyTitle="Your tablet’s next chapter" title={title} price={price} description={draft.description} area={area} photos={photos} facts={[modelName ? [brandName, modelName].filter(Boolean).join(" ") : "", draft.condition ? CONDITIONS[draft.condition] : "", storage, draft.connectivity_other ?? CONNECTIVITY[draft.connectivity as keyof typeof CONNECTIVITY] ?? "", SCREEN[draft.screen_touch_status as keyof typeof SCREEN]??"", BATTERY[draft.battery_charging_status as keyof typeof BATTERY]??"", LOCK[draft.transfer_lock_status as keyof typeof LOCK]??"", `Repairs: ${draft.repair_history}`,draft.other_defects,...draft.included,draft.stylus_description,draft.keyboard_description,draft.warranty_until?`Warranty: ${draft.warranty_until}`:"", (draft.ram_other || draft.ram) ? `${draft.ram_other || draft.ram} RAM` : "", draft.trade === "sell" && draft.negotiable ? "Negotiable" : ""]}/></div>
 <aside className={styles.safety}><ShieldAlert aria-hidden="true" size={22}/><p>To receive money, you never need to enter a UPI PIN, scan a payment QR code or share an OTP.</p></aside>
 {frozen && <p role="status" className={styles.notice}>Your photos are prepared for submission. Retry the same submission to complete it.</p>}
 <footer className={styles.footer}><div><span className={styles.save} role="status">{saveState.startsWith("Could not")?saveState:savedCurrent?"Saved on this device":"Saving on this device…"}</span><button type="button" className={styles.button} disabled={busy} onClick={() => { if (step === 0) {
        push("/account/listings/new");
        return;
    } setStep(s => Math.max(0, s - 1)); setIssues([]);  }}><ArrowLeft size={18} aria-hidden="true"/>Back</button><button type="button" className={styles.primary} disabled={busy || maintenance || !sessionReady || sessionAction} onClick={() => step === 5 ? void submit() : next()}>{busy ? "Submitting…" : step === 5 ? "Submit for review" : step === 4 ? "Review listing" : "Continue"}{step < 5 && <ArrowRight size={18} aria-hidden="true"/>}</button></div></footer>
 </div>;
}
