/**
 * Homepage-only, pre-hydration first-frame gate. Rendered first in the home page, so this
 * inline script runs while the document is still being parsed, before the homepage content
 * that follows it can paint. On an eligible first visit (not seen in this tab, motion allowed)
 * it flags `<html data-fs-intro="pending">`; `globals.css` then paints the intro backdrop.
 * `FairSwapIntro` clears the flag once its dialog is open. The timer is the fail-open: if
 * hydration or the art never arrives, the homepage is revealed anyway. No-JS users never get
 * the flag, so the server-rendered homepage stays visible for them.
 */
export const INTRO_GATE_FAILSAFE_MS = 7000;

const script = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem("fs-intro-seen")==="1")return}catch(e){}try{if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return}catch(e){}d.setAttribute("data-fs-intro","pending");setTimeout(function(){d.removeAttribute("data-fs-intro")},${INTRO_GATE_FAILSAFE_MS})})()`;

export function IntroGate() {
  // Static, constant string: no user input reaches this script.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
