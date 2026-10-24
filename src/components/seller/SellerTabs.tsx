"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

interface SellerTabsProps {
  active: "listings" | "ratings";
  listingsLabel: string;
  ratingsLabel: string;
  comingSoonLabel: string;
  ariaLabel: string;
  listingsHref: string;
  ratingsHref: string;
}

export function SellerTabs({
  active,
  listingsLabel,
  ratingsLabel,
  comingSoonLabel,
  ariaLabel,
  listingsHref,
  ratingsHref,
}: SellerTabsProps) {
  const router = useRouter();
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);
  const tabs = [
    { key: "listings" as const, label: listingsLabel, href: listingsHref, badge: undefined },
    { key: "ratings" as const, label: ratingsLabel, href: ratingsHref, badge: comingSoonLabel },
  ];

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    refs.current[next]?.focus();
    router.push(tabs[next].href, { scroll: false });
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className="mt-8 flex gap-1 border-b border-border">
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <a
            key={tab.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            id={`seller-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls="seller-tabpanel"
            tabIndex={selected ? 0 : -1}
            href={tab.href}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={(event) => {
              event.preventDefault();
              router.push(tab.href, { scroll: false });
            }}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-action-600 ${
              selected ? "border-action-600 text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{tab.badge}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
