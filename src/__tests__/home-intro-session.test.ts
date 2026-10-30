import { describe, expect, it, vi } from "vitest";
import { PALETTES } from "@/lib/home-intro/palettes";
import { INTRO_GATE_SCRIPT } from "@/components/home/IntroGate";
import { introSessionConfig, markIntroSeen, resolveIntroSession, type IntroDecision } from "@/lib/home-intro/session";

const cfg = introSessionConfig(PALETTES.map((p) => p.id));

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
}

type Options = { session?: Storage; local?: Storage; reduced?: boolean; saveData?: boolean; sessionThrows?: boolean; localThrows?: boolean };

/** A minimal browser tab: its own sessionStorage, a localStorage shared by the whole "browser", and page lifecycle events. */
function makeTab(options: Options = {}) {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const win = {
    sessionStorage: options.session ?? new MemoryStorage(),
    localStorage: options.local ?? new MemoryStorage(),
    matchMedia: (query: string) => ({ matches: !!options.reduced && query.includes("reduce") }),
    navigator: { connection: options.saveData ? { saveData: true } : undefined },
    crypto: { randomUUID: () => `tab-${Math.random().toString(36).slice(2)}` },
    addEventListener: (type: string, fn: (event: unknown) => void) => handlers.set(type, [...(handlers.get(type) ?? []), fn]),
  } as unknown as Window;
  if (options.sessionThrows) Object.defineProperty(win, "sessionStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  if (options.localThrows) Object.defineProperty(win, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  const fire = (type: string, event: unknown = {}) => (handlers.get(type) ?? []).forEach((fn) => fn(event));
  return { win, fire };
}

/** Plays a document: resolve, then mark seen exactly like the component does when playback begins. */
function visit(tab: ReturnType<typeof makeTab>): IntroDecision {
  const decision = resolveIntroSession(tab.win, cfg);
  const snapshot = { ...decision }; // marking seen updates the live decision; report what it was on arrival
  if (decision.reason === "play") expect(markIntroSeen(tab.win, cfg, decision)).toBe(true);
  return snapshot;
}
/** Same tab, new document (refresh / full navigation): memo gone, pagehide fired first. */
function reload(tab: ReturnType<typeof makeTab>) {
  tab.fire("pagehide");
  delete (tab.win as unknown as { __fsIntro?: unknown }).__fsIntro;
}

describe("tab-session playback policy", () => {
  it("plays on the first visit and marks it seen when playback begins", () => {
    const tab = makeTab();
    const decision = resolveIntroSession(tab.win, cfg);
    expect(decision.reason).toBe("play");
    expect(PALETTES.map((p) => p.id)).toContain(decision.theme);
    expect(tab.win.sessionStorage.getItem(cfg.seen)).toBeNull(); // deciding never marks seen
    expect(markIntroSeen(tab.win, cfg, decision)).toBe(true);
    expect(tab.win.sessionStorage.getItem(cfg.seen)).toBe(decision.tab);
  });

  it("does not replay on refresh", () => {
    const tab = makeTab();
    const first = visit(tab);
    reload(tab);
    const second = resolveIntroSession(tab.win, cfg);
    expect(second.reason).toBe("seen");
    expect(second.tab).toBe(first.tab);
    expect(second.theme).toBe(first.theme); // palette is stable within the tab session
    reload(tab);
    expect(resolveIntroSession(tab.win, cfg).reason).toBe("seen");
  });

  it("does not replay on internal navigation (same document, home mounts again)", () => {
    const tab = makeTab();
    visit(tab);
    for (let i = 0; i < 3; i++) expect(resolveIntroSession(tab.win, cfg).reason).toBe("seen");
  });

  it("keeps no persistent eligibility: localStorage holds only a live-tab id index, never a seen flag or a cooldown", () => {
    const local = new MemoryStorage();
    const tab = makeTab({ local });
    visit(tab);
    expect(local.length).toBe(1);
    expect(local.getItem(cfg.live)).toContain((tab.win.sessionStorage.getItem(cfg.tab))!);
    // Same browser, brand new tab days later: eligible again, nothing carried over.
    const later = makeTab({ local });
    expect(visit(later).reason).toBe("play");
  });

  it("gives each independent tab its own intro", () => {
    const local = new MemoryStorage();
    const a = makeTab({ local });
    const b = makeTab({ local });
    const first = visit(a);
    const second = visit(b);
    expect(first.reason).toBe("play");
    expect(second.reason).toBe("play");
    expect(second.tab).not.toBe(first.tab);
    // Each tab then stays seen on its own.
    reload(a); reload(b);
    expect(resolveIntroSession(a.win, cfg).reason).toBe("seen");
    expect(resolveIntroSession(b.win, cfg).reason).toBe("seen");
  });

  it("treats a tab opened with copied sessionStorage (duplicate / opener) as a new tab", () => {
    const local = new MemoryStorage();
    const original = makeTab({ local });
    const first = visit(original);
    const copiedSession = new MemoryStorage();
    for (let i = 0; i < original.win.sessionStorage.length; i++) {
      const key = original.win.sessionStorage.key(i)!;
      copiedSession.setItem(key, original.win.sessionStorage.getItem(key)!);
    }
    expect(copiedSession.getItem(cfg.seen)).toBe(first.tab); // the copy really did inherit "seen"
    const duplicate = makeTab({ local, session: copiedSession });
    const copy = resolveIntroSession(duplicate.win, cfg);
    expect(copy.reason).toBe("play");
    expect(copy.tab).not.toBe(first.tab);
    expect(markIntroSeen(duplicate.win, cfg, copy)).toBe(true);
    // Both tabs keep their own state afterwards.
    reload(original); reload(duplicate);
    expect(resolveIntroSession(original.win, cfg).reason).toBe("seen");
    expect(resolveIntroSession(duplicate.win, cfg).reason).toBe("seen");
  });

  it("does not mistake a refreshed tab for a copy once its old page has gone (pagehide clears the registry)", () => {
    const local = new MemoryStorage();
    const tab = makeTab({ local });
    visit(tab);
    reload(tab);
    expect(JSON.parse(local.getItem(cfg.live) ?? "{}")).toEqual({});
    expect(resolveIntroSession(tab.win, cfg).reason).toBe("seen");
  });

  it("re-registers a tab restored from the back/forward cache", () => {
    const local = new MemoryStorage();
    const tab = makeTab({ local });
    const first = visit(tab);
    tab.fire("pagehide");
    expect(local.getItem(cfg.live)).not.toContain(first.tab);
    tab.fire("pageshow", { persisted: true });
    expect(local.getItem(cfg.live)).toContain(first.tab);
  });

  it("still works per tab when localStorage is blocked (copy detection is simply unavailable)", () => {
    const tab = makeTab({ localThrows: true });
    expect(visit(tab).reason).toBe("play");
    reload(tab);
    expect(resolveIntroSession(tab.win, cfg).reason).toBe("seen");
  });

  it("never plays, and never loops, when sessionStorage is unavailable", () => {
    const tab = makeTab({ sessionThrows: true });
    const decision = resolveIntroSession(tab.win, cfg);
    expect(decision.reason).toBe("storage-unavailable");
    expect(markIntroSeen(tab.win, cfg, decision)).toBe(false);
  });

  it("respects prefers-reduced-motion and Save-Data without marking anything seen", () => {
    const reduced = makeTab({ reduced: true });
    expect(resolveIntroSession(reduced.win, cfg).reason).toBe("reduced-motion");
    expect(reduced.win.sessionStorage.getItem(cfg.seen)).toBeNull();
    const saver = makeTab({ saveData: true });
    expect(resolveIntroSession(saver.win, cfg).reason).toBe("save-data");
  });

  it("is a skip-proof mark: seen is written at playback start, so skipping (or reloading mid-play) cannot bring it back", () => {
    const tab = makeTab();
    const decision = resolveIntroSession(tab.win, cfg);
    markIntroSeen(tab.win, cfg, decision); // playback begins
    // ...visitor skips or reloads before it ends: nothing further is written, and the next document is still "seen".
    reload(tab);
    expect(resolveIntroSession(tab.win, cfg).reason).toBe("seen");
  });

  it("memoises one decision per document so the gate script and the component agree", () => {
    const tab = makeTab();
    const a = resolveIntroSession(tab.win, cfg);
    const b = resolveIntroSession(tab.win, cfg);
    expect(b).toBe(a);
  });
});

describe("shipped gate script", () => {
  const run = () => {
    document.documentElement.removeAttribute("data-fs-intro");
    document.documentElement.removeAttribute("style");
    delete (window as unknown as { __fsIntro?: unknown }).__fsIntro;
    // The same source the page inlines, evaluated against the real jsdom window.
    new Function(INTRO_GATE_SCRIPT)();
  };

  it("flags an eligible new tab, paints the session palette, and does not mark seen", () => {
    sessionStorage.clear(); localStorage.clear();
    run();
    expect(document.documentElement.getAttribute("data-fs-intro")).toBe("pending");
    const id = sessionStorage.getItem(cfg.theme)!;
    const palette = PALETTES.find((p) => p.id === id)!;
    expect(document.documentElement.style.getPropertyValue("--fs-intro-bg")).toBe(palette.bg);
    expect(document.documentElement.style.getPropertyValue("--fs-intro-bg2")).toBe(palette.bg2);
    expect(sessionStorage.getItem(cfg.seen)).toBeNull();
  });

  it("does not flag a tab that has already seen the intro (refresh)", () => {
    sessionStorage.clear(); localStorage.clear();
    run();
    const decision = (window as unknown as { __fsIntro: IntroDecision }).__fsIntro;
    markIntroSeen(window, cfg, decision);
    window.dispatchEvent(new Event("pagehide"));
    run();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });

  it("does not flag under reduced motion", () => {
    sessionStorage.clear(); localStorage.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    try { run(); } finally { vi.unstubAllGlobals(); }
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });

  it("swallows its own failures so the homepage is never blocked", () => {
    sessionStorage.clear();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    try { expect(run).not.toThrow(); } finally { spy.mockRestore(); }
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });
});