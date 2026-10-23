"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MyAdsTabScroller({ activeTab, children }: { activeTab: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    const selected = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !selected) return;
    // Move only the horizontal strip, without jumping the page vertically.
    const bounds = container.getBoundingClientRect();
    const link = selected.getBoundingClientRect();
    if (link.left < bounds.left) container.scrollLeft -= bounds.left - link.left;
    else if (link.right > bounds.right) container.scrollLeft += link.right - bounds.right;
  }, [activeTab]);
  return <div ref={ref} className="flex space-x-2 overflow-x-auto pb-1 sm:space-x-4">{children}</div>;
}
