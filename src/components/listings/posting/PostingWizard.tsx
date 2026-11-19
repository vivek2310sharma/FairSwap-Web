"use client";

import type { ReactNode, Ref } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import styles from "./Posting.module.css";

/** Five editable steps; Review is a final state, never a sixth field step. */
export type PostingSteps = readonly [string, string, string, string, string];
export const REVIEW_STEP = 5;

export function PostingWizardHeading({ category, step, headingRef }: {
  category: string; step: number; headingRef?: Ref<HTMLHeadingElement>;
}) {
  return <><p className={styles.eyebrow}>{category} · {step === REVIEW_STEP ? "REVIEW" : `STEP ${step + 1} OF 5`}</p>
    <h1 className={styles.wizardHeading} ref={headingRef} tabIndex={-1}>{step === REVIEW_STEP ? "Ready for a second life?" : "Your next owner is out there."}</h1></>;
}

export function PostingWizardSteps({ labels, step, reachable, busy, maintenance, sessionReady, onNavigate }: {
  labels: PostingSteps; step: number; reachable: number; busy: boolean;
  maintenance: boolean; sessionReady: boolean; onNavigate: (step: number) => void;
}) {
  return <ol className={styles.steps} aria-label="Posting steps">{labels.map((label, index) => <li key={label}>
    <button type="button" disabled={busy || maintenance || (index > step && (!sessionReady || index > reachable))}
      data-complete={index < reachable} aria-label={`Step ${index + 1}: ${label}`}
      aria-current={step === index ? "step" : undefined} onClick={() => onNavigate(index)}>
      <b>{index < reachable ? <><Check aria-hidden="true" size={18}/><span className="sr-only">Completed</span></> : index + 1}</b><span>{label}</span>
    </button></li>)}</ol>;
}

export function PostingWizardReview({ labels, onNavigate, children }: {
  labels: PostingSteps; onNavigate: (step: number) => void; children: ReactNode;
}) {
  return <section className={styles.card} aria-label="Submission review"><h2>Review your listing</h2>
    <p>Check your photos and details in the buyer preview.</p>
    <fieldset><legend>Listing plan</legend><label className="flex min-h-12 items-center gap-3">
      <input type="radio" name="plan_id" value="free-v1" checked readOnly style={{ width: 20, minHeight: 20 }}/>
      Free — submit your listing for review</label></fieldset>
    <p className={styles.muted}>{children}</p>
    {labels.map((label, index) => <button type="button" key={label} className={styles.button} onClick={() => onNavigate(index)}>Edit {label}</button>)}
  </section>;
}

/** Controllers retain all session, validation, idempotency and recovery state. */
export function PostingWizardFooter({ step, busy, continueDisabled, saveStatus, onBack, onContinue }: {
  step: number; busy: boolean; continueDisabled: boolean; saveStatus: string;
  onBack: () => void; onContinue: () => void;
}) {
  return <footer className={styles.footer}><div><span className={styles.save} role="status">{saveStatus}</span>
    <button type="button" className={styles.button} disabled={busy} onClick={onBack}><ArrowLeft size={18} aria-hidden="true"/>Back</button>
    <button type="button" className={styles.primary} disabled={busy || continueDisabled} onClick={onContinue}>
      {busy ? "Submitting…" : step === REVIEW_STEP ? "Submit for review" : step === 4 ? "Review listing" : "Continue"}
      {step < REVIEW_STEP && <ArrowRight size={18} aria-hidden="true"/>}</button>
  </div></footer>;
}
