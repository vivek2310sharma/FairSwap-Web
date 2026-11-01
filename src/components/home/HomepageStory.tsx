"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, MessageSquare, Eye, Handshake } from "lucide-react";
import { Reveal } from "./Reveal";

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
    <section id="how-it-works" aria-labelledby="how-heading" className="fs-container scroll-mt-20 py-12 lg:py-16">
      <Reveal>
        <h2 id="how-heading" className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">How It Works</h2>
        <span className="fs-rule" aria-hidden="true" />
      </Reveal>
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
                className={`h-full w-full rounded-3xl border p-5 text-left transition-[transform,box-shadow,border-color] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fs-focus) motion-reduce:transition-none ${index === active ? "border-primary bg-card shadow-md ring-2 ring-[#F5D6BE]" : "border-border bg-card hover:border-primary/50"}`}
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
        <div className="fs-scene mx-auto h-64 w-full max-w-[18rem] rounded-3xl bg-(--fs-tone-a) md:h-80" data-testid="story-art" data-step={active} style={{ "--step": active } as React.CSSProperties}>
          {/* Decorative layers: soft colour fields that drift per step and a dotted route linking the four steps. */}
          <div className="fs-scene-layer" aria-hidden="true" style={{ transform: `translate(${active * -6}px, ${active * 3}px)` }}>
            <span className="fs-scene-blob absolute -left-6 top-4 h-32 w-32 bg-(--fs-tone-c)" />
            <span className="fs-scene-blob absolute -right-8 bottom-6 h-36 w-36 bg-(--fs-tone-b)" />
          </div>
          <svg className="fs-scene-layer" viewBox="0 0 288 320" preserveAspectRatio="none" aria-hidden="true" fill="none">
            <path d="M24 288 C 80 250, 60 190, 140 170 S 230 90, 264 36" stroke="var(--fs-primary)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
            {[[24, 288], [100, 205], [190, 120], [264, 36]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i === active ? 9 : 5} fill={i <= active ? "var(--fs-primary)" : "var(--fs-tone-a)"} stroke="var(--fs-primary)" strokeWidth="2" style={{ transition: "r 0.3s ease" }} />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-end justify-center p-4">
            <Image key={current.art.src} src={current.art.src} alt={current.art.alt} width={current.art.width} height={current.art.height} sizes="288px" loading="lazy" className="fs-story-art max-h-[88%] w-auto object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}