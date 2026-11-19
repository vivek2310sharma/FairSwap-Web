"use client";

import { isPropertyIntakeSlug, isRegulatedVehicleDraftSlug, isSpecialistVehicleDraftSlug } from "@/lib/listings/ordinary-goods/categories";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { City } from "@/types/listing";
import { readPostingRecovery, writePostingRecovery } from "@/lib/listings/posting-recovery";
import { goodsAnswers, goodsDetails, goodsLocation, goodsSubmission, parseGoodsPrice, parsePropertyPaise,
  selectedGoodsSubmission, uuid, type GoodsDefinition, type GoodsSubmission } from "@/lib/listings/ordinary-goods/contract";
import { CANONICAL_POSTING_PATH } from "@/lib/listings/canonical-posting-route";
import PreListingMediaUploader, { type PostingPhoto } from "../PreListingMediaUploader";
import PincodeLocationPicker from "../PincodeLocationPicker";
import MobileBuyerPreview from "./MobileBuyerPreview";
import { PostingWizardFooter, PostingWizardHeading, PostingWizardReview, PostingWizardSteps, REVIEW_STEP } from "./PostingWizard";
import styles from "./Posting.module.css";

const itemLabels = ["Photos", "Details", "Condition", "Price", "Location"] as const;
const propertyLabels = ["Photos", "Details", "Description", "Terms", "Location"] as const;
const conditions = { new: "New", like_new: "Like new", good: "Good", fair: "Fair", poor: "Poor" };
const location = { pin_code: "", city_id: "", locality_id: "", area: "" };
const blank = {
  session: "", fields: {} as Record<string, string>, title: "", description: "", condition: "",
  defects: "", safety: false, power: false, giveaway: false, negotiable: false, price: "", location,
};
const savedSchema = z.object({
  session: z.union([uuid, z.literal("")]), fields: z.record(z.string().max(100)),
  title: z.string().max(120), description: z.string().max(2000), condition: z.string().max(15),
  defects: z.string().max(500), safety: z.boolean(), power: z.boolean(), giveaway: z.boolean(),
  negotiable: z.boolean(), price: z.string().max(12),
  location: z.object({ pin_code: z.string().max(6), city_id: z.string().max(36), locality_id: z.string().max(36), area: z.string().max(250) }),
}).strict();
const photoSchema = z.object({
  id: uuid, state: z.enum(["pending", "uploading", "ready", "failed"]), blob: z.instanceof(Blob).optional(),
});
const snapshotSchema = z.object({
  session: z.object({ id: uuid, state: z.enum(["open", "finalizing", "submitted", "expired", "cleaned"]) }),
  media: z.array(z.object({ id: uuid, state: z.enum(["ready", "uploading", "removed"]), url: z.string().nullable() })).max(8),
});
const recoverySchema = z.object({
  draft: savedSchema, photos: z.array(photoSchema).max(8), frozen: goodsSubmission.nullable(),
});

export default function OrdinaryGoodsForm({ definition, label, ownerId, cities, maintenance, maintenanceMessage }: {
  definition: GoodsDefinition; label: string; ownerId: string; cities: City[];
  maintenance: boolean; maintenanceMessage?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(blank);
  const [photos, setPhotos] = useState<PostingPhoto[]>([]);
  const [step, setStep] = useState(0);
  const [frozen, setFrozen] = useState<GoodsSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [expired, setExpired] = useState(false);
  const [unverifiedSession, setUnverifiedSession] = useState(false);
  const lock = useRef(false);
  const stateLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const saved = useRef<Promise<void>>(Promise.resolve());
  const base = `/api/post-ad/goods/${definition.slug}`;
  const recoveryKey = `${ownerId}:ordinary-goods:${definition.category_id}:${definition.revision}`;
  const update = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setDraft(current => ({ ...current, [key]: value }));
  const setLocation = useCallback((value: typeof location) => {
    setDraft(current => Object.keys(value).every(key => value[key as keyof typeof location] === current.location[key as keyof typeof location])
      ? current : { ...current, location: value });
  }, []);

  const save = useCallback((value: { draft: typeof blank; photos: PostingPhoto[]; frozen: GoodsSubmission | null } | null) => {
    const record = value && { ...value, photos: value.photos.map(({ id, state, blob }) => ({ id, state, blob })) };
    const write = saved.current.catch(() => {}).then(() => writePostingRecovery(recoveryKey, record));
    saved.current = write;
    return write;
  }, [recoveryKey]);

  const refresh = useCallback(async (session: string) => {
    const response = await fetch(`${base}/sessions/${session}/media`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      if (data.code === "UPLOAD_SESSION_EXPIRED" || (data.code === "UPLOAD_SESSION_UNAVAILABLE" && !stateLock.current)) setExpired(true);
      throw Error(data.error || "Could not verify the photo session.");
    }
    const state = snapshotSchema.parse(data);
    if (state.session.id !== session) throw Error("Could not verify the photo session.");
    setPhotos(current => {
      if (state.session.state === "submitted") return current;
      const ready = new Map(state.media.filter(p => p.state === "ready").map(p => [p.id, p]));
      const existing = new Set(current.map(p => p.id));
      return [
        ...current.flatMap((p): PostingPhoto[] => {
          const server = ready.get(p.id);
          if (server) return [{ ...p, state: "ready", url: server.url ?? undefined }];
          if (p.blob) return [{ ...p, state: state.media.some(m => m.id === p.id && m.state === "uploading") ? "failed" : "pending" }];
          return [];
        }),
        ...[...ready.values()].filter(p => !existing.has(p.id)).map((p): PostingPhoto => ({ id: p.id, state: "ready", url: p.url ?? undefined })),
      ];
    });
    if (state.session.state === "open") { stateLock.current = false; setFrozen(null); }
    else stateLock.current = true;
    setUnverifiedSession(state.session.state !== "open");
    return state.session.state;
  }, [base]);

  useEffect(() => {
    let live = true;
    readPostingRecovery(recoveryKey).then(raw => {
      if (!live) return;
      const parsed = recoverySchema.safeParse(raw);
      if (!parsed.success) return;
      const { draft: record, photos: retained, frozen: pending } = parsed.data;
      setDraft(record);
      setPhotos(retained.map(p => ({ ...p, state: p.state === "uploading" ? "failed" : p.state })));
      stateLock.current = !!pending;
      setFrozen(pending);
      if (pending) setStep(REVIEW_STEP);
      if (record.session) {
        setChecking(true);
        void refresh(record.session).catch(e => {
          if (live) { setUnverifiedSession(true); setError(e.message); }
        }).finally(() => { if (live) setChecking(false); });
      }
    }).catch(() => { if (live) setSaveError(true); }).finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [recoveryKey, refresh]);

  useEffect(() => {
    if (!loaded || checking || lock.current) return;
    const timer = setTimeout(() => {
      void save({ draft, photos, frozen }).then(() => setSaveError(false), () => setSaveError(true));
    }, 250);
    return () => clearTimeout(timer);
  }, [checking, draft, frozen, loaded, photos, save]);

  async function ensureSession() {
    const session = draft.session || crypto.randomUUID();
    update("session", session);
    try {
      await save({ draft: { ...draft, session }, photos, frozen: null }).catch(() => setSaveError(true));
      const response = await fetch(`${base}/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: session }),
      });
      const data = await response.json();
      if (!response.ok || data.session?.id !== session) {
        if (data.code === "UPLOAD_SESSION_EXPIRED") setExpired(true);
        throw Error(data.error || "Could not start the photo session.");
      }
      return session;
    } catch (e) { setError(e instanceof Error ? e.message : "Photo session unavailable."); return null; }
  }

  const draftOnly = isRegulatedVehicleDraftSlug(definition.slug);
  const property = isPropertyIntakeSlug(definition.slug);
  const labels = property ? propertyLabels : itemLabels;
  const sale = draft.fields.offer === "Sale";
  const termsKeys = ["offer", "amount_paise", "deposit_paise", "charges_paise"];
  const detailsFields = definition.fields.filter(f => !property || !termsKeys.includes(f.key));
  const fields = Object.fromEntries(definition.fields.flatMap(f => {
    if (property && f.key.endsWith("_paise")) {
      const amount = sale && f.key !== "amount_paise" ? 0 : parsePropertyPaise(draft.fields[f.key]?.trim() ?? "");
      return amount === null ? [] : [[f.key, amount]];
    }
    const value = draft.fields[f.key]?.trim();
    if (!value) return [];
    return [[f.key, f.kind === "number" ? (/^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN) : value]];
  }));
  const answers = { ...fields, defects: draft.defects.trim(), safety_confirmed: draft.safety,
    power_safe: draft.power };
  const paise = draft.giveaway ? 0 : parseGoodsPrice(draft.price);
  const details = { title: draft.title, description: draft.description, condition: property ? "good" : draft.condition };
  const { area, ...postal } = draft.location;
  const validations = [
    photos.length && photos.every(p => p.state === "ready") && draft.session ? "" : "Upload all selected photos, including at least one photo.",
    goodsAnswers({ ...definition, fields: detailsFields }).safeParse(Object.fromEntries(
      Object.entries(fields).filter(([key]) => detailsFields.some(f => f.key === key)))).success ? "" : "Complete required details and check numerical ranges.",
    goodsDetails.safeParse(details).success && draft.safety && draft.power &&
      (!["fair", "poor"].includes(draft.condition) || draft.defects.trim().length >= 5)
      ? "" : property ? "Complete the property description and declarations." : "Choose a condition, describe wear or faults and complete the safety declarations.",
    property ? (goodsAnswers(definition).safeParse(fields).success ? "" : "Complete the property terms with valid INR amounts.") :
      paise === null ? "Enter a selling price from ₹1 to ₹10,00,000." : "",
    goodsLocation.safeParse(postal).success ? "" : "Choose a city and locality for the PIN code.",
  ];
  const firstInvalid = validations.findIndex(Boolean);
  const reachable = firstInvalid < 0 ? REVIEW_STEP : firstInvalid;
  const disabled = !loaded || checking || busy || maintenance;

  function navigate(target: number) {
    if (disabled || frozen || unverifiedSession || target > reachable) return;
    setError("");
    setStep(target);
    heading.current?.focus();
  }

  async function submit() {
    if (draftOnly || lock.current || disabled) return;
    const value = frozen ?? {
      ...details, ...postal, condition: property ? null : details.condition, slug: definition.slug, category_id: definition.category_id, revision: definition.revision,
      session_id: draft.session, answers, price_type: property ? null : draft.giveaway ? "free" : draft.negotiable ? "negotiable" : "fixed",
      price_paise: property ? null : paise, media_ids: photos.map(p => p.id),
    };
    const parsed = selectedGoodsSubmission(definition).safeParse(value);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    const payload = goodsSubmission.parse(parsed.data);
    lock.current = true;
    setBusy(true);
    stateLock.current = true;
    setFrozen(payload);
    setError("");
    try {
      await save({ draft, photos, frozen: payload });
      const response = await fetch(`${base}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      const id = uuid.safeParse(data.listing_id);
      if (!response.ok || data.success !== true || !id.success) throw Error(data.error || "Could not submit. Retry this submission.");
      await save(null).catch(() => {});
      router.replace(`/account/listings/${id.data}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit. Retry this submission.");
      await refresh(draft.session).catch(() => {});
    } finally { lock.current = false; setBusy(false); }
  }

  function restartPhotos() {
    setDraft(current => ({ ...current, session: "" }));
    setPhotos(current => current.flatMap(p => p.blob ? [{ id: crypto.randomUUID(), state: "pending", blob: p.blob }] : []));
    setExpired(false);
    setUnverifiedSession(false);
    stateLock.current = false;
    setFrozen(null);
    setError("");
    setStep(0);
  }

  return <div className={step === REVIEW_STEP ? styles.reviewing : undefined} lang="en">
    <PostingWizardHeading category={label} step={step} headingRef={heading}/>
    {maintenance && <p role="alert" className={styles.errorBox}>{maintenanceMessage ?? "Posting is temporarily unavailable."}</p>}
    {error && <p role="alert" className={styles.errorBox}>{error}</p>}
    {checking && <p role="status">Checking your saved photos…</p>}
    {expired && <button type="button" className={styles.button} disabled={disabled} onClick={restartPhotos}>Start a new photo session</button>}
    {unverifiedSession && !expired && <button type="button" className={styles.button} disabled={disabled} onClick={() => {
      setChecking(true);
      void refresh(draft.session).then(() => setError(""), e => setError(e.message)).finally(() => setChecking(false));
    }}>Check saved photos again</button>}
    {unverifiedSession && !frozen && !expired && <p role="status">If submission is in progress, finish it from the device draft that started it.</p>}
    {frozen && <p role="status" className={styles.notice}>Retry with the same details to complete your submission.</p>}
    <div className={styles.columns}><div>
      <PostingWizardSteps labels={labels} step={step} reachable={reachable} busy={disabled || !!frozen} maintenance={maintenance}
        sessionReady={!unverifiedSession} onNavigate={navigate}/>
      <fieldset disabled={disabled || !!frozen || unverifiedSession} className="min-w-0">
        <section className={styles.card} style={{ display: step === 0 ? undefined : "none" }}>
          <PreListingMediaUploader photos={photos} onChange={setPhotos} sessionId={draft.session} disabled={disabled || !!frozen || unverifiedSession}
            mediaBase={`${base}/sessions`} photoLabel="Item" guidance="Show the item, its label and any visible wear. Remove contact details and payment codes."
            ensureSession={ensureSession} onReady={async () => { /* Uploader already confirms each ready photo. */ }}
            onSessionError={code => { if (code === "UPLOAD_SESSION_EXPIRED") setExpired(true); }}/>
        </section>
        {step === 0 && definition.slug === "v2-bicycles" && <p>Only unpowered pedal bicycles are accepted.</p>}
        {step === 0 && (definition.slug === "v2-car-accessories-parts" || definition.slug === "v2-bike-accessories-parts") &&
          <p>Only the listed non-safety-critical accessories are accepted.</p>}
        {draftOnly && <p role="status">Draft only. {isSpecialistVehicleDraftSlug(definition.slug)
          ? "Submission requires independent verification of registration, registered ownership and authority to transfer."
          : "Submission requires independent verification of vehicle eligibility."} Keep registration numbers, certificates and personal details out of the draft and photos.</p>}
        {step === 1 && <section className={styles.card} aria-label="Category details"><h2>{label} details</h2>
          {detailsFields.map(f => <label key={f.key}><span id={`goods-field-label-${f.key}`}>{f.label}{f.required ? " *" : " (optional)"}</span>
            {f.kind === "text" && f.choices ? <select aria-labelledby={`goods-field-label-${f.key}`} required={f.required} value={draft.fields[f.key] ?? ""}
              onChange={e => update("fields", { ...draft.fields, [f.key]: e.target.value })}>
              <option value="">Choose an option</option>
              {f.choices.map(choice => <option key={choice}>{choice}</option>)}
            </select> : <input type={f.kind === "number" ? "number" : "text"} inputMode={f.kind === "number" ? "decimal" : undefined}
              min={f.kind === "number" ? f.min : undefined} max={f.kind === "number" ? f.max : undefined}
              step="any" maxLength={100} required={f.required} value={draft.fields[f.key] ?? ""}
              onChange={e => update("fields", { ...draft.fields, [f.key]: e.target.value })}/>}</label>)}
        </section>}
        {step === 2 && <section className={styles.card} aria-label="Condition and safety"><h2>{property ? "Property description and authority" : "Condition and description"}</h2>
          {!property && <label>Condition<select value={draft.condition} onChange={e => update("condition", e.target.value)}>
            <option value="">Choose condition</option>{Object.entries(conditions).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>}
          <label>Title<input maxLength={120} value={draft.title} onChange={e => update("title", e.target.value)}/></label>
          <label>Description<textarea maxLength={2000} value={draft.description} onChange={e => update("description", e.target.value)}/></label>
          <label>Known faults or wear<textarea maxLength={500} value={draft.defects} onChange={e => update("defects", e.target.value)}/></label>
          <label className="flex items-start gap-3"><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={draft.safety}
            onChange={e => update("safety", e.target.checked)}/>{property ? "I have authority to make this offer and have disclosed material restrictions." : "I own this item and have checked that it is allowed, safe to use and free of known recalls."}</label>
          <label className="flex items-start gap-3"><input type="checkbox" style={{ width: 20, minHeight: 20 }}
            checked={draft.power} onChange={e => update("power", e.target.checked)}/>{property ? "My listing and photos omit private addresses, personal details and documents." : definition.risk === "general"
              ? "If this item uses power, I checked that its wiring and batteries are free of damage, overheating, swelling and leaks."
              : "I checked for unsafe wiring, overheating and damaged, swollen or leaking batteries. None apply to this item."}</label>
        </section>}
        {step === 3 && <section className={styles.card} aria-label="Price">{property ? <><h2>Property terms</h2>
          <label>Offer<select aria-label="Offer" value={draft.fields.offer ?? ""} onChange={e => update("fields", { ...draft.fields, offer: e.target.value })}>
            <option value="">Choose an offer</option>
            {definition.fields.flatMap(f => f.key === "offer" && f.kind === "text" ? (f.choices ?? []).map(choice => <option key={choice}>{choice}</option>) : [])}
          </select></label>
          {[[ "amount_paise", sale ? "Sale price (₹)" : "Monthly rent (₹)"], ...(!sale ? [["deposit_paise", "Deposit (₹)"], ["charges_paise", "Monthly charges (₹)"]] : [])].map(([key, name]) =>
            <label key={key}>{name}<input inputMode="decimal" value={draft.fields[key] ?? ""} onChange={e => update("fields", { ...draft.fields, [key]: e.target.value })}/></label>)}
          </> : <><h2>Sell or give away</h2>
          <div className={styles.choices}><button type="button" className={styles.button} aria-pressed={!draft.giveaway} onClick={() => update("giveaway", false)}>Sell</button>
            <button type="button" className={styles.button} aria-pressed={draft.giveaway} onClick={() => update("giveaway", true)}>Give away</button></div>
          {!draft.giveaway && <><label>Price (₹)<input inputMode="decimal" maxLength={12} value={draft.price} onChange={e => update("price", e.target.value)}/></label>
            <label className="flex items-center gap-3"><input type="checkbox" style={{ width: 20, minHeight: 20 }}
              checked={draft.negotiable} onChange={e => update("negotiable", e.target.checked)}/>Negotiable</label></>}</>}
        </section>}
        <section className={styles.card} style={{ display: step === 4 ? undefined : "none" }} aria-label="Location"><h2>{property ? "Property locality" : "Where can buyers meet you?"}</h2>{property && <p>Share only the locality. Leave unit numbers, documents, landlord details and contact information out of the ad and photos.</p>}
          {loaded && <PincodeLocationPicker cities={cities} hideLandmark onResolvedChange={setLocation}
            initialPinCode={draft.location.pin_code} initialCityId={draft.location.city_id} initialLocalityId={draft.location.locality_id}/>}
        </section>
        {step === REVIEW_STEP && <PostingWizardReview labels={labels} onNavigate={navigate}>Use FairSwap chat. Never pay in advance, scan a QR code to receive money or share an OTP or UPI PIN.</PostingWizardReview>}
      </fieldset>
    </div><MobileBuyerPreview title={draft.title} emptyTitle={label} description={[draft.description, draft.defects].filter(Boolean).join("\n")}
      photos={photos} area={area} price={property ? (typeof fields.amount_paise === "number" ? `₹${(fields.amount_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${sale ? "" : " / month"}` : "Property terms") : draft.giveaway ? "Free" : paise === null ? "Your price" : `₹${(paise / 100).toLocaleString("en-IN")}`}
      facts={[conditions[draft.condition as keyof typeof conditions] ?? "", ...detailsFields.flatMap(f => draft.fields[f.key] ? [`${f.label}: ${draft.fields[f.key]}`] : []),
        ...(property && !sale ? [["Deposit", fields.deposit_paise], ["Monthly charges", fields.charges_paise]]
          .flatMap(([name, value]) => typeof value === "number" ? [`${name}: ₹${(value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] : []) : [])]}/>
    </div>
    <PostingWizardFooter step={step} busy={busy} continueDisabled={(draftOnly && step === REVIEW_STEP) || disabled || expired || (unverifiedSession && !frozen)}
      saveStatus={saveError ? "Device save unavailable" : loaded ? "Draft kept on this device" : "Checking saved draft…"}
      onBack={() => step === 0 ? router.push(CANONICAL_POSTING_PATH) : navigate(step - 1)}
      onContinue={() => {
        if (step === REVIEW_STEP) { void submit(); return; }
        const issue = validations[step];
        if (issue) setError(issue);
        else navigate(step + 1);
      }}/>
  </div>;
}
