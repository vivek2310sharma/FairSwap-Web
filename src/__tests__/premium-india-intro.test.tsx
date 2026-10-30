import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PremiumIndiaIntro, INTRO_LABEL } from "@/components/home/PremiumIndiaIntro";
import { PALETTES } from "@/lib/home-intro/palettes";
import { TAGLINES } from "@/lib/home-intro/taglines";
import { TIMING } from "@/lib/home-intro/selectors";
import { introSessionConfig, requestIntroReplay, resetIntroDecision } from "@/lib/home-intro/session";

const cfg = introSessionConfig(PALETTES.map((p) => p.id));
const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
const dialog = () => screen.queryByRole("dialog", { name: INTRO_LABEL, hidden: true });
/** Steps in small acts so React commits (and schedules the next timer) between ticks, as it does in a browser. */
const advance = (ms: number) => { for (let t = 0; t < ms; t += 10) act(() => { vi.advanceTimersByTime(Math.min(10, ms - t)); }); };
/** Time to reveal the final state: first greeting, then 14 gaps of (leave + gap), plus the last leave. */
const SEQUENCE_MS = TIMING.first + 15 * (TIMING.leave + TIMING.gap) + 50;
const greetingNow = () => screen.queryByTestId("intro-greeting")?.textContent ?? null;

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
}
/** A new document in the same tab: React tree gone, per-document memo gone, pagehide fired, storage kept. */
function reloadDocument() {
  cleanup();
  window.dispatchEvent(new Event("pagehide"));
  resetIntroDecision(window);
}
/** A brand-new independent tab: nothing in sessionStorage. */
function openIndependentTab() {
  cleanup();
  window.dispatchEvent(new Event("pagehide"));
  resetIntroDecision(window);
  sessionStorage.clear();
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear(); sessionStorage.clear(); resetIntroDecision(window);
  stubMotion(false); showModal.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-fs-intro");
  document.documentElement.removeAttribute("style");
});

describe("first visit", () => {
  it("plays automatically as a modal dialog, focuses Skip, and marks the tab seen as playback begins", () => {
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeInTheDocument();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Skip intro" })).toHaveFocus();
    expect(sessionStorage.getItem(cfg.seen)).toBe(sessionStorage.getItem(cfg.tab)); // before any greeting has even changed
    expect(localStorage.getItem("fairswap.intro.neighbourhood.v1.seen")).toBeNull();
  });

  it("shows नमस्ते first, 15 distinct greetings, then the text-only FairSwap reveal with an approved tagline", () => {
    render(<PremiumIndiaIntro />);
    const shown: string[] = [];
    const record = () => { const g = greetingNow(); if (g && shown[shown.length - 1] !== g) shown.push(g); };
    record();
    for (let t = 0; t < SEQUENCE_MS; t += 10) { advance(10); record(); }
    expect(shown[0]).toBe("नमस्ते");
    expect(shown).toHaveLength(15);
    expect(new Set(shown).size).toBe(15);
    expect(dialog()).toHaveAttribute("data-ended", "true");
    expect(screen.queryByTestId("intro-greeting")).toBeNull();
    expect(TAGLINES).toContain(screen.getByTestId("intro-tagline").textContent);
    expect(screen.getByRole("status")).toHaveTextContent(/^FairSwap\. India’s marketplace\./);
    expect(dialog()).toHaveTextContent("MADE IN INDIA");
    expect(dialog()!.querySelectorAll("img")).toHaveLength(0); // text, not a logo image; no photographs
  });

  it("holds the final reveal, then fades into the homepage and releases the gate", () => {
    render(<PremiumIndiaIntro />);
    advance(SEQUENCE_MS);
    advance(TIMING.hold - 100);
    expect(dialog()).toBeInTheDocument();
    advance(200 + TIMING.fade + 50);
    expect(dialog()).toBeNull();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });

  it("uses the tab session's palette on the dialog and publishes motifs for the chosen family", () => {
    render(<PremiumIndiaIntro />);
    const id = sessionStorage.getItem(cfg.theme)!;
    expect(dialog()).toHaveAttribute("data-theme", id);
    expect(screen.getByTestId("intro-art").children.length).toBeGreaterThan(0);
    expect(screen.getByTestId("intro-art")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("refresh and navigation", () => {
  it("does not replay on refresh", () => {
    render(<PremiumIndiaIntro />);
    advance(SEQUENCE_MS + TIMING.hold + TIMING.fade + 100);
    expect(dialog()).toBeNull();
    reloadDocument();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("does not replay on a refresh in the middle of playback", () => {
    render(<PremiumIndiaIntro />);
    advance(300);
    reloadDocument();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
  });

  it("does not replay on internal navigation (home unmounts and mounts again in the same document)", () => {
    const view = render(<PremiumIndiaIntro />);
    advance(SEQUENCE_MS + TIMING.hold + TIMING.fade + 100);
    view.unmount();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("does not replay when navigating home again while still in the first playback", () => {
    const view = render(<PremiumIndiaIntro />);
    advance(200);
    view.unmount();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
  });
});

describe("independent tabs", () => {
  it("plays again in a new independent tab", () => {
    render(<PremiumIndiaIntro />);
    advance(SEQUENCE_MS + TIMING.hold + TIMING.fade + 100);
    openIndependentTab();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeInTheDocument();
    expect(showModal).toHaveBeenCalledTimes(2);
  });

  it("plays in a tab that inherited a copy of sessionStorage while the original is still open", () => {
    render(<PremiumIndiaIntro />);
    const copy = new Map<string, string>();
    for (let i = 0; i < sessionStorage.length; i++) copy.set(sessionStorage.key(i)!, sessionStorage.getItem(sessionStorage.key(i)!)!);
    const originalTab = sessionStorage.getItem(cfg.tab)!;
    // New document, original page still registered as live (no pagehide), sessionStorage copied.
    cleanup();
    resetIntroDecision(window);
    sessionStorage.clear();
    copy.forEach((value, key) => sessionStorage.setItem(key, value));
    expect(sessionStorage.getItem(cfg.seen)).toBe(originalTab);
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeInTheDocument();
    expect(sessionStorage.getItem(cfg.tab)).not.toBe(originalTab);
    expect(sessionStorage.getItem(cfg.seen)).toBe(sessionStorage.getItem(cfg.tab));
  });
});

describe("skip", () => {
  it("Skip dismisses straight to the homepage; it was already marked seen, so a refresh stays on the homepage", () => {
    render(<PremiumIndiaIntro />);
    advance(400);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(dialog()).toBeNull();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
    expect(sessionStorage.getItem(cfg.seen)).toBe(sessionStorage.getItem(cfg.tab));
    reloadDocument();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
  });

  it("Escape also dismisses it", () => {
    render(<PremiumIndiaIntro />);
    fireEvent(dialog()!, new Event("cancel", { cancelable: true }));
    expect(dialog()).toBeNull();
  });

  it("returns focus to the element that had it", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    render(<PremiumIndiaIntro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(outside).toHaveFocus();
    outside.remove();
  });
});

describe("manual replay", () => {
  it("replays after the intro finished, without resetting session eligibility, and keeps the same palette", () => {
    render(<PremiumIndiaIntro />);
    advance(SEQUENCE_MS + TIMING.hold + TIMING.fade + 100);
    expect(dialog()).toBeNull();
    const before = { tab: sessionStorage.getItem(cfg.tab), seen: sessionStorage.getItem(cfg.seen), theme: sessionStorage.getItem(cfg.theme) };
    act(() => requestIntroReplay());
    expect(dialog()).toBeInTheDocument();
    expect(dialog()).toHaveAttribute("data-replay", "true");
    expect(dialog()).toHaveAttribute("data-theme", before.theme);
    expect(greetingNow()).toBe("नमस्ते");
    expect({ tab: sessionStorage.getItem(cfg.tab), seen: sessionStorage.getItem(cfg.seen), theme: sessionStorage.getItem(cfg.theme) }).toEqual(before);
    advance(SEQUENCE_MS);
    expect(dialog()).toHaveAttribute("data-ended", "true");
    advance(TIMING.hold + TIMING.fade + 100);
    expect(dialog()).toBeNull();
    // Still seen: a refresh does not auto-play.
    reloadDocument();
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
  });

  it("can be skipped like the first play and works again afterwards", () => {
    render(<PremiumIndiaIntro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    act(() => requestIntroReplay());
    expect(dialog()).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(dialog()).toBeNull();
    act(() => requestIntroReplay());
    expect(dialog()).toBeInTheDocument();
  });

  it("ignores a replay request while the intro is already playing", () => {
    render(<PremiumIndiaIntro />);
    act(() => requestIntroReplay());
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("replays even for a visitor who never auto-plays (seen tab, reduced motion shows the final state straight away)", () => {
    stubMotion(true);
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
    act(() => requestIntroReplay());
    expect(dialog()).toHaveAttribute("data-ended", "true");
    expect(screen.queryByTestId("intro-greeting")).toBeNull();
    expect(sessionStorage.getItem(cfg.seen)).toBeNull(); // replay never marks seen
    advance(TIMING.hold + TIMING.fade + 100);
    expect(dialog()).toBeNull();
  });
});

describe("accessibility, reduced motion and fail-open", () => {
  it("does not auto-play under prefers-reduced-motion and leaves nothing blocking the page", () => {
    stubMotion(true);
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
    expect(showModal).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });

  it("hides rapidly changing and decorative content from assistive tech; the dialog is labelled", () => {
    render(<PremiumIndiaIntro />);
    expect(dialog()).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("intro-greeting")).toHaveAttribute("aria-hidden", "true");
    expect(dialog()!.querySelectorAll("svg:not([aria-hidden='true'])")).toHaveLength(0);
  });

  it("fails open if the modal cannot be opened", () => {
    HTMLDialogElement.prototype.showModal = () => { throw new Error("boom"); };
    document.documentElement.setAttribute("data-fs-intro", "pending");
    render(<PremiumIndiaIntro />);
    expect(dialog()).toBeNull();
    expect(document.documentElement.hasAttribute("data-fs-intro")).toBe(false);
  });

  it("fails open if sessionStorage refuses the seen mark (no intro, no loop)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    try { render(<PremiumIndiaIntro />); } finally { spy.mockRestore(); }
    expect(dialog()).toBeNull();
  });

});