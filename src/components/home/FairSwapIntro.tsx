"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FAIRSWAP_ART, isCompleteArt, type FairSwapArt, type FairSwapArtImage } from "./fairswap-art";
import styles from "./FairSwapIntro.module.css";

const SEEN_KEY = "fs-intro-seen";
const DURATION_MS = 5200;
const ART_SIZES = "(max-width: 640px) 45vw, 300px";

function readSeen(): boolean {
  try { return window.sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function writeSeen() {
  try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage unavailable: intro may replay, never blocks */ }
}
function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** Drops the pre-hydration first-frame backdrop set by `IntroGate`. */
function releaseGate() {
  document.documentElement.removeAttribute("data-fs-intro");
}

function Art({ image, className, onFail }: { image: FairSwapArtImage; className: string; onFail: () => void }) {
  return (
    <picture className={className}>
      {image.avif && <source srcSet={image.avif} type="image/avif" />}
      <img src={image.src} srcSet={image.srcSet} sizes={image.srcSet ? ART_SIZES : undefined} alt="" width={image.width} height={image.height} decoding="async" onError={onFail} />
    </picture>
  );
}

/**
 * First-visit-per-tab intro, a native modal `<dialog>`: the browser contains focus
 * inside it, makes the page behind it inert, and fires `cancel` on Escape.
 * Rendered after the page, so the real homepage is already in the DOM underneath.
 * Shows nothing unless the art set is complete, motion is allowed and the intro
 * has not been seen in this tab. Runs ~5.2s and dissolves into the homepage hero.
 * The `IntroGate` backdrop is only released after the dialog is open, so the
 * homepage never shows between the first paint and the intro.
 */
export function FairSwapIntro({ art = FAIRSWAP_ART }: { art?: FairSwapArt | null }) {
  const [active, setActive] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const complete = isCompleteArt(art);

  const close = useCallback(() => {
    const el = dialog.current;
    if (el?.open) { try { el.close(); } catch { /* already closed */ } }
    setActive(false);
    writeSeen();
    releaseGate();
    const previous = previousFocus.current;
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  }, []);

  useEffect(() => {
    if (!complete || reducedMotion() || readSeen()) { releaseGate(); return; }
    previousFocus.current = document.activeElement;
    // Browser-only state (sessionStorage, matchMedia) must be read after hydration, never during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
    writeSeen();
  }, [complete]);

  useEffect(() => {
    if (!active) return;
    const el = dialog.current;
    if (el && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", ""); // environments without <dialog> modal support
    }
    skip.current?.focus();
    releaseGate(); // dialog is now showing the same backdrop: safe to drop the pre-paint one
    const timer = window.setTimeout(close, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [active, close]);

  useEffect(() => releaseGate, []);

  if (!active || !isCompleteArt(art)) return null;
  return (
    <dialog ref={dialog} aria-modal="true" aria-label="FairSwap introduction" className={styles.overlay} data-testid="fairswap-intro" onCancel={(event) => { event.preventDefault(); close(); }}>
      <span className={styles.bg} aria-hidden="true" />
      <button ref={skip} type="button" onClick={close} className={styles.skip}>Skip intro</button>
      <div className={styles.stage} aria-hidden="true">
        <Art image={art.left} className={`${styles.person} ${styles.left}`} onFail={close} />
        <Art image={art.right} className={`${styles.person} ${styles.right}`} onFail={close} />
        <Art image={art.itemLeft} className={`${styles.item} ${styles.itemLeft}`} onFail={close} />
        <Art image={art.itemRight} className={`${styles.item} ${styles.itemRight}`} onFail={close} />
        <span className={styles.ripple} />
        <span className={styles.glow} />
        <Art image={art.handshake} className={styles.handshake} onFail={close} />
        <div className={styles.logo}>
          {/* Official logo asset; plain img keeps it out of the optimizer path so it renders immediately. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/FairSwap_Web_Logo_Transparent.png" alt="" width={280} height={72} />
        </div>
      </div>
    </dialog>
  );
}
