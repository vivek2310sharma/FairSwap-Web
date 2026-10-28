import { FAILSAFE_MS, SEEN_KEY } from "./neighbourhood-intro";

/**
 * Homepage-only, pre-hydration first-frame gate. Rendered first in the home page, so this inline script
 * runs while the document is still being parsed, before the homepage content that follows can paint.
 * On an eligible first visit (storage usable and unseen, motion allowed, no Save-Data signal) it flags
 * `<html data-fs-intro="pending">`; `globals.css` then paints the forest intro backdrop. The intro clears
 * the flag once its dialog is open. The timer is the fail-open: if hydration or the art never arrives
 * the homepage is revealed anyway, after at most 4s. No-JS users never get the flag.
 */
export const INTRO_GATE_FAILSAFE_MS = FAILSAFE_MS;

const script = `(function(){var d=document.documentElement,k=${JSON.stringify(SEEN_KEY)};try{if(localStorage.getItem(k)==="1")return;localStorage.setItem(k+".probe","1");localStorage.removeItem(k+".probe")}catch(e){return}try{if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)return}catch(e){}try{var c=navigator.connection;if(c&&c.saveData)return}catch(e){}d.setAttribute("data-fs-intro","pending");setTimeout(function(){d.removeAttribute("data-fs-intro")},${INTRO_GATE_FAILSAFE_MS})})()`;

export function IntroGate() {
  // Static, constant string: no user input reaches this script.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
