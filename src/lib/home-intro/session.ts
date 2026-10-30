/**
 * V19 intro playback policy: once per independent browser-tab session.
 *
 * - Eligibility lives in `sessionStorage` only (no persistent localStorage eligibility, no cooldown). A refresh or internal
 *   navigation keeps the tab's sessionStorage, so it never replays.
 * - "Seen" is stored as the tab's own id, not a boolean. Browsers copy sessionStorage into duplicated tabs and tabs opened
 *   with an opener; a copy must count as a new independent tab. Live tabs register their id in a small localStorage registry
 *   (an index of ids only, never eligibility) and remove it on `pagehide`. A page that loads with an id that another live
 *   page still holds is a copy: it gets a fresh id, a fresh palette and its own intro.
 * - The session decision is made once per document by `resolveIntroSession`, which is self-contained on purpose: `IntroGate`
 *   inlines its source into a pre-hydration script, and the component calls the same function, so the two cannot drift.
 * - "Seen" is written by `markIntroSeen` when playback begins (including when the visitor then skips). Manual replay never
 *   calls it and never resets eligibility.
 */

export type IntroReason = "play" | "seen" | "reduced-motion" | "save-data" | "storage-unavailable";
export type IntroDecision = { reason: IntroReason; tab: string; theme: string };

export type IntroSessionConfig = {
  /** sessionStorage: this tab's id. */
  tab: string;
  /** sessionStorage: id of the tab that has seen the intro. */
  seen: string;
  /** sessionStorage: palette id for this tab's session (stable across replays). */
  theme: string;
  /** sessionStorage write probe. */
  probe: string;
  /** localStorage: registry of live tab ids (copy detection only). */
  live: string;
  themeIds: readonly string[];
};

export const INTRO_SESSION_CONFIG_BASE = {
  tab: "fairswap.intro.v19.tab",
  seen: "fairswap.intro.v19.seen",
  theme: "fairswap.intro.v19.theme",
  probe: "fairswap.intro.v19.probe",
  live: "fairswap.intro.v19.live",
} as const;

type IntroWindow = Window & { __fsIntro?: IntroDecision };

/* The next function is serialised into the pre-hydration gate script and must run in older mobile browsers: it deliberately
   stays ES5-style (var, catch with a binding), so the lint rules that prefer modern syntax are off for it. */
/* eslint-disable no-var, @typescript-eslint/no-unused-vars */
/**
 * Decides, once per document, whether this tab should auto-play the intro and which palette it uses. Does NOT mark seen.
 * Must stay free of references to anything outside its own body (it is serialised into the gate script) and written in
 * plain ES5 style so a transpiler cannot inject helpers.
 */
export function resolveIntroSession(win: Window, cfg: IntroSessionConfig): IntroDecision {
  var w = win as IntroWindow;
  var maxAge = 24 * 60 * 60 * 1000; // registry entries older than a day are crash leftovers
  if (w.__fsIntro) return w.__fsIntro;
  var ids = cfg.themeIds;
  var pick = function () {
    return ids[Math.floor(Math.random() * ids.length)];
  };
  var newId = function () {
    try {
      if (win.crypto && typeof win.crypto.randomUUID === "function") return win.crypto.randomUUID();
    } catch (e) {
      /* fall through */
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  };
  var result: IntroDecision;
  var ss: Storage;
  try {
    ss = win.sessionStorage;
    ss.setItem(cfg.probe, "1");
    ss.removeItem(cfg.probe);
  } catch (e) {
    result = { reason: "storage-unavailable", tab: "", theme: pick() };
    w.__fsIntro = result;
    return result;
  }

  var ls: Storage | null = null;
  try {
    ls = win.localStorage;
    ls.getItem(cfg.live);
  } catch (e) {
    ls = null;
  }
  var readLive = function (): Record<string, number> {
    try {
      var parsed = ls ? JSON.parse(ls.getItem(cfg.live) || "{}") : null;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  };

  var tab: string | null = null;
  try {
    tab = ss.getItem(cfg.tab);
  } catch (e) {
    tab = null;
  }
  var live = readLive();
  var now = Date.now();
  // Another live page holds this id: sessionStorage was copied into a duplicated / opener-linked tab.
  var copied = !!tab && typeof live[tab] === "number" && now - live[tab] < maxAge;
  var theme: string | null = null;
  try {
    theme = ss.getItem(cfg.theme);
  } catch (e) {
    theme = null;
  }
  if (!tab || copied) {
    tab = newId();
    theme = null;
  }
  if (!theme || ids.indexOf(theme) < 0) theme = pick();
  try {
    ss.setItem(cfg.tab, tab);
    ss.setItem(cfg.theme, theme);
  } catch (e) {
    result = { reason: "storage-unavailable", tab: "", theme: theme };
    w.__fsIntro = result;
    return result;
  }

  var myId: string = tab;
  var register = function (add: boolean) {
    if (!ls) return;
    try {
      var map = readLive();
      var t = Date.now();
      for (var k in map) if (typeof map[k] !== "number" || t - map[k] >= maxAge) delete map[k];
      if (add) map[myId] = t;
      else delete map[myId];
      ls.setItem(cfg.live, JSON.stringify(map));
    } catch (e) {
      /* registry is best effort */
    }
  };
  register(true);
  try {
    win.addEventListener("pagehide", function () {
      register(false);
    });
    win.addEventListener("pageshow", function (event) {
      if ((event as PageTransitionEvent).persisted) register(true);
    });
  } catch (e) {
    /* ignore */
  }

  var reduced = false;
  try {
    reduced = !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    reduced = false;
  }
  var saveData = false;
  try {
    var connection = (win.navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    saveData = !!(connection && connection.saveData);
  } catch (e) {
    saveData = false;
  }
  var seen = false;
  try {
    seen = ss.getItem(cfg.seen) === myId;
  } catch (e) {
    seen = false;
  }
  result = { reason: reduced ? "reduced-motion" : saveData ? "save-data" : seen ? "seen" : "play", tab: myId, theme: theme };
  w.__fsIntro = result;
  return result;
}

/* eslint-enable no-var, @typescript-eslint/no-unused-vars */

export function introSessionConfig(themeIds: readonly string[]): IntroSessionConfig {
  return { ...INTRO_SESSION_CONFIG_BASE, themeIds };
}

/** Marks this tab's session as having seen the intro. Called when playback begins; false if storage refuses (then do not play). */
export function markIntroSeen(win: Window, cfg: IntroSessionConfig, decision: IntroDecision): boolean {
  if (!decision.tab) return false;
  try {
    win.sessionStorage.setItem(cfg.seen, decision.tab);
    if (win.sessionStorage.getItem(cfg.seen) !== decision.tab) return false;
  } catch {
    return false;
  }
  if (decision.reason === "play") decision.reason = "seen";
  return true;
}

/** Dispatch on `window` (see `requestIntroReplay`) to replay the intro on the homepage. Never resets session eligibility. */
export const REPLAY_INTRO_EVENT = "fairswap:replay-intro";

export function requestIntroReplay(win: Window = window) {
  win.dispatchEvent(new Event(REPLAY_INTRO_EVENT));
}

/** Forgets the memoised decision so a test can simulate a fresh document. */
export function resetIntroDecision(win: Window) {
  delete (win as IntroWindow).__fsIntro;
}