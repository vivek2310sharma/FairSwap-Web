import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FairSwapIntro } from "@/components/home/FairSwapIntro";
import { FairSwapHeroArtwork } from "@/components/home/FairSwapHeroArtwork";
import { FAIRSWAP_ART, isCompleteArt, type FairSwapArt } from "@/components/home/fairswap-art";
import { CategoryBento } from "@/components/home/CategoryBento";

const img = (name: string) => ({ src: `/animations/fairswap-intro/${name}.webp`, width: 400, height: 600 });
const art: FairSwapArt = {
  left: img("left"), right: img("right"), handshake: img("handshake"),
  itemLeft: img("item-left"), itemRight: img("item-right"), heroLeft: img("hero-left"), heroRight: img("hero-right"),
};

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
}

// jsdom's <dialog> has no modal behaviour; emulate open/close and record showModal calls.
const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
beforeEach(() => {
  sessionStorage.clear(); stubMotion(false); showModal.mockClear();
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("art manifest", () => {
  it("ships a complete set whose files exist on disk", () => {
    expect(isCompleteArt(FAIRSWAP_ART)).toBe(true);
    for (const image of Object.values(FAIRSWAP_ART!)) {
      expect(existsSync(join(process.cwd(), "public", image.src))).toBe(true);
    }
    expect(isCompleteArt(art)).toBe(true);
    expect(isCompleteArt({ ...art, heroRight: undefined })).toBe(false);
    expect(isCompleteArt({ ...art, left: { ...art.left, src: "https://example.com/x.png" } })).toBe(false);
  });
});

describe("FairSwapIntro", () => {
  it("renders nothing without complete art and does not mark the intro seen", () => {
    render(<FairSwapIntro art={null} />);
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
    expect(sessionStorage.getItem("fs-intro-seen")).toBeNull();
  });
  it("shows once per session with a Skip button that dismisses it", () => {
    const { unmount } = render(<FairSwapIntro art={art} />);
    expect(screen.getByRole("dialog", { name: "FairSwap introduction" })).toBeInTheDocument();
    const skip = screen.getByRole("button", { name: "Skip intro" });
    expect(skip).toHaveFocus();
    fireEvent.click(skip);
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
    unmount();
    render(<FairSwapIntro art={art} />);
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
  });
  it("is a native modal dialog and restores focus to the previously focused element", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener); opener.focus();
    render(<FairSwapIntro art={art} />);
    const dialog = screen.getByRole("dialog", { name: "FairSwap introduction" });
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Skip intro" })).toHaveFocus();
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true); // we close it ourselves, not the browser
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it("closes on Escape (cancel) and after its duration", () => {
    vi.useFakeTimers();
    render(<FairSwapIntro art={art} />);
    fireEvent(screen.getByTestId("fairswap-intro"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
    cleanup(); sessionStorage.clear();
    render(<FairSwapIntro art={art} />);
    act(() => { vi.advanceTimersByTime(2499); });
    expect(screen.queryByTestId("fairswap-intro")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
  });
  it("is bypassed for reduced motion", () => {
    stubMotion(true);
    render(<FairSwapIntro art={art} />);
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
  });
  it("still works when sessionStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<FairSwapIntro art={art} />);
    expect(screen.getByTestId("fairswap-intro")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
  it("dismisses itself if artwork fails to load", () => {
    render(<FairSwapIntro art={art} />);
    fireEvent.error(document.querySelector("picture img")!);
    expect(screen.queryByTestId("fairswap-intro")).toBeNull();
  });
});

describe("FairSwapHeroArtwork", () => {
  it("renders nothing without art and hides on image failure", () => {
    const { container } = render(<FairSwapHeroArtwork side="left" art={null} />);
    expect(container).toBeEmptyDOMElement();
    cleanup();
    render(<FairSwapHeroArtwork side="right" art={art} />);
    expect(screen.getByTestId("hero-art-right")).toBeInTheDocument();
    fireEvent.error(document.querySelector("img")!);
    expect(screen.queryByTestId("hero-art-right")).toBeNull();
  });
});

describe("CategoryBento", () => {
  const cats = [
    { id: "1", slug: "electronics", name: "Electronics" },
    { id: "2", slug: "zz-unmatched", name: "Unmatched" },
  ];
  it("renders image + name links with no icons and text-only fallback", () => {
    const { container } = render(<CategoryBento categories={cats} hrefFor={(slug) => `/search?category=${slug}`} />);
    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/search?category=electronics");
    expect(screen.getByRole("link", { name: "Unmatched" })).toHaveAttribute("href", "/search?category=zz-unmatched");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
  it("expands with the all-categories control", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, slug: `electronics-${i}`, name: `Cat ${i}` }));
    render(<CategoryBento categories={many} hrefFor={(s) => s} />);
    expect(screen.getAllByRole("link")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "View all categories" }));
    expect(screen.getAllByRole("link")).toHaveLength(12);
  });
});