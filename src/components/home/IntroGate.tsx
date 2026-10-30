import { PALETTES } from "@/lib/home-intro/palettes";
import { introSessionConfig, resolveIntroSession } from "@/lib/home-intro/session";

/**
 * Homepage-only, pre-hydration first-frame gate. Rendered first in the home page, so this inline script runs while the
 * document is still being parsed, before the homepage content that follows can paint. It runs the tab-session policy
 * (`resolveIntroSession`, inlined so the gate and the component share one implementation). On an eligible tab (unseen in this
 * tab session, motion allowed, no Save-Data signal) it flags `<html data-fs-intro="pending">` and sets the session palette's
 * background, so `globals.css` paints the same backdrop the intro dialog opens with. The intro clears the flag once its dialog
 * is open. The timer is the fail-open: if hydration never arrives the homepage is revealed anyway, after at most 4s. It never
 * marks the intro seen (the component does that when playback begins). No-JS users never get the flag.
 */
export const INTRO_GATE_FAILSAFE_MS = 4000;

const backgrounds = Object.fromEntries(PALETTES.map((p) => [p.id, [p.bg, p.bg2]]));
const config = introSessionConfig(PALETTES.map((p) => p.id));

const script = `(function(){try{var d=(${resolveIntroSession.toString()})(window,${JSON.stringify(config)});if(d.reason!=="play")return;var h=document.documentElement,b=${JSON.stringify(backgrounds)}[d.theme];if(b){h.style.setProperty("--fs-intro-bg",b[0]);h.style.setProperty("--fs-intro-bg2",b[1])}h.setAttribute("data-fs-intro","pending");setTimeout(function(){h.removeAttribute("data-fs-intro")},${INTRO_GATE_FAILSAFE_MS})}catch(e){}})()`;

/** Exposed so tests can execute the exact script the page ships. */
export const INTRO_GATE_SCRIPT = script;

export function IntroGate() {
  // Static string built from constants and this repo's own function source: no user input reaches this script.
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}