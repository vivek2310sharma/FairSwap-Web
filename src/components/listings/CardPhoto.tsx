"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { invalidateGallery, isSaveData, requestGallery } from "@/lib/listings/gallery-client";

const CYCLE_MS = 1800;

/**
 * Card photo area. Without extra photos it is the old static cover. When the listing has 2+ public, ready photos
 * (resolved lazily, in one batched request, once the card is on screen) desktop hover cycles them, and explicit
 * previous/next buttons work for touch, keyboard and reduced-motion. Auto-cycle is off for reduced motion and Save-Data,
 * pauses off-screen and resets on pointer exit. Bytes always come from the existing media route.
 */
export function CardPhoto({ href, listingId, coverId, title, sizes, imageClassName }: {
  href: string; listingId: string; coverId: string | null; title: string; sizes: string; imageClassName: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<string[]>(coverId ? [coverId] : []);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [seen, setSeen] = useState(false);
  const mounted = useRef(true);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMotionOk(!reduced && !isSaveData());
  }, []);

  // Visibility is tracked only to pause auto-cycle off-screen (and, on touch, to decide when to load).
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setOnScreen(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, { rootMargin: "120px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const load = useCallback(() => {
    if (!coverId || isSaveData()) return;
    void requestGallery(listingId).then((ids) => {
      if (!mounted.current || ids.length < 2) return;
      setPhotos([coverId, ...ids.filter((id) => id !== coverId)].slice(0, 5));
    });
  }, [listingId, coverId]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Desktop (hover-capable): nothing is requested until the first mouse hover or keyboard focus anywhere on the card.
  // Touch (no hover): there is no hover to wait for, so load once the card has been on screen so the buttons can appear.
  useEffect(() => {
    const el = root.current;
    if (!el || !coverId) return;
    const touch = window.matchMedia?.("(hover: none)").matches ?? false;
    if (touch) { if (seen) load(); return; }
    const card = el.closest("[data-gallery-root]") ?? el;
    const onEnter = (event: Event) => { if (!(event instanceof PointerEvent) || event.pointerType === "mouse") load(); };
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("focusin", load);
    return () => { card.removeEventListener("pointerenter", onEnter); card.removeEventListener("focusin", load); };
  }, [coverId, seen, load]);

  const multiple = photos.length > 1;
  useEffect(() => {
    if (!multiple || !hovering || !onScreen || !motionOk) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % photos.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [multiple, hovering, onScreen, motionOk, photos.length]);

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length), [photos.length]);
  const current = photos[Math.min(index, photos.length - 1)];
  const buttonClass = "flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-xs focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      ref={root}
      className="absolute inset-0"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovering(true); }}
      onPointerLeave={() => { setHovering(false); setIndex(0); }}
    >
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block h-full w-full focus:outline-hidden">
        {current ? (
          <Image key={current} src={`/api/listings/${listingId}/media/${current}/thumb`} alt={title} fill sizes={sizes} className={imageClassName} unoptimized={true}
            onError={() => {
              // A photo that no longer serves (moderated, removed) is dropped and the cached list forgotten.
              invalidateGallery(listingId);
              setPhotos((list) => (list.length > 1 ? list.filter((id) => id !== current) : list));
              setIndex(0);
            }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <Tag className="h-10 w-10 stroke-1 opacity-50" aria-hidden="true" />
          </div>
        )}
      </Link>
      {multiple && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1" data-testid="card-photo-progress" aria-hidden="true">
            {photos.map((id, i) => <span key={id} className={`h-1 w-4 rounded-full ${i === index ? "bg-white" : "bg-white/45"}`} />)}
          </div>
          <div className="absolute inset-x-1 top-1/2 z-20 flex -translate-y-1/2 justify-between transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
            <button type="button" aria-label={`Previous photo of ${title}`} onClick={() => step(-1)} className={buttonClass}><ChevronLeft className="h-5 w-5" aria-hidden="true" /></button>
            <button type="button" aria-label={`Next photo of ${title}`} onClick={() => step(1)} className={buttonClass}><ChevronRight className="h-5 w-5" aria-hidden="true" /></button>
          </div>
          <p className="sr-only" aria-live="polite">{`Photo ${index + 1} of ${photos.length}`}</p>
        </>
      )}
    </div>
  );
}