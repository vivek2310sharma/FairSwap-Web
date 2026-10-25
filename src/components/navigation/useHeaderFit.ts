import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

// Medium mode (Browse + Post Ad shortcuts beside the menu button) is only
// offered from the `sm` breakpoint up; narrower phones keep the compact header.
const MEDIUM_MIN_WIDTH = "(min-width: 640px)";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Chooses the header mode from real content width, so authenticated controls,
 * long English/Hindi labels, large text and browser zoom are all handled rather
 * than assuming a fixed breakpoint fits:
 *   inline  - full navigation and actions
 *   medium  - Browse and Post Ad shortcuts plus the menu button
 *   compact - menu button only
 *
 * It tries each mode in order, keeps the first one that does not overflow the
 * bar, and runs synchronously (layout effect / ResizeObserver callback), so no
 * intermediate state is ever painted.
 */
export function useHeaderFit(
  headerRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
  contentKey: string,
) {
  const evaluateRef = useRef<() => void>(() => {});

  useIsoLayoutEffect(() => {
    const header = headerRef.current;
    const bar = barRef.current;
    if (!header || !bar) return;

    const overflows = () => bar.scrollWidth > bar.clientWidth + 1;
    const evaluate = () => {
      const modes = window.matchMedia?.(MEDIUM_MIN_WIDTH).matches
        ? ["inline", "medium"]
        : ["inline"];
      let chosen = "compact";
      for (const mode of modes) {
        header.setAttribute("data-nav", mode);
        if (!overflows()) {
          chosen = mode;
          break;
        }
      }
      header.setAttribute("data-nav", chosen);
    };
    evaluateRef.current = evaluate;
    evaluate();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(evaluate);
    observer.observe(bar);
    header
      .querySelectorAll(".fs-inline-only, .fs-medium-only")
      .forEach((el) => observer.observe(el));
    document.fonts?.ready.then(evaluate).catch(() => {});
    return () => observer.disconnect();
  }, [headerRef, barRef]);

  // Content that changes without resizing the bar (auth resolving, badges, labels).
  useEffect(() => {
    evaluateRef.current();
  }, [contentKey]);
}
