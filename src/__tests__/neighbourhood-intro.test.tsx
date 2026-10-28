import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NeighbourhoodMapIntro } from "@/components/home/NeighbourhoodMapIntro";
import { IntroGate, INTRO_GATE_FAILSAFE_MS } from "@/components/home/IntroGate";
import { CategoryBento, featuredCategories } from "@/components/home/CategoryBento";
import { getCategoryImagePath } from "@/lib/categories/category-images";
import {
  AURA_SRC, FAILSAFE_MS, HUB, LOGO_SRC, MAP_SRC, MAX_ROTATION_DEG, SEEN_KEY, TIMELINE, TOKENS,
  appearWindow, bendSign, eligibility, railSlots, routePoint, tokenFrames, tokenImage, tokensFor, tracerFrames,
} from "@/components/home/neighbourhood-intro";

const stage = { w: 1440, h: 820 };
const pub = (path: string) => join(process.cwd(), "public", path);

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
}
const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
const animate = vi.fn((...args: unknown[]) => { void args; return { cancel: vi.fn() }; });
const cancels = () => animate.mock.results.map((r) => (r.value as { cancel: ReturnType<typeof vi.fn> }).cancel);
const setConnection = (value: unknown) => Object.defineProperty(navigator, "connection", { value, configurable: true });

beforeEach(() => {
  localStorage.clear(); stubMotion(false); showModal.mockClear(); animate.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  (Element.prototype as unknown as { animate: unknown }).animate = animate;
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  setConnection(undefined);
  document.documentElement.removeAttribute("data-fs-intro");
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
});

describe("locked timeline", () => {
  it("totals 3300ms desktop and 2600ms mobile with contiguous beats", () => {
    expect(TIMELINE.desktop.total).toBe(3300);
    expect(TIMELINE.mobile.total).toBe(2600);
    for (const layout of ["desktop", "mobile"] as const) {
      const beats = Object.values(TIMELINE[layout].beats);
      expect(beats[0][0]).toBe(0);
      beats.forEach((beat, i) => { if (i) expect(beat[0]).toBe(beats[i - 1][1]); });
      expect(beats[beats.length - 1][1]).toBe(TIMELINE[layout].total);
    }
    expect(TIMELINE.desktop.beats.C).toEqual([1180, 2130]);
    expect(TIMELINE.mobile.beats.D).toEqual([1630, 1990]);
  });
  it("fails open strictly after the intro and at the 4000ms bound, shared with the gate", () => {
    expect(FAILSAFE_MS).toBe(4000);
    expect(INTRO_GATE_FAILSAFE_MS).toBe(4000);
    expect(TIMELINE.desktop.total).toBeLessThan(FAILSAFE_MS);
  });
});

describe("token geometry", () => {
  it("shows six tokens on desktop and the four locked ones on mobile, at the locked nodes", () => {
    expect(tokensFor("desktop").map((t) => t.label)).toEqual(["Furniture", "Mobile Phones", "Bicycles", "Laptops", "Home Appliances", "Cameras"]);
    expect(tokensFor("mobile").map((t) => t.id)).toEqual(["furniture", "mobiles", "bicycles", "laptops"]);
    expect(TOKENS[0].desktop).toEqual({ x: 23, y: 28 });
    expect(TOKENS[3].mobile).toEqual({ x: 74, y: 69 });
    expect(HUB).toEqual({ x: 50, y: 48 });
  });
  it("uses only existing allowlisted category photos, the official logo and local SVG maps", () => {
    for (const token of TOKENS) {
      expect(getCategoryImagePath(token.slug)).toBe(tokenImage(token));
      expect(existsSync(pub(tokenImage(token)))).toBe(true);
    }
    for (const path of [LOGO_SRC, MAP_SRC.desktop, MAP_SRC.mobile, AURA_SRC]) expect(existsSync(pub(path))).toBe(true);
  });
  it("curves are opposite-handed across quadrants, end at the hub and tilt at most 8deg", () => {
    expect(bendSign({ x: 23, y: 28 })).toBe(1);
    expect(bendSign({ x: 68, y: 23 })).toBe(-1);
    expect(bendSign({ x: 19, y: 69 })).toBe(-1);
    expect(bendSign({ x: 75, y: 71 })).toBe(1);
    for (const token of TOKENS) {
      expect(Math.abs(token.rotation)).toBeLessThanOrEqual(MAX_ROTATION_DEG);
      const end = routePoint(token.desktop!, "desktop", 1);
      expect(end.x).toBeCloseTo(HUB.x, 6);
      expect(end.y).toBeCloseTo(HUB.y, 6);
      const mid = routePoint(token.desktop!, "desktop", 0.5);
      const straight = { x: (token.desktop!.x + HUB.x) / 2, y: (token.desktop!.y + HUB.y) / 2 };
      expect(Math.hypot(mid.x - straight.x, mid.y - straight.y)).toBeGreaterThan(1); // actually curved
    }
  });
  it("staggers appearance 90ms apart inside beat B and finishes at its end", () => {
    const n = 6;
    const windows = Array.from({ length: n }, (_, i) => appearWindow("desktop", i, n));
    expect(windows[0][0]).toBe(450);
    expect(windows[n - 1][1]).toBe(1180);
    windows.forEach((w, i) => { if (i) expect(w[0] - windows[i - 1][0]).toBe(90); expect(w[1]).toBeGreaterThan(w[0]); });
    expect(appearWindow("mobile", 3, 4)[1]).toBe(840);
  });
  it("keyframes are strictly ordered, start hidden, shrink under the logo in D and finish transparent", () => {
    for (const layout of ["desktop", "mobile"] as const) {
      const tokens = tokensFor(layout);
      const slots = railSlots(stage, null, tokens.length);
      tokens.forEach((token, i) => {
        const frames = tokenFrames(token, layout, i, tokens.length, stage, slots[i]);
        frames.forEach((f, k) => { if (k) expect(f.offset).toBeGreaterThan(frames[k - 1].offset); });
        expect(frames[0]).toMatchObject({ offset: 0, opacity: 0 });
        expect(frames[frames.length - 1]).toMatchObject({ offset: 1, opacity: 0 });
        const { total, beats } = TIMELINE[layout];
        const atD = frames.find((f) => Math.abs(f.offset - beats.D[1] / total) < 0.002)!;
        expect(atD.transform).toContain("scale(0.3"); // shrunk toward the hub
        for (const f of frames) {
          const deg = Math.abs(Number(/rotate\((-?[\d.]+)deg\)/.exec(f.transform)![1]));
          expect(deg).toBeLessThanOrEqual(MAX_ROTATION_DEG);
        }
        const tracer = tracerFrames(token, layout, stage);
        expect(Math.max(...tracer.map((f) => f.opacity))).toBeLessThanOrEqual(0.9);
        expect(tracer[tracer.length - 1].opacity).toBe(0);
      });
    }
  });
  it("realigns toward the measured category rail and falls back to a centred row", () => {
    const slots = railSlots(stage, { left: 100, top: 500, width: 800, height: 100 }, 4);
    expect(slots.map((s) => s.x)).toEqual([200, 400, 600, 800]);
    expect(slots.every((s) => s.y === 550)).toBe(true);
    expect(railSlots(stage, null, 2)).toHaveLength(2);
  });
});

describe("eligibility", () => {
  const store = (seen: boolean) => ({ getItem: () => (seen ? "1" : null), setItem: () => {} });
  it("plays only for an unseen visit with usable storage, motion allowed and no Save-Data", () => {
    expect(eligibility({ storage: store(false), reducedMotion: false, saveData: false })).toBe("play");
    expect(eligibility({ storage: store(true), reducedMotion: false, saveData: false })).toBe("seen");
    expect(eligibility({ storage: store(false), reducedMotion: true, saveData: false })).toBe("reduced-motion");
    expect(eligibility({ storage: store(false), reducedMotion: false, saveData: true })).toBe("save-data");
    expect(eligibility({ storage: null, reducedMotion: false, saveData: false })).toBe("storage-unavailable");
    expect(eligibility({ storage: { getItem: () => { throw new Error("x"); }, setItem: () => {} }, reducedMotion: false, saveData: false })).toBe("storage-unavailable");
  });
});

describe("NeighbourhoodMapIntro", () => {
  it("plays as a labelled native modal, marks seen at start and focuses Skip", () => {
    render(<NeighbourhoodMapIntro />);
    const dialog = screen.getByRole("dialog", { name: "FairSwap neighbourhood introduction" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SEEN_KEY)).toBe("1");
    expect(screen.getByRole("button", { name: "Skip intro" })).toHaveFocus();
    expect(document.querySelectorAll("[data-token]")).toHaveLength(6);
    expect(document.querySelector(`img[src="${LOGO_SRC}"]`)).not.toBeNull();
  });
  it("uses the four-token mobile composition at <=639px", () => {
    vi.stubGlobal("innerWidth", 390);
    render(<NeighbourhoodMapIntro />);
    expect(screen.getByTestId("neighbourhood-intro")).toHaveAttribute("data-layout", "mobile");
    expect(document.querySelectorAll("[data-token]")).toHaveLength(4);
    expect(document.querySelector(`img[src="${MAP_SRC.mobile}"]`)).not.toBeNull();
  });
  it("Skip dismisses, restores focus and the intro never replays on a return visit", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener); opener.focus();
    const { unmount } = render(<NeighbourhoodMapIntro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
    expect(opener).toHaveFocus();
    unmount();
    render(<NeighbourhoodMapIntro />);
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
    opener.remove();
  });
  it("Escape (cancel) is intercepted and closes the dialog ourselves", () => {
    render(<NeighbourhoodMapIntro />);
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByTestId("neighbourhood-intro"), cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
  });
  it("ends at 3300ms desktop / 2600ms mobile and leaves no timers or live animations", () => {
    vi.useFakeTimers();
    render(<NeighbourhoodMapIntro />);
    expect(animate.mock.calls.every(([, options]) => (options as { duration: number }).duration === 3300)).toBe(true);
    act(() => { vi.advanceTimersByTime(3299); });
    expect(screen.queryByTestId("neighbourhood-intro")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    expect(cancels().length).toBeGreaterThan(0);
    cancels().forEach((c) => expect(c).toHaveBeenCalled());
    cleanup(); localStorage.clear(); animate.mockClear();
    vi.stubGlobal("innerWidth", 360);
    render(<NeighbourhoodMapIntro />);
    expect(animate.mock.calls.every(([, options]) => (options as { duration: number }).duration === 2600)).toBe(true);
    act(() => { vi.advanceTimersByTime(2600); });
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
  });
  it("cancels animations and its end timer when unmounted mid-flight", () => {
    vi.useFakeTimers();
    const set = vi.spyOn(window, "setTimeout");
    const clear = vi.spyOn(window, "clearTimeout");
    let view!: ReturnType<typeof render>;
    act(() => { view = render(<NeighbourhoodMapIntro />); });
    const endTimer = set.mock.results[set.mock.calls.findIndex(([, ms]) => ms === 3300)].value;
    act(() => { view.unmount(); });
    expect(clear).toHaveBeenCalledWith(endTimer);
    cancels().forEach((c) => expect(c).toHaveBeenCalled());
  });
  it("keeps the pre-hydration gate until the dialog is open, then releases it", () => {
    document.documentElement.setAttribute("data-fs-intro", "pending");
    let gate: string | null = "unset";
    showModal.mockImplementationOnce(function (this: HTMLDialogElement) { gate = document.documentElement.getAttribute("data-fs-intro"); this.setAttribute("open", ""); });
    render(<NeighbourhoodMapIntro />);
    expect(gate).toBe("pending");
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });
  it.each([
    ["already seen", () => localStorage.setItem(SEEN_KEY, "1")],
    ["reduced motion", () => stubMotion(true)],
    ["Save-Data", () => setConnection({ saveData: true })],
    ["blocked storage", () => { vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); }); }],
    ["storage that refuses writes", () => { vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); }); }],
  ])("is bypassed and releases the gate for %s", (_name, setup) => {
    setup();
    document.documentElement.setAttribute("data-fs-intro", "pending");
    render(<NeighbourhoodMapIntro />);
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });
  it("fails open when the map or logo fails, and drops only a failed marker", () => {
    render(<NeighbourhoodMapIntro />);
    fireEvent.error(document.querySelector('[data-token="cameras"] img[src$="electronics-cameras-photography.webp"]')!);
    expect(document.querySelector('[data-token="cameras"]')).toBeNull();
    expect(screen.queryByTestId("neighbourhood-intro")).not.toBeNull();
    fireEvent.error(document.querySelector('img[data-layer="map"]')!);
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
    cleanup(); localStorage.clear();
    render(<NeighbourhoodMapIntro />);
    fireEvent.error(document.querySelector(`img[src="${LOGO_SRC}"]`)!);
    expect(screen.queryByTestId("neighbourhood-intro")).toBeNull();
  });
});

describe("IntroGate", () => {
  const run = () => {
    const { container } = render(<IntroGate />);
    new Function(container.querySelector("script")!.textContent!)();
  };
  it("flags an eligible first visit and fails open at 4000ms", () => {
    vi.useFakeTimers();
    run();
    expect(document.documentElement.getAttribute("data-fs-intro")).toBe("pending");
    vi.advanceTimersByTime(3999);
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });
  it("does nothing when seen, reduced-motion, Save-Data or storage is blocked", () => {
    localStorage.setItem(SEEN_KEY, "1");
    run();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
    localStorage.clear(); stubMotion(true);
    run();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
    stubMotion(false); setConnection({ saveData: true });
    run();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
    setConnection(undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    run();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });
});

describe("CategoryBento rail", () => {
  const cats = [
    { id: "1", slug: "electronics", name: "Electronics" },
    { id: "2", slug: "zz-unmatched", name: "Unmatched" },
    { id: "3", slug: "furniture-test", name: "FS TEST 20261007 M1 Category" },
  ];
  it("features only pictured, non-fixture categories but keeps the full directory available", () => {
    expect(featuredCategories(cats).map((c) => c.id)).toEqual(["1"]);
    const { container } = render(<CategoryBento categories={cats} hrefFor={(slug) => `/search?category=${slug}`} />);
    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/search?category=electronics");
    expect(screen.queryByRole("link", { name: "Unmatched" })).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "View all categories" }));
    expect(screen.getByRole("link", { name: "Unmatched" })).toHaveAttribute("href", "/search?category=zz-unmatched");
  });
  it("caps the rail at 8 featured categories", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, slug: `electronics-${i}`, name: `Cat ${i}` }));
    render(<CategoryBento categories={many} hrefFor={(s) => s} />);
    expect(document.querySelectorAll("#home-category-rail a")).toHaveLength(8);
  });
});
