"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AURA_SRC, HUB, INTRO_LABEL, LOGO_SRC, MAP_SRC, TIMELINE, VIEWBOX,
  eligibility, layoutForWidth, markSeen, railSlots, readEnv, tokenFrames, tokenImage, tokensFor, tracerFrames,
  type IntroLayout, type MotionFrame,
} from "./neighbourhood-intro";
import styles from "./NeighbourhoodMapIntro.module.css";

/** Drops the pre-hydration first-frame backdrop set by `IntroGate`. */
function releaseGate() {
  document.documentElement.removeAttribute("data-fs-intro");
}

type Keyframes = { offset: number; opacity?: number; transform?: string }[];

/** Opacity/transform track from [ms, opacity, transform?] stops, as fractions of the layout total. */
function track(total: number, stops: [ms: number, opacity: number, transform?: string][]): Keyframes {
  // Hold the last stop through the end: an implicit final keyframe would snap back to the resting (visible) style.
  const last = stops[stops.length - 1];
  return [...stops, [total, last[1], last[2]] as (typeof stops)[number]].map(([ms, opacity, transform], i, all) => ({
    offset: i === all.length - 1 ? 1 : Math.min(0.9999, Math.max(0, ms / total)), opacity, ...(transform ? { transform } : {}),
  }));
}

/**
 * First-visit-per-device Neighbourhood Discovery Flow, a native modal `<dialog>` rendered after the page,
 * so the real SSR homepage is already underneath. The browser makes the background inert and fires `cancel`
 * on Escape. Animation is Web Animations (transform/opacity only) driven by the locked timeline; one timer
 * ends the flow and everything is cancelled on exit. It never fetches data and never blocks the homepage.
 */
export function NeighbourhoodMapIntro() {
  const [layout, setLayout] = useState<IntroLayout | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

  const close = useCallback(() => {
    const el = dialog.current;
    if (el?.open) { try { el.close(); } catch { /* already closed */ } }
    setLayout(null);
    releaseGate();
    const previous = previousFocus.current;
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
  }, []);

  // Browser-only state (storage, matchMedia, connection) must be read after hydration, never during SSR.
  useEffect(() => {
    if (eligibility(readEnv(window)) !== "play" || !markSeen(window.localStorage)) { releaseGate(); return; }
    previousFocus.current = document.activeElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayout(layoutForWidth(window.innerWidth));
  }, []);

  useEffect(() => {
    if (!layout) return;
    const root = dialog.current;
    const area = stage.current;
    if (!root || !area) return;
    if (!root.open) {
      if (typeof root.showModal === "function") root.showModal();
      else root.setAttribute("open", ""); // environments without <dialog> modal support
    }
    skip.current?.focus();
    releaseGate(); // dialog now shows the same forest backdrop, so dropping the pre-paint one is invisible

    const { total, beats } = TIMELINE[layout];
    const animations: Animation[] = [];
    const run = (el: Element | null, keyframes: Keyframes | MotionFrame[]) => {
      if (!el || typeof el.animate !== "function") return;
      animations.push(el.animate(keyframes as Keyframe[], { duration: total, fill: "both", easing: "linear" }));
    };

    const rect = area.getBoundingClientRect();
    const size = { w: rect.width, h: rect.height };
    const railEl = document.getElementById("home-category-rail");
    const railRect = railEl?.getBoundingClientRect();
    const tokens = tokensFor(layout);
    const slots = railSlots(size, railRect ? { left: railRect.left - rect.left, top: railRect.top - rect.top, width: railRect.width, height: railRect.height } : null, tokens.length);
    const q = (name: string) => root.querySelector(`[data-layer="${name}"]`);
    const [a0, a1] = beats.A;
    const [, c1] = beats.C;
    const [d0, d1] = beats.D;
    const [e0, e1] = beats.E;

    run(q("map"), track(total, [[0, 0.65], [a1, 1], [e0, 1], [e0 + (e1 - e0) * 0.45, 0.12], [e1, 0]]));
    run(q("scrim"), track(total, [[0, 1], [e0, 1], [e1, 0]]));
    run(q("sweep"), track(total, [[a0, 0, "translateX(-60%)"], [a0 + (a1 - a0) * 0.5, 0.35, "translateX(0%)"], [a1, 0, "translateX(60%)"]]));
    run(q("ring"), track(total, [[0, 0, "translate(-50%, -50%) scale(1)"], [a1, 0.16, "translate(-50%, -50%) scale(1)"], [c1, 0.22, "translate(-50%, -50%) scale(1.25)"], [d1, 0, "translate(-50%, -50%) scale(0.45)"]]));
    run(q("halo"), track(total, [[d0, 0, "translate(-50%, -50%) rotate(0deg)"], [d0 + (d1 - d0) * 0.3, 0.7, "translate(-50%, -50%) rotate(110deg)"], [d1, 0, "translate(-50%, -50%) rotate(360deg)"]]));
    run(q("logo"), track(total, [
      [0, 0, "translate(-50%, -50%) scale(0.92)"], [d0 + (d1 - d0) * 0.3, 0, "translate(-50%, -50%) scale(0.92)"],
      [d1, 1, "translate(-50%, -50%) scale(1)"], [e0 + (e1 - e0) * 0.2, 1, "translate(-50%, -50%) scale(1)"],
      [e0 + (e1 - e0) * 0.8, 0, "translate(-50%, -50%) scale(0.97)"],
    ]));
    run(q("rule"), track(total, [[0, 0], [e0, 0], [e0 + (e1 - e0) * 0.5, 0.55], [e1, 0]]));
    tokens.forEach((token, index) => {
      run(q(`token-${token.id}`), tokenFrames(token, layout, index, tokens.length, size, slots[index]));
      run(q(`tracer-${token.id}`), tracerFrames(token, layout, size));
    });

    const timer = window.setTimeout(close, total);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [layout, close]);

  useEffect(() => releaseGate, []);

  if (!layout) return null;
  const view = VIEWBOX[layout];
  const fail = (id: string) => setFailed((current) => new Set(current).add(id));
  return (
    <dialog ref={dialog} aria-modal="true" aria-label={INTRO_LABEL} className={styles.overlay} data-testid="neighbourhood-intro" data-layout={layout}
      onCancel={(event) => { event.preventDefault(); close(); }}>
      <button ref={skip} type="button" onClick={close} className={styles.skip}>Skip intro</button>
      <div className={styles.scrim} data-layer="scrim" aria-hidden="true" />
      <div ref={stage} className={styles.stage} data-layer="stage" aria-hidden="true" style={{ "--vb-w": view.w, "--vb-h": view.h } as React.CSSProperties}>
        {/* Local decorative SVG map: a plain img keeps it off the optimizer and fails open via onError. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-layer="map" className={styles.map} src={MAP_SRC[layout]} alt="" width={view.w} height={view.h} decoding="async" onError={close} />
        <span data-layer="sweep" className={styles.sweep} />
        <span data-layer="rule" className={styles.rule} />
        <span data-layer="ring" className={styles.ring} style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }} />
        <span data-layer="halo" className={styles.halo} style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }} />
        {tokensFor(layout).map((token) => {
          const at = token[layout]!;
          if (failed.has(token.id)) return null;
          return (
            <span key={token.id} className={styles.slot} style={{ left: `${at.x}%`, top: `${at.y}%` }}>
              <span data-layer={`tracer-${token.id}`} className={styles.tracer} />
              <span data-layer={`token-${token.id}`} data-token={token.id} className={styles.token}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.aura} src={AURA_SRC} alt="" width={128} height={128} />
                {/* Existing allowlisted category photo; a missing file drops just this marker. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.photo} src={tokenImage(token)} alt="" width={84} height={84} decoding="async" onError={() => fail(token.id)} />
                <span className={styles.label}>{token.label}</span>
              </span>
            </span>
          );
        })}
        <span data-layer="logo" className={styles.logo} style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
          {/* Official logo, unchanged, in an opaque pill for contrast. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" width={240} height={62} onError={close} />
        </span>
      </div>
    </dialog>
  );
}
