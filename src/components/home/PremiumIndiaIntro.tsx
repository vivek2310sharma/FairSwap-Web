"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MOTIFS } from "@/lib/home-intro/motifs";
import { PALETTES, type IntroPalette } from "@/lib/home-intro/palettes";
import {
  TIMING, chooseFamily, chooseGreetings, createTaglineBag, deviceForWidth, greetingFontSize, layoutMotifs, paletteById,
  type Greeting, type IntroDevice, type Placement,
} from "@/lib/home-intro/selectors";
import { introSessionConfig, markIntroSeen, resolveIntroSession, REPLAY_INTRO_EVENT } from "@/lib/home-intro/session";
import styles from "./PremiumIndiaIntro.module.css";

export const INTRO_LABEL = "FairSwap introduction";
/** Last-resort fail-open: whatever happens, the intro is gone by now. The CSS safety net on .overlay is slightly later. */
const FAILSAFE_MS = 9000;
const config = introSessionConfig(PALETTES.map((p) => p.id));
const nextTagline = createTaglineBag();

type Run = {
  id: number;
  palette: IntroPalette;
  device: IntroDevice;
  tagline: string;
  greetings: Greeting[];
  placements: Placement[];
  /** Manual replays never touch session eligibility. */
  replay: boolean;
};

/** Drops the pre-hydration first-frame backdrop set by `IntroGate`. */
function releaseGate() {
  const root = document.documentElement;
  root.removeAttribute("data-fs-intro");
  root.style.removeProperty("--fs-intro-bg");
  root.style.removeProperty("--fs-intro-bg2");
}

const prefersReducedMotion = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * V19 premium multilingual intro, a native modal `<dialog>` rendered after the page so the real SSR homepage is already
 * underneath. Plays automatically once per independent browser-tab session (policy in lib/home-intro/session.ts); Skip and
 * manual Replay (`fairswap:replay-intro` event) always work. Palette, motif family, tagline, greetings and motif scatter are
 * chosen after hydration. Only the centre greeting changes quickly. It never fetches data and never blocks the homepage.
 */
export function PremiumIndiaIntro() {
  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const begun = useRef(false);
  const runId = useRef(0);
  const active = useRef(false);

  const close = useCallback(() => {
    active.current = false;
    const el = dialog.current;
    if (el?.open) { try { el.close(); } catch { /* already closed */ } }
    setRun(null);
    setClosing(false);
    releaseGate();
    const previous = previousFocus.current;
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  }, []);

  /** Builds one playback. `reduced` replays go straight to the final state. */
  const start = useCallback((themeId: string, replay: boolean) => {
    const palette = paletteById(themeId) ?? PALETTES[0];
    const device = deviceForWidth(window.innerWidth);
    const family = chooseFamily(Math.random);
    const greetings = chooseGreetings(Math.random);
    active.current = true;
    previousFocus.current = document.activeElement;
    setLeaving(false);
    setClosing(false);
    setIndex(replay && prefersReducedMotion() ? greetings.length : 0);
    setRun({
      id: ++runId.current, palette, device, greetings, replay,
      tagline: nextTagline(),
      placements: layoutMotifs(family, device, window.innerWidth, window.innerHeight, Math.random),
    });
  }, []);

  // Browser-only state (storage, matchMedia, connection) must be read after hydration, never during SSR.
  useEffect(() => {
    if (begun.current) return;
    begun.current = true;
    try {
      const decision = resolveIntroSession(window, config);
      // Seen is written as playback begins, so a refresh mid-play, or a skip, never brings it back.
      if (decision.reason !== "play" || !markIntroSeen(window, config, decision)) { releaseGate(); return; }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      start(decision.theme, false);
    } catch {
      releaseGate();
    }
  }, [start]);

  // Manual replay: allowed any time the intro is idle; reuses the tab's palette and does not reset eligibility.
  useEffect(() => {
    const onReplay = () => {
      if (active.current) return;
      try { start(resolveIntroSession(window, config).theme, true); } catch { releaseGate(); }
    };
    window.addEventListener(REPLAY_INTRO_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_INTRO_EVENT, onReplay);
  }, [start]);

  const runKey = run?.id;
  // Open the modal and arm the fail-open timer.
  useEffect(() => {
    const root = dialog.current;
    if (!run || !root) return;
    try {
      if (!root.open) {
        if (typeof root.showModal === "function") root.showModal();
        else root.setAttribute("open", ""); // environments without <dialog> modal support
      }
      skip.current?.focus();
    } catch {
      // Fail open: a modal that cannot open must never leave the homepage covered.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      close();
      return;
    }
    releaseGate(); // dialog opens on the same backdrop, so dropping the pre-paint one is invisible
    const failsafe = window.setTimeout(close, FAILSAFE_MS);
    return () => window.clearTimeout(failsafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, close]);

  // Greeting sequence from the prototype: first after 270ms, then 105ms gaps and a 75ms leave, scaled by the Faster speed (.75).
  useEffect(() => {
    if (!run || index >= run.greetings.length) return;
    let timer = window.setTimeout(function tick() {
      setLeaving(true);
      timer = window.setTimeout(() => {
        setLeaving(false);
        setIndex((i) => i + 1);
      }, TIMING.leave);
    }, index === 0 ? TIMING.first : TIMING.gap);
    return () => window.clearTimeout(timer);
  }, [run, index]);

  // Final FairSwap reveal holds briefly, then fades into the homepage.
  const ended = !!run && index >= run.greetings.length;
  useEffect(() => {
    if (!ended) return;
    let fade = 0;
    const hold = window.setTimeout(() => {
      setClosing(true);
      fade = window.setTimeout(close, TIMING.fade);
    }, TIMING.hold);
    return () => { window.clearTimeout(hold); window.clearTimeout(fade); };
  }, [ended, close]);

  useEffect(() => releaseGate, []);

  if (!run) return null;
  const { palette, device, greetings } = run;
  const current = greetings[Math.min(index, greetings.length - 1)];
  const vars = { "--bg": palette.bg, "--bg2": palette.bg2, "--accent": palette.accent, "--text": palette.text, "--art": palette.art } as React.CSSProperties;
  return (
    <dialog ref={dialog} aria-modal="true" aria-label={INTRO_LABEL} className={`${styles.overlay} ${closing ? styles.closing : ""}`}
      data-testid="premium-intro" data-device={device} data-theme={palette.id} data-replay={run.replay ? "true" : "false"} data-ended={ended ? "true" : "false"}
      onCancel={(event) => { event.preventDefault(); close(); }}>
      <section className={`${styles.stage} ${styles[device]} ${ended ? styles.stageEnd : ""}`} style={vars}>
        <div className={styles.starfield} aria-hidden="true" />
        <div className={styles.art} data-testid="intro-art" aria-hidden="true">
          {run.placements.map((m) => (
            <div key={m.kind} className={styles.ornament} data-motif={m.kind}
              style={{ left: m.x, top: m.y, width: m.size, "--float-duration": `${m.duration.toFixed(1)}s`, "--float-delay": `${m.delay.toFixed(1)}s`, "--float-x": `${m.floatX.toFixed(1)}px` } as React.CSSProperties}>
              <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOTIFS[m.kind] }} />
            </div>
          ))}
        </div>
        <div className={styles.centerGuard} aria-hidden="true" />
        <header className={styles.brandtop}><div className={styles.made}>MADE IN INDIA</div></header>
        <button ref={skip} type="button" onClick={close} className={styles.skip}>Skip intro</button>
        <div className={styles.center}>
          {!ended && (
            <div key={index} className={`${styles.greeting} ${leaving ? styles.leave : styles.arrive}`} lang={current.lang} data-testid="intro-greeting" aria-hidden="true"
              style={{ fontSize: greetingFontSize(device, current.text) || undefined }}>{current.text}</div>
          )}
          <div className={`${styles.officialLogo} ${styles.reveal}`} aria-hidden="true"><span className={styles.logoFallback}>FairSwap</span></div>
          <div className={styles.dividerline} />
          <div className={styles.tagline} data-testid="intro-tagline" aria-hidden="true">{run.tagline}</div>
        </div>
        <footer className={styles.foot}>
          <div><div className={styles.progress}><i style={{ width: `${ended ? 100 : Math.round(((index + 1) * 100) / (greetings.length + 1))}%` }} /></div></div>
        </footer>
        <p className={styles.srOnly} role="status">{ended ? `FairSwap. ${run.tagline}` : ""}</p>
      </section>
    </dialog>
  );
}