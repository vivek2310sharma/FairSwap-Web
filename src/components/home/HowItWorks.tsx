import type { CSSProperties } from "react";
import { Search, MessageSquare, Shield } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Browse", text: "Choose a category and public area to discover approved ads." },
  { icon: MessageSquare, title: "Connect", text: "Message sellers directly to ask questions." },
  { icon: Shield, title: "Exchange", text: "Meet in a public place, inspect the item, and agree on payment directly." },
];
const STAIR = ["", "md:mt-8", "md:mt-16"];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">How It Works</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3 md:items-start md:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className={`fs-rise rounded-3xl border border-border bg-card p-5 sm:p-6 ${STAIR[index]}`} style={{ "--i": index } as CSSProperties}>
            <div className="flex items-center justify-between">
              <span className="fs-price text-5xl text-(--fs-icon) opacity-80" aria-hidden="true">{`0${index + 1}`}</span>
              <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
