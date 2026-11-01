"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

type Connection = { saveData?: boolean };

/**
 * Progressive scroll reveal. Content renders visible; after hydration, an element that starts below the fold is marked
 * "pending" and flips to "in" once (IntersectionObserver, no scroll listeners). Skipped for reduced motion, Save-Data and
 * browsers without IntersectionObserver. Only opacity/transform animate, so there is no layout shift.
 */
export function Reveal({ as, className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: Connection }).connection?.saveData === true;
    if (reduced || saveData || el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      el.dataset.reveal = "in";
      observer.disconnect();
    }, { rootMargin: "0px 0px -8% 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); delete el.dataset.reveal; };
  }, []);
  return <Tag ref={ref} className={className}>{children}</Tag>;
}