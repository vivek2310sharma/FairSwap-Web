import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gallery = vi.hoisted(() => ({ ids: [] as string[], saveData: false }));
vi.mock("@/lib/listings/gallery-client", () => ({
  requestGallery: vi.fn(async () => gallery.ids),
  invalidateGallery: vi.fn(),
  isSaveData: () => gallery.saveData,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => <img src={src} alt={alt} onError={onError} />,
}));

import { CardPhoto } from "@/components/listings/CardPhoto";
import { invalidateGallery, requestGallery } from "@/lib/listings/gallery-client";

const L = "11111111-1111-4111-8111-111111111111";
const P = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;
const observers: Array<{ cb: IntersectionObserverCallback }> = [];

function setMedia({ reduced = false, touch = false } = {}) {
  window.matchMedia = ((query: string) => ({
    matches: (reduced && query.includes("reduce")) || (touch && query.includes("hover: none")),
    media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
const show = (visible: boolean) => act(() => { observers.forEach((o) => o.cb([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver)); });
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

/** The card root is what carries `data-gallery-root` in ListingCard; the test mirrors that structure. */
async function mount({ visible = true } = {}) {
  const view = render(<div data-gallery-root><a href="/x" data-testid="title">title</a><CardPhoto href="/listings/x" listingId={L} coverId={P(1)} title="Sofa" sizes="100vw" imageClassName="img" /></div>);
  if (visible) { show(true); await settle(); }
  const photo = view.container.querySelector("[data-gallery-root] > div") as HTMLElement;
  return { ...view, photo, card: view.container.firstElementChild as HTMLElement };
}
const src = () => (screen.getByRole("img", { hidden: true }) as HTMLImageElement).getAttribute("src");

// jsdom has no PointerEvent, so testing-library would drop `pointerType`; provide a minimal one.
class TestPointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) { super(type, init); this.pointerType = init.pointerType ?? ""; }
}

beforeEach(() => {
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  vi.useFakeTimers();
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", class { cb: IntersectionObserverCallback; constructor(cb: IntersectionObserverCallback) { this.cb = cb; observers.push({ cb }); } observe() {} disconnect() {} unobserve() {} });
  gallery.ids = [P(1), P(2), P(3)]; gallery.saveData = false;
  setMedia();
  vi.mocked(requestGallery).mockClear();
  vi.mocked(invalidateGallery).mockClear();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("CardPhoto deferred loading (desktop)", () => {
  it("requests nothing when the card merely enters the viewport", async () => {
    await mount();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(requestGallery).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /photo/ })).toBeNull();
  });

  it("loads on first mouse hover, once, and shows the controls and progress", async () => {
    const { card } = await mount();
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    await settle();
    expect(requestGallery).toHaveBeenCalledTimes(1);
    expect(requestGallery).toHaveBeenCalledWith(L);
    expect(screen.getByTestId("card-photo-progress").children).toHaveLength(3);
  });

  it("loads on keyboard focus anywhere in the card", async () => {
    const { getByTestId } = await mount();
    fireEvent.focusIn(getByTestId("title"));
    await settle();
    expect(requestGallery).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Next photo of Sofa" })).toBeInTheDocument();
  });

  it("ignores touch-type pointer entry on desktop layouts", async () => {
    const { card } = await mount();
    fireEvent.pointerEnter(card, { pointerType: "touch" });
    await settle();
    expect(requestGallery).not.toHaveBeenCalled();
  });

  it("never requests under Save-Data, even on hover or focus", async () => {
    gallery.saveData = true;
    const { card, getByTestId } = await mount();
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.focusIn(getByTestId("title"));
    await settle();
    expect(requestGallery).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /photo/ })).toBeNull();
  });
});

describe("CardPhoto touch", () => {
  it("loads once the card is on screen (no hover exists) and explicit buttons advance and wrap", async () => {
    setMedia({ touch: true });
    await mount({ visible: false });
    expect(requestGallery).not.toHaveBeenCalled();
    show(true); await settle();
    expect(requestGallery).toHaveBeenCalledTimes(1);
    expect(src()).toContain(`/media/${P(1)}/thumb`);
    fireEvent.click(screen.getByRole("button", { name: "Next photo of Sofa" }));
    expect(src()).toContain(`/media/${P(2)}/thumb`);
    fireEvent.click(screen.getByRole("button", { name: "Previous photo of Sofa" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous photo of Sofa" }));
    expect(src()).toContain(`/media/${P(3)}/thumb`);
  });

  it("never auto-cycles on touch pointers", async () => {
    setMedia({ touch: true });
    const { photo } = await mount();
    fireEvent.pointerEnter(photo, { pointerType: "touch" });
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(src()).toContain(`/media/${P(1)}/thumb`);
  });

  it("does not request under Save-Data on touch either", async () => {
    setMedia({ touch: true }); gallery.saveData = true;
    await mount();
    expect(requestGallery).not.toHaveBeenCalled();
  });
});

describe("CardPhoto cycling", () => {
  async function hovered() {
    const view = await mount();
    fireEvent.pointerEnter(view.card, { pointerType: "mouse" });
    fireEvent.pointerEnter(view.photo, { pointerType: "mouse" });
    await settle();
    return view;
  }

  it("cycles on hover every 1.8s, then resets on exit", async () => {
    const { photo } = await hovered();
    await act(async () => { vi.advanceTimersByTime(1800); });
    expect(src()).toContain(`/media/${P(2)}/thumb`);
    await act(async () => { vi.advanceTimersByTime(1800); });
    expect(src()).toContain(`/media/${P(3)}/thumb`);
    fireEvent.pointerLeave(photo);
    expect(src()).toContain(`/media/${P(1)}/thumb`);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(src()).toContain(`/media/${P(1)}/thumb`);
  });

  it("does not auto-cycle for reduced motion but keeps manual controls", async () => {
    setMedia({ reduced: true });
    await hovered();
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(src()).toContain(`/media/${P(1)}/thumb`);
    expect(screen.getByRole("button", { name: "Next photo of Sofa" })).toBeInTheDocument();
  });

  it("pauses while off-screen", async () => {
    await hovered();
    show(false);
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(src()).toContain(`/media/${P(1)}/thumb`);
  });

  it("behaves like a static cover when the listing has no extra photos", async () => {
    gallery.ids = [P(1)];
    const { card } = await mount();
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    await settle();
    expect(screen.queryByRole("button", { name: /photo/ })).toBeNull();
    expect(screen.queryByTestId("card-photo-progress")).toBeNull();
  });

  it("moderation: a photo that stops serving is dropped and the cached list is invalidated", async () => {
    await hovered();
    fireEvent.click(screen.getByRole("button", { name: "Next photo of Sofa" }));
    fireEvent.error(screen.getByRole("img", { hidden: true }));
    expect(invalidateGallery).toHaveBeenCalledWith(L);
    expect(screen.getByTestId("card-photo-progress").children).toHaveLength(2);
    expect(src()).toContain(`/media/${P(1)}/thumb`);
  });
});