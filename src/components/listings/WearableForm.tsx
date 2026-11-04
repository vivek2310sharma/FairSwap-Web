"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Circle, CircleAlert, ShieldAlert } from "lucide-react";
import type { City } from "@/types/listing";
import {
  BATTERY_MODES, CONDITIONS, CONNECTIVITY, DEVICE_TYPES, DEVICE_TYPE_LABELS, GPS_STATUS, INCLUDED_LABELS, PAIRING, PAIRING_BADGE, PHONE_OS, SCREEN, SENSORS, STRAP, WORKING,
  includedFor, wearableModelsSchema, type DeviceType, type WearableCatalogue, type WearableModelChoice,
} from "@/lib/listings/wearables/contract";
import { readPostingRecovery, writePostingRecovery } from "@/lib/listings/posting-recovery";
import { PostingSessionError, sessionErrors, sessionFailure, sessionRecoveryChoicesSchema, type SessionErrorCode, type SessionRecoveryChoice } from "@/lib/listings/mobiles/session-errors";
import PincodeLocationPicker from "./PincodeLocationPicker";
import PreListingMediaUploader, { type PostingPhoto } from "./PreListingMediaUploader";
import SearchCombobox from "./posting/SearchCombobox";
import WearableBuyerPreview from "./posting/WearableBuyerPreview";
import {
  WEARABLE_STEP_LABELS, blankWearableDraft, canPrepareBlankWearableSession, fieldStep, reachableWearableStep, validateWearableWizard, wearableRecoveryKey, wearableRecoverySchema, wearableTitle,
  type WearableDraft, type WearableRecovery, type WizardIssue,
} from "./posting/wearable-wizard";
import styles from "./posting/Posting.module.css";

const API = "/api/post-ad/wearables";
const OTHER = "__other__";
function focusPostingField(field: string) {
  const el = document.getElementById(`wearable-${field}`) ?? document.getElementById(field === "pin_code" ? "pincode_picker_input" : field === "city_id" ? "city_picker_select" : "locality_picker_select");
  const target = el instanceof HTMLSelectElement && el.disabled ? document.getElementById("pincode_picker_input") : el;
  target?.focus(); target?.scrollIntoView({ block: "center", behavior: "auto" });
}
function Choices<T extends string>({ label, value, options, onPick, id }: { label: string; value: T | ""; options: Record<string, string>; onPick: (v: T) => void; id?: string }) {
  return <div id={id} tabIndex={-1} role="group" aria-label={label} className={styles.choices}>{Object.entries(options).map(([k, text]) => <button type="button" key={k} className={`${styles.button} ${value === k ? styles.selected : ""}`} aria-pressed={value === k} onClick={() => onPick(k as T)}>{text}</button>)}</div>;
}

export default function WearableForm({ catalogue, ownerId, cities, maintenance = false, maintenanceMessage }: { catalogue: WearableCatalogue; ownerId: string; cities: City[]; maintenance?: boolean; maintenanceMessage?: string }) {
  const { replace, push } = useRouter();
  const recoveryKey = wearableRecoveryKey(ownerId);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const [draft, setDraft] = useState<WearableDraft>(() => blankWearableDraft(catalogue.revision));
  const [photos, setPhotos] = useState<PostingPhoto[]>([]);
  const [manualTitle, setManualTitle] = useState(false);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [recovery, setRecovery] = useState<WearableRecovery | null>(null);
  const [sessionState, setSessionState] = useState<"idle" | "initializing" | "ready" | "failed">("idle");
  const [sessionCode, setSessionCode] = useState<SessionErrorCode | null>(null);
  const [sessionChoices, setSessionChoices] = useState<SessionRecoveryChoice[]>([]);
  const [releaseChoice, setReleaseChoice] = useState<string | null>(null);
  const [sessionAction, setSessionAction] = useState(false);
  const [replaceExpired, setReplaceExpired] = useState(false);
  const [models, setModels] = useState<WearableModelChoice[]>([]);
  const [modelsState, setModelsState] = useState<"idle" | "loading" | "failed">("idle");
  const [series, setSeries] = useState("");
  const preparedSession = useRef<{ nonce: string; id: string } | null>(null);
  const preparation = useRef<{ nonce: string; promise: Promise<void> } | null>(null);
  const releaseInFlight = useRef(false);
  const initialization = useRef<{ id: string; promise: Promise<string | null> } | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<WizardIssue[]>([]);
  const [area, setArea] = useState("");
  const [priceText, setPriceText] = useState("");
  const [saveState, setSaveState] = useState("Saving on this device…");
  const [savedRecord, setSavedRecord] = useState<{ draft: WearableDraft; photos: PostingPhoto[]; step: number; manualTitle: boolean; area: string; priceText: string } | null>(null);
  const savedCurrent = savedRecord?.draft === draft && savedRecord.photos === photos && savedRecord.step === step && savedRecord.manualTitle === manualTitle && savedRecord.area === area && savedRecord.priceText === priceText;
  const sessionReady = sessionState === "ready";
  const retryInFlight = useRef(false);
  const submitting = useRef(false);
  const resolved = useRef(false);
  const mounted = useRef(true);
  const activeSession = useRef("");
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const latestRecovery = useRef<WearableRecovery | null>(null);

  const type = draft.device_type || undefined;
  const brand = catalogue.brands.find(b => b.id === draft.brand_id);
  const model = models.find(m => m.id === draft.model_id);
  const brandName = draft.brand_other ? draft.other_brand.trim() : brand?.name ?? "";
  const modelName = draft.brand_other || draft.model_other ? draft.other_model.trim() : model?.name ?? "";
  const title = manualTitle ? draft.title : wearableTitle(brandName, modelName, draft.condition);
  const extras = { title, priceText, mediaIds: photos.filter(p => p.state === "ready").map(p => p.id) };
  const clearIssue = (field: string) => setIssues(c => c.filter(i => i.field !== field));
  const update = <K extends keyof WearableDraft>(key: K, value: WearableDraft[K]) => { setDraft(d => ({ ...d, [key]: value })); clearIssue(key as string); };
  const locationChanged = useCallback((v: { pin_code: string; city_id: string; locality_id: string; area: string }) => { setDraft(d => d.pin_code === v.pin_code && d.city_id === v.city_id && d.locality_id === v.locality_id ? d : { ...d, pin_code: v.pin_code, city_id: v.city_id, locality_id: v.locality_id }); setArea(v.area); }, []);

  // Models load lazily for ONE brand + type; the full catalogue is never shipped to the browser.
  useEffect(() => {
    setModels([]); setSeries("");
    if (!draft.device_type || !draft.brand_id || draft.brand_other) { setModelsState("idle"); return; }
    let cancelled = false; setModelsState("loading");
    fetch(`${API}/models?brand_id=${encodeURIComponent(draft.brand_id)}&type=${draft.device_type}`).then(async r => {
      if (!r.ok) throw new Error("models");
      const parsed = wearableModelsSchema.parse(await r.json());
      if (!cancelled) { setModels(parsed.models); setModelsState("idle"); }
    }).catch(() => { if (!cancelled) setModelsState("failed"); });
    return () => { cancelled = true; };
  }, [draft.device_type, draft.brand_id, draft.brand_other]);

  const refresh = useCallback(async (session: string) => {
    const r = await fetch(`${API}/sessions/${session}/media`, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw sessionFailure(data);
    const remote = z.object({ session: z.object({ state: z.string(), listing_id: z.string().uuid().optional() }), media: z.array(z.object({ id: z.string().uuid(), state: z.enum(["uploading", "ready", "removed"]), url: z.string().nullable() })) }).parse(data);
    if (!mounted.current || activeSession.current !== session) return;
    setFrozen(remote.session.state === "finalizing");
    setPhotos(current => {
      const removed = new Set(remote.media.filter(p => p.state === "removed").map(p => p.id));
      const merged = current.filter(p => !removed.has(p.id)).map(p => { const found = remote.media.find(m => m.id === p.id); return found?.state === "ready" ? { ...p, state: "ready" as const, url: found.url ?? undefined } : p.state === "ready" ? { ...p, state: "failed" as const, error: "Photo not confirmed. Retry or add it again." } : p; });
      for (const p of remote.media) if (p.state !== "removed" && !merged.some(m => m.id === p.id)) merged.push({ id: p.id, state: p.state === "ready" ? "ready" : "failed", url: p.url ?? undefined });
      return merged;
    });
    return remote.session;
  }, []);
  const loadSessionChoices = useCallback(async () => {
    const response = await fetch(`${API}/sessions`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw sessionFailure(data);
    const parsed = sessionRecoveryChoicesSchema.parse(data);
    if (mounted.current) setSessionChoices(parsed.sessions);
  }, []);
  const post = (body: unknown) => fetch(`${API}/sessions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  function prepareBlankSession(): Promise<void> {
    const nonce = draft.session_id;
    if (preparation.current?.nonce === nonce) return preparation.current.promise;
    if (sessionState !== "idle" || busy || maintenance || !canPrepareBlankWearableSession(draft, photos, priceText, manualTitle, area) || preparedSession.current?.nonce === nonce) return Promise.resolve();
    const promise = (async () => {
      setSessionState("initializing");
      try {
        const response = await post({ session_id: nonce, operation: "create_empty" });
        const data = await response.json(); if (!response.ok) throw sessionFailure(data);
        const id = z.string().uuid().parse(data.session?.id);
        if (!mounted.current || activeSession.current !== nonce) return;
        // This unclaimed ID NEVER enters IndexedDB or the draft. Cancel is safely rotatable.
        preparedSession.current = { nonce, id }; setSessionState("idle");
      } catch (error) {
        if (!mounted.current || activeSession.current !== nonce) return;
        const failure = error instanceof PostingSessionError ? error : sessionFailure(null);
        setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message);
        if (failure.code === "UPLOAD_SESSION_LIMIT") await loadSessionChoices().catch(() => {});
      }
    })();
    preparation.current = { nonce, promise }; void promise.finally(() => { if (preparation.current?.promise === promise) preparation.current = null; }); return promise;
  }
  const initializeSession = useCallback((session: string): Promise<string | null> => {
    if (initialization.current?.id === session) return initialization.current.promise;
    const promise = (async () => {
      let activeId = session;
      activeSession.current = session;
      setSessionState("initializing"); setSessionCode(null);
      try {
        if (preparation.current?.nonce === session) await preparation.current.promise;
        // Persist the chosen id before allocation, so a lost response retries that id.
        await saveQueue.current.catch(() => {});
        const record = latestRecovery.current;
        if (record?.owner === ownerId && record.draft.session_id === session) {
          saveQueue.current = saveQueue.current.catch(() => {}).then(() => submitting.current ? undefined : writePostingRecovery(recoveryKey, record));
          await saveQueue.current.catch(() => { if (mounted.current) setSaveState("Could not save on this device. Keep this page open."); });
        }
        if (!mounted.current || activeSession.current !== session) return null;
        const prepared = preparedSession.current?.nonce === session ? preparedSession.current : null;
        const r = await post(prepared ? { session_id: prepared.id, operation: "claim_draft" } : { session_id: session, operation: "acquire_draft" });
        const data = await r.json();
        if (!r.ok) throw sessionFailure(data);
        if (!mounted.current || activeSession.current !== session) return null;
        if (data.session?.state === "submitted") {
          submitting.current = true;
          await saveQueue.current.catch(() => {}); await writePostingRecovery(recoveryKey, null).catch(() => {});
          replace(`/account/listings/${z.string().uuid().parse(data.session.listing_id)}/edit`);
          return null;
        }
        const resolvedId = z.string().uuid().parse(data.session?.id ?? session);
        if (prepared || resolvedId !== session) {
          if ((prepared && resolvedId !== prepared.id) || data.session?.draft_protected !== true) throw sessionFailure(null);
          activeId = resolvedId; activeSession.current = resolvedId;
          const latest = latestRecovery.current;
          if (latest?.owner === ownerId && latest.draft.session_id === session) {
            const claimed = { ...latest, draft: { ...latest.draft, session_id: resolvedId } };
            latestRecovery.current = claimed;
            saveQueue.current = saveQueue.current.catch(() => {}).then(() => submitting.current ? undefined : writePostingRecovery(recoveryKey, claimed));
            await saveQueue.current.catch(() => { if (mounted.current) setSaveState("Could not save on this device. Keep this page open."); });
          }
          setDraft(current => current.session_id === session ? { ...current, session_id: resolvedId } : current);
          preparedSession.current = null;
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
    initialization.current = { id: session, promise };
    void promise.finally(() => { if (initialization.current?.promise === promise) initialization.current = null; });
    return promise;
  }, [ownerId, recoveryKey, refresh, replace, loadSessionChoices]);
  async function restoreSession(session: string) {
    activeSession.current = session; setSessionState("initializing");
    try {
      const remote = await refresh(session);
      if (!mounted.current || activeSession.current !== session || !remote) return;
      if (remote.state === "submitted" && remote.listing_id) { submitting.current = true; await saveQueue.current.catch(() => {}); await writePostingRecovery(recoveryKey, null).catch(() => {}); replace(`/account/listings/${remote.listing_id}/edit`); return; }
      setSessionState("ready");
    } catch (error) {
      if (!mounted.current || activeSession.current !== session) return;
      const failure = error instanceof PostingSessionError ? error : sessionFailure(null);
      setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message);
    }
  }
  async function releaseSession() {
    if (!releaseChoice || releaseInFlight.current) return;
    releaseInFlight.current = true; setSessionAction(true);
    try {
      const response = await fetch(`${API}/sessions`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: releaseChoice }) });
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
    const session = crypto.randomUUID(); activeSession.current = session; preparedSession.current = null;
    setDraft(d => ({ ...d, session_id: session, media_ids: [] }));
    setPhotos(current => current.filter(p => p.blob).map(p => ({ ...p, id: crypto.randomUUID(), state: "pending", error: undefined })));
    setFrozen(false); setStep(0); setIssues([]); setSessionCode(null); setSessionState("idle"); setReplaceExpired(false);
    setMessage("Your listing details are retained. Upload the photos into the new session; previous server photos follow their existing expiry policy.");
  }
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function init() {
      let found: WearableRecovery | null = null;
      try {
        const p = wearableRecoverySchema.safeParse(await readPostingRecovery(recoveryKey));
        if (p.success && p.data.owner === ownerId && p.data.draft.catalogue_revision === catalogue.revision && Date.now() >= p.data.updated && Date.now() - p.data.updated < 24 * 60 * 60 * 1000) found = p.data;
      } catch { if (!cancelled) setMessage("Local recovery is unavailable in this browser. Keep this page open until submission."); }
      if (cancelled) return;
      setLoaded(true);
      if (found) { setRecovery(found); return; }
      resolved.current = true;
      const session = crypto.randomUUID();
      setDraft({ ...blankWearableDraft(catalogue.revision), session_id: session });
      activeSession.current = session;
    }
    void init();
    return () => { cancelled = true; mounted.current = false; };
  }, [ownerId, recoveryKey, catalogue.revision]);
  useEffect(() => { if (!sessionReady || recovery) return; const renew = () => { void refresh(draft.session_id).catch(error => { if (!mounted.current) return; const failure = error instanceof PostingSessionError ? error : sessionFailure(null); setSessionState("failed"); setSessionCode(failure.code); setMessage(failure.message); }); }; window.addEventListener("focus", renew); return () => window.removeEventListener("focus", renew); }, [sessionReady, recovery, refresh, draft.session_id]);
  useEffect(() => {
    if (!loaded || !resolved.current || recovery || submitting.current || !draft.session_id) return;
    const record: WearableRecovery = { version: 1, owner: ownerId, updated: Date.now(), draft, step, manualTitle, area, priceText, photos: photos.map(({ id, state, blob }) => ({ id, state, blob })) }; latestRecovery.current = record;
    const timer = setTimeout(() => { saveQueue.current = saveQueue.current.catch(() => {}).then(() => submitting.current || latestRecovery.current !== record ? undefined : writePostingRecovery(recoveryKey, record)).then(() => { if (mounted.current) { setSaveState("Saved on this device"); setSavedRecord({ draft, photos, step, manualTitle, area, priceText }); } }).catch(() => { if (mounted.current) setSaveState("Could not save on this device. Keep this page open."); }); }, 350);
    return () => clearTimeout(timer);
  }, [loaded, recovery, ownerId, recoveryKey, draft, step, manualTitle, area, priceText, photos]);
  // Flush the latest authorized record on route exit; never write a pending recovery or resurrect a submitted draft.
  useEffect(() => () => { const record = latestRecovery.current; if (!record || !resolved.current || submitting.current) return; saveQueue.current = saveQueue.current.catch(() => {}).then(() => submitting.current ? undefined : writePostingRecovery(recoveryKey, record)).catch(() => {}); }, [recoveryKey]);
  function chooseRecovery(resume: boolean) {
    if (!recovery || resolved.current) return; resolved.current = true;
    const value = resume ? recovery : null; const session = value?.draft.session_id || crypto.randomUUID();
    setDraft(value ? { ...value.draft, session_id: session } : { ...blankWearableDraft(catalogue.revision), session_id: session });
    setPhotos(value?.photos.map(p => ({ ...p, state: p.state === "uploading" ? "failed" : p.state })) ?? []);
    setManualTitle(value?.manualTitle ?? false); setPriceText(value?.priceText ?? ""); setArea(value?.area ?? ""); setStep(0); setRecovery(null); setSessionCode(null); setSessionState("idle"); setMessage(""); activeSession.current = session;
    if (value?.photos.some(p => p.state !== "pending")) void restoreSession(session);
  }
  function submission() {
    const data = form.current ? new FormData(form.current) : null;
    return { ...draft, pin_code: String(data?.get("pin_code") ?? draft.pin_code), city_id: String(data?.get("city_id") ?? draft.city_id), locality_id: String(data?.get("locality_id") ?? draft.locality_id) };
  }
  const getIssues = (s?: number) => validateWearableWizard(submission(), photos, extras, s);
  function showIssues(values: WizardIssue[]) { const first = values[0]; setIssues(first ? values.filter(i => fieldStep(i.field) === fieldStep(first.field)) : []); if (first) focusField(first.field); }
  function navigate(target: number) { if (busy || maintenance || (target > step && (!sessionReady || target > reachable))) return; setStep(target); setIssues([]); }
  useLayoutEffect(() => { if (pendingFocus.current) { focusPostingField(pendingFocus.current); pendingFocus.current = null; } else heading.current?.focus(); }, [step]);
  function focusField(field: string) { const next = fieldStep(field); if (next === step) { focusPostingField(field); return; } pendingFocus.current = field; setStep(next); }
  function next() {
    if (busy || maintenance || !sessionReady) return;
    const current = step === 4 ? getIssues().issues : getIssues(step).issues;
    if (current.length) { showIssues(current); return; }
    if (reachable < step) { showIssues(getIssues().issues); return; }
    setIssues([]); setStep(Math.min(5, step + 1));
  }
  async function submit() {
    if (submitting.current || busy || maintenance || !sessionReady || recovery) return;
    const value = getIssues();
    if (value.issues.length || !value.parsed.success) { showIssues(value.issues); return; }
    submitting.current = true; setBusy(true); setMessage("");
    try {
      const r = await fetch(`${API}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value.parsed.data) });
      const result = await r.json();
      if (!r.ok) {
        if (Array.isArray(result.issues)) { const safe = z.array(z.object({ field: z.string(), message: z.string() })).safeParse(result.issues); if (safe.success) showIssues(safe.data.slice().sort((a, b) => fieldStep(a.field) - fieldStep(b.field))); }
        throw new Error(result.error);
      }
      const listingId = z.string().uuid().parse(result.listing_id);
      await saveQueue.current.catch(() => {}); await writePostingRecovery(recoveryKey, null).catch(() => {});
      replace(`/account/listings/${listingId}/edit`);
    } catch (e) {
      submitting.current = false;
      setMessage(e instanceof Error ? e.message : "Submission could not be confirmed; retry with this same session.");
      await refresh(draft.session_id).catch(() => {});
    } finally { setBusy(false); }
  }
  const issue = (f: string) => issues.find(i => i.field === f)?.message;
  const error = (f: string) => issue(f) ? <p id={`wearable-${f}-error`} role="alert" className={styles.error}><CircleAlert aria-hidden="true"/><span>{issue(f)}</span></p> : null;
  const attr = (f: string) => ({ id: `wearable-${f}`, "aria-invalid": !!issue(f), "aria-describedby": issue(f) ? `wearable-${f}-error` : undefined });
  const input = (f: keyof WearableDraft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <div><label htmlFor={`wearable-${f}`}>{label}<input {...attr(f)} value={String(draft[f])} onChange={e => update(f, e.target.value as never)} {...props}/></label>{error(f)}</div>;
  const toggle = <T extends string>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  if (!loaded) return <p role="status">Checking for a saved listing…</p>;
  if (recovery) return <section className={styles.card} aria-labelledby="resume-heading"><h1 id="resume-heading">Pick up where you left off?</h1><p>A wearable listing is saved on this device. It is not synced to your account.</p><div className={styles.choices}><button className={styles.primary} type="button" onClick={() => chooseRecovery(true)}>Resume saved listing</button><button className={styles.button} type="button" onClick={() => chooseRecovery(false)}>Start fresh</button></div></section>;
  const reachable = reachableWearableStep(getIssues().issues);
  const price = draft.trade === "giveaway" ? "Free" : priceText && Number.isFinite(Number(priceText)) ? `₹${Number(priceText).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Your price";
  const isRing = type === "smart_ring";
  const brandOptions = catalogue.brands.filter(b => !type || b.types.includes(type)).map(b => ({ id: b.id, name: b.name })).concat([{ id: OTHER, name: "Other brand" }]);
  const seriesList = Array.from(new Set(models.map(m => m.series))).sort();
  const modelOptions = models.filter(m => !series || m.series === series).map(m => ({ id: m.id, name: m.name })).concat([{ id: OTHER, name: "Other model" }]);
  const pairing = draft.pairing_status;
  const facts = [type ? DEVICE_TYPE_LABELS[type] : "", draft.condition ? CONDITIONS[draft.condition] : "", draft.case_size_mm ? `${draft.case_size_mm} mm` : "", draft.ring_size ? `Ring size ${draft.ring_size}` : "", draft.connectivity ? CONNECTIVITY[draft.connectivity] : "", draft.trade === "sell" && draft.negotiable ? "Negotiable" : ""];
  const notices = [pairing && pairing !== "locked" ? PAIRING_BADGE[pairing] : ""];
  return <div className={step === 5 ? styles.reviewing : undefined} lang="en"><p className={styles.eyebrow}>SMARTWATCHES &amp; WEARABLES · {step === 5 ? "REVIEW" : `STEP ${step + 1} OF 5`}</p><h1 className={styles.wizardHeading} ref={heading} tabIndex={-1}>{step === 5 ? "Ready for a second life?" : "Your next owner is out there."}</h1>
    {maintenance && <p role="alert" className={styles.errorBox}>{maintenanceMessage ?? "Posting is temporarily unavailable. Your saved details are safe."}</p>}{message && <p role="alert" className={styles.errorBox}>{message}</p>}
    {sessionState === "initializing" && <p role="status">Preparing photo upload…</p>}
    {sessionState === "failed" && <button type="button" className={styles.button} onClick={async () => { if (retryInFlight.current) return; retryInFlight.current = true; setMessage(""); try { await initializeSession(draft.session_id); } finally { retryInFlight.current = false; } }}>Retry photo upload</button>}
    {sessionState === "idle" && <p className={styles.muted}>Choose photos, then upload them to continue.</p>}
    {(sessionCode === "UPLOAD_SESSION_LIMIT" || sessionCode === "UPLOAD_SESSION_PROTECTED") && <section className={styles.card} aria-label="Photo session recovery"><h2>Recover photo session capacity</h2><p>Review only a photo-free session you no longer need. Sessions with any photo history or a submission in progress are protected. No photos or saved listing details will be deleted here.</p><button type="button" className={styles.button} disabled={sessionAction} onClick={() => void loadSessionChoices().catch(() => setMessage("Could not refresh session choices. Retry shortly."))}>Refresh session choices</button><ul>{sessionChoices.map(c => <li key={c.id}><p>Started {new Date(c.created_at).toLocaleString("en-IN")} · {c.id.slice(0, 8)} · {c.can_rotate ? "Certified blank: eligible" : c.can_abandon ? "Photo-free" : "Protected"}</p>{c.can_abandon && <button type="button" className={styles.button} aria-pressed={releaseChoice === c.id} onClick={() => setReleaseChoice(c.id)}>Select to release</button>}</li>)}</ul>{releaseChoice && <button type="button" className={styles.primary} disabled={sessionAction} onClick={() => void releaseSession()}>Release selected session</button>}</section>}
    {sessionCode === "UPLOAD_SESSION_EXPIRED" && <div className={styles.notice}>{replaceExpired ? <><p>Keep your listing details and retry blobs in a new session? Photos without a local copy must be added again. Previous server photos are not deleted by this action.</p><button type="button" className={styles.button} onClick={() => setReplaceExpired(false)}>Keep expired draft</button><button type="button" className={styles.primary} onClick={restartExpiredSession}>Start new session and re-upload photos</button></> : <button type="button" className={styles.button} onClick={() => setReplaceExpired(true)}>Start a new photo session</button>}</div>}
    <div className={styles.columns}><div>
      <ol className={styles.steps} aria-label="Posting steps">{WEARABLE_STEP_LABELS.map((label, i) => <li key={label}><button type="button" disabled={busy || maintenance || (i > step && (!sessionReady || i > reachable))} data-complete={i < reachable} aria-label={`Step ${i + 1}: ${label}`} aria-current={step === i ? "step" : undefined} onClick={() => navigate(i)}><b>{i < reachable ? <><Check aria-hidden="true" size={18}/><span className="sr-only">Completed</span></> : i + 1}</b><span>{label}</span></button></li>)}</ol>
      <form ref={form} noValidate onSubmit={e => { e.preventDefault(); if (step < 5) next(); }}><fieldset disabled={busy || maintenance} className="min-w-0">
        <section {...attr("media_ids")} tabIndex={-1} className={styles.card} style={{ display: step === 0 ? undefined : "none" }} aria-label="Photos"><PreListingMediaUploader mediaBase={`${API}/sessions`} photoLabel="Wearable" guidance="Front, back, screen on, strap or band, charger and any wear." photos={photos} onChange={p => { setPhotos(p); clearIssue("media_ids"); }} sessionId={draft.session_id} disabled={busy || maintenance || frozen || sessionAction} onPrepareSession={prepareBlankSession} ensureSession={() => sessionReady ? Promise.resolve(draft.session_id) : initializeSession(draft.session_id)} onSessionError={code => { setSessionState("failed"); setSessionCode(code); setMessage(sessionErrors[code].message); }} onReady={async () => { await refresh(activeSession.current); }}/>{error("media_ids")}</section>

        <section className={styles.card} style={{ display: step === 1 ? undefined : "none" }} aria-label="Wearable details"><h2>Which wearable is it?</h2><p className={styles.muted}>Choose the details printed on the device, its app or its box.</p>
          <Choices id="wearable-device_type" label="Device type" value={draft.device_type} options={Object.fromEntries(DEVICE_TYPES.map(t => [t, DEVICE_TYPE_LABELS[t]]))} onPick={(t: DeviceType) => { setDraft(d => ({ ...d, device_type: t, brand_id: "", brand_other: false, other_brand: "", model_id: "", model_other: false, other_model: "", case_size_mm: "", ring_size: "", connectivity: "", gps_status: "", screen: "", controls: "", strap: "", battery_mode: "", battery_health_percent: "", battery_runtime_hours: "", included: [], transfer_ack: d.transfer_ack })); clearIssue("device_type"); }}/>{error("device_type")}
          {type && <><SearchCombobox id="wearable-brand_id" label="Brand" options={brandOptions} value={draft.brand_other ? OTHER : draft.brand_id} error={issue("brand_id")} onChange={id => { setDraft(d => ({ ...d, brand_id: id === OTHER ? "" : id, brand_other: id === OTHER, model_id: "", model_other: id === OTHER, other_model: "", other_brand: id === OTHER ? d.other_brand : "" })); clearIssue("brand_id"); clearIssue("model_id"); }}/>{error("brand_id")}
            {draft.brand_other && input("other_brand", "Brand name (reviewed by FairSwap)", { maxLength: 60 })}
            {(draft.brand_id || draft.brand_other) && !draft.brand_other && <>{modelsState === "loading" && <p role="status" className={styles.muted}>Loading models…</p>}{modelsState === "failed" && <p role="alert" className={styles.errorBox}>Could not load models. Check your connection and re-select the brand.</p>}
              {seriesList.length > 1 && <div><label htmlFor="wearable-series">Series (optional)<select id="wearable-series" value={series} onChange={e => { setSeries(e.target.value); }}><option value="">All series</option>{seriesList.map(s => <option key={s} value={s}>{s}</option>)}</select></label></div>}
              <SearchCombobox id="wearable-model_id" label="Model" options={modelOptions} value={draft.model_other ? OTHER : draft.model_id} disabled={modelsState === "loading"} error={issue("model_id")} onChange={id => { setDraft(d => ({ ...d, model_id: id === OTHER ? "" : id, model_other: id === OTHER, other_model: id === OTHER ? d.other_model : "" })); clearIssue("model_id"); }}/>{error("model_id")}</>}
            {(draft.brand_other || draft.model_other) && input("other_model", "Model name (reviewed by FairSwap)", { maxLength: 80 })}
            {input("generation", "Generation or edition (optional)", { maxLength: 40 })}{input("finish", "Finish / colour (optional)", { maxLength: 40 })}
            {(type === "smartwatch" || type === "sports_gps_watch") && input("case_size_mm", "Case size in mm (leave blank if not sure)", { inputMode: "numeric", maxLength: 2 })}
            {type === "smartwatch" && <div><p>Connectivity</p><Choices id="wearable-connectivity" label="Connectivity" value={draft.connectivity} options={CONNECTIVITY} onPick={v => update("connectivity", v)}/>{error("connectivity")}<p className={styles.muted}>Bluetooth calling is not the same as LTE / cellular.</p></div>}
            {type === "sports_gps_watch" && <div><p>GPS</p><Choices id="wearable-gps_status" label="GPS" value={draft.gps_status} options={GPS_STATUS} onPick={v => update("gps_status", v)}/>{error("gps_status")}</div>}
            {isRing && input("ring_size", "Ring size (as printed by the maker)", { maxLength: 20 })}
            <fieldset id="wearable-phone_os"><legend>Works with (seller-reported)</legend><div className={styles.accessories}>{Object.entries(PHONE_OS).map(([k, text]) => <button key={k} type="button" className={`${styles.button} ${draft.phone_os.includes(k as "android" | "ios") ? styles.selected : ""}`} aria-pressed={draft.phone_os.includes(k as "android" | "ios")} onClick={() => update("phone_os", toggle(draft.phone_os, k as "android" | "ios"))}>{text}</button>)}</div><p className={styles.muted}>Leave blank if unsure. FairSwap does not verify compatibility.</p></fieldset></>}
        </section>

        <section className={styles.card} style={{ display: step === 2 ? undefined : "none" }} aria-label="Condition and description"><h2>A little honesty goes a long way.</h2>
          <div {...attr("condition")} tabIndex={-1} role="group" aria-label="Condition">{Object.entries(CONDITIONS).map(([v, label]) => <button type="button" key={v} className={`${styles.button} ${styles.condition} ${draft.condition === v ? styles.selected : ""}`} aria-pressed={draft.condition === v} onClick={() => update("condition", v as WearableDraft["condition"])}>{label}{draft.condition === v ? <Check size={20} aria-hidden="true"/> : <Circle size={20} aria-hidden="true"/>}</button>)}</div>{error("condition")}
          {type && !isRing && <><p>Screen</p><Choices id="wearable-screen" label="Screen" value={draft.screen} options={SCREEN} onPick={v => update("screen", v)}/>{error("screen")}<p>Touch and buttons</p><Choices id="wearable-controls" label="Touch and buttons" value={draft.controls} options={WORKING} onPick={v => update("controls", v)}/>{error("controls")}<p>Strap or band</p><Choices id="wearable-strap" label="Strap or band" value={draft.strap} options={STRAP} onPick={v => update("strap", v)}/>{error("strap")}</>}
          {type && <><p>Sensors</p><Choices id="wearable-sensors" label="Sensors" value={draft.sensors} options={SENSORS} onPick={v => update("sensors", v)}/>{error("sensors")}<p>Charging</p><Choices id="wearable-charging" label="Charging" value={draft.charging} options={WORKING} onPick={v => update("charging", v)}/>{error("charging")}
            <p>Battery</p><Choices id="wearable-battery_mode" label="Battery" value={draft.battery_mode} options={Object.fromEntries(Object.entries(BATTERY_MODES).filter(([k]) => k !== "health_percent" || type === "smartwatch"))} onPick={v => update("battery_mode", v)}/>{error("battery_mode")}
            {draft.battery_mode === "health_percent" && input("battery_health_percent", "Battery health % (only if your device shows it)", { inputMode: "numeric", maxLength: 3 })}{draft.battery_mode === "runtime_hours" && input("battery_runtime_hours", "Approximate runtime on a full charge (hours)", { inputMode: "numeric", maxLength: 4 })}
            <fieldset id="wearable-included"><legend>What’s included? (seller-declared)</legend><div className={styles.accessories}>{includedFor(type).map(k => <button key={k} type="button" className={`${styles.button} ${draft.included.includes(k) ? styles.selected : ""}`} aria-pressed={draft.included.includes(k)} onClick={() => update("included", toggle(draft.included, k))}>{INCLUDED_LABELS[k]}</button>)}</div>{error("included")}</fieldset>
            {input("purchase_month", "Purchase month (optional)", { type: "month", max: new Date().toISOString().slice(0, 7) })}{input("warranty_until", "Warranty valid until (optional)", { type: "month", min: new Date().toISOString().slice(0, 7) })}</>}
          <fieldset id="wearable-pairing_status" tabIndex={-1}><legend>Pairing and account status</legend>{Object.entries(PAIRING).map(([k, text]) => <label key={k} className="flex min-h-12 items-center gap-3"><input type="radio" name="pairing_status" style={{ width: 20, minHeight: 20 }} checked={pairing === k} onChange={() => { setDraft(d => ({ ...d, pairing_status: k as WearableDraft["pairing_status"], transfer_ack: false })); clearIssue("pairing_status"); clearIssue("transfer_ack"); }}/>{text}</label>)}{error("pairing_status")}
            {pairing === "locked" && <p role="alert" className={styles.errorBox}>Devices with an activation or account lock can’t be listed. Remove the lock, then post again.</p>}
            {pairing === "still_paired" && <div><label className="flex min-h-12 items-start gap-3"><input id="wearable-transfer_ack" type="checkbox" style={{ width: 20, minHeight: 20 }} checked={draft.transfer_ack} onChange={e => update("transfer_ack", e.target.checked)}/>I will sign out and unpair it before handover. I understand this listing is reviewed by FairSwap before it goes live and is shown as not ready for transfer.</label>{error("transfer_ack")}</div>}
            {pairing === "unknown" && <p className={styles.notice}>This listing is reviewed by FairSwap before it goes live and shows that you have not confirmed pairing status.</p>}
            <p className={styles.muted}>This is your own report; FairSwap does not check it with the maker.</p></fieldset>
          <div><label className="flex min-h-12 items-start gap-3"><input id="wearable-ownership_confirmed" type="checkbox" style={{ width: 20, minHeight: 20 }} checked={draft.ownership_confirmed} onChange={e => update("ownership_confirmed", e.target.checked)}/>I own this device and it is not lost, stolen or reported as such.</label>{error("ownership_confirmed")}</div>
          <div><label htmlFor="wearable-title">Title<input {...attr("title")} value={title} maxLength={80} onChange={e => { setManualTitle(true); update("title", e.target.value); }}/></label>{error("title")}</div>
          <div><label htmlFor="wearable-description">Description<textarea {...attr("description")} rows={5} maxLength={1500} value={draft.description} onChange={e => update("description", e.target.value)}/></label>{error("description")}<p className={styles.muted}>No phone numbers, UPI IDs or payment links. Use FairSwap chat.</p></div>
        </section>

        <section className={styles.card} style={{ display: step === 3 ? undefined : "none" }} aria-label="Price"><h2>Make it a fair deal.</h2>
          <div className={styles.choices} role="group" aria-label="Trade type">{(["sell", "giveaway"] as const).map(v => <button type="button" key={v} className={`${styles.button} ${draft.trade === v ? styles.selected : ""}`} aria-pressed={draft.trade === v} onClick={() => { setDraft(d => ({ ...d, trade: v, negotiable: v === "giveaway" ? false : d.negotiable })); clearIssue("price_paise"); }}>{v === "sell" ? "Sell" : "Give away"}</button>)}</div>
          {draft.trade === "sell" ? <><div><label htmlFor="wearable-price_paise">Price (₹)<input {...attr("price_paise")} inputMode="decimal" value={priceText} maxLength={20} onChange={e => { setPriceText(e.target.value); clearIssue("price_paise"); }}/></label>{error("price_paise")}<p className={styles.price}>{price}</p></div>
            <label className="flex min-h-12 items-center gap-3"><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={draft.negotiable} onChange={e => update("negotiable", e.target.checked)}/>Negotiable</label></> : <p>This will be listed as a free giveaway.</p>}
        </section>

        <section className={`${styles.card} ${styles.location}`} style={{ display: step === 4 ? undefined : "none" }} aria-label="Location"><h2>Find someone nearby.</h2><PincodeLocationPicker validationErrors={{ pin_code: issue("pin_code"), city_id: issue("city_id"), locality_id: issue("locality_id") }} key={`${ownerId}-${draft.session_id}`} locale="en" hideLandmark onResolvedChange={locationChanged} cities={cities} initialPinCode={draft.pin_code} initialCityId={draft.city_id} initialLocalityId={draft.locality_id}/>{error("pin_code")}{error("city_id")}{error("locality_id")}</section>
        {step === 5 && <section className={styles.card} aria-label="Submission review"><h2>Review your listing</h2><p>Check your photos and details in the buyer preview.</p><fieldset><legend>Listing plan</legend><label className="flex min-h-12 items-center gap-3"><input type="radio" name="plan_id" value="free-v1" checked readOnly style={{ width: 20, minHeight: 20 }}/>Free — submit your listing for review</label></fieldset><p className={styles.muted}>Pickup only. Everything here is seller-reported; FairSwap does not verify the device, serial number or account status.</p>{WEARABLE_STEP_LABELS.map((label, i) => <button type="button" key={label} className={styles.button} onClick={() => navigate(i)}>Edit {label}</button>)}</section>}
      </fieldset></form></div>
      <WearableBuyerPreview title={title} price={price} description={draft.description} area={area} photos={photos} facts={facts} notices={notices}/></div>
    <aside className={styles.safety}><ShieldAlert aria-hidden="true" size={22}/><p>To receive money, you never need to enter a UPI PIN, scan a payment QR code or share an OTP.</p></aside>
    {frozen && <p role="status" className={styles.notice}>Your photos are prepared for submission. Retry the same submission to complete it.</p>}
    <footer className={styles.footer}><div><span className={styles.save} role="status">{saveState.startsWith("Could not") ? saveState : savedCurrent ? "Saved on this device" : "Saving on this device…"}</span><button type="button" className={styles.button} disabled={busy} onClick={() => { if (step === 0) { push("/account/listings/new"); return; } setStep(s => Math.max(0, s - 1)); setIssues([]); }}><ArrowLeft size={18} aria-hidden="true"/>Back</button><button type="button" className={styles.primary} disabled={busy || maintenance || !sessionReady || sessionAction} onClick={() => step === 5 ? void submit() : next()}>{busy ? "Submitting…" : step === 5 ? "Submit for review" : step === 4 ? "Review listing" : "Continue"}{step < 5 && <ArrowRight size={18} aria-hidden="true"/>}</button></div></footer>
  </div>;
}
