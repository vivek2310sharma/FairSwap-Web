"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, MessageSquare, Eye, Handshake } from "lucide-react";

const BASE = "/animations/fairswap-intro";
const STEPS = [
  { icon: Search, title: "Browse", text: "Choose a category and public area to discover approved ads.", art: { src: `${BASE}/laptop-720w.webp`, width: 720, height: 474, alt: "FairSwap mascot browsing ads on a laptop" } },
  { icon: MessageSquare, title: "Connect", text: "Message sellers on FairSwap to ask questions before you meet.", art: { src: `${BASE}/headphones-720w.webp`, width: 425, height: 479, alt: "FairSwap mascot with headphones, ready to chat" } },
  { icon: Eye, title: "Inspect", text: "Meet in a public place and check the item in person before you pay.", art: { src: `${BASE}/man-walk-01-480w.webp`, width: 480, height: 792, alt: "FairSwap mascot walking to a meetup" } },
  { icon: Handshake, title: "Exchange", text: "Agree on payment directly with the seller, face to face. FairSwap does not handle payments.", art: { src: `${BASE}/handshake-duo-480w.webp`, width: 480, height: 571, alt: "Two FairSwap mascots shaking hands" } },
] as const;

/** Four-step Browse, Connect, Inspect, Exchange story. All step text stays in the page; selecting a step only swaps the illustration. */
export function HomepageStory() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h2 id="how-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">How It Works</h2>
      <div className="mt-8 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-12">
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className={`h-full w-full rounded-3xl border p-5 text-left transition-colors motion-safe:duration-200 ${index === active ? "border-primary bg-card shadow-md" : "border-border bg-card hover:border-primary/50"}`}
              >
                <span className="flex items-center justify-between">
                  <span className="fs-price text-4xl text-(--fs-icon) opacity-80" aria-hidden="true">{`0${index + 1}`}</span>
                  <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </span>
                <span className="mt-3 block text-lg font-bold text-foreground">{step.title}</span>
                <span className="mt-1 block text-sm text-muted">{step.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mx-auto flex h-64 w-full max-w-[18rem] items-end justify-center rounded-3xl bg-(--fs-tone-a) p-4 md:h-80" data-testid="story-art">
          <Image key={current.art.src} src={current.art.src} alt={current.art.alt} width={current.art.width} height={current.art.height} sizes="288px" loading="lazy" className="max-h-full w-auto object-contain" />
        </div>
      </div>
    </section>
  );
}
