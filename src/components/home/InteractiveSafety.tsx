"use client";

import { useState } from "react";
import { Banknote, Truck, QrCode, BadgeAlert, ChevronDown } from "lucide-react";

const SCAMS = [
  {
    id: "upi-advance", icon: Banknote, title: "UPI advance requests",
    text: "Do not send a token, booking or \"refundable\" amount to someone you have not met.",
    detail: "A seller or buyer says a small advance will \"hold\" the item. Once sent, the money is hard to get back. Pay only after you have seen and checked the item in person.",
  },
  {
    id: "qr-link", icon: QrCode, title: "Payment links and QR codes",
    text: "Scanning a code or approving a request sends money out. It never receives money.",
    detail: "Fake buyers send a QR code or a collect request and say it is needed to receive payment. You never need to scan, enter a UPI PIN or approve anything to be paid.",
  },
  {
    id: "courier", icon: Truck, title: "Fake courier or pickup",
    text: "Be wary of anyone who says a courier or agent will collect the item or pay you later.",
    detail: "Scammers offer to send an agent, then ask for a delivery or insurance fee first. FairSwap is built for meeting in person, so be cautious if someone avoids it.",
  },
  {
    id: "uniform", icon: BadgeAlert, title: "Fake \"army officer\" listings",
    text: "A claim of being on duty or transferred is not a reason to pay in advance.",
    detail: "Listings that use a uniform or a posting to explain why you cannot meet are a common trick. A good price plus pressure to pay first is a warning sign. Report the ad.",
  },
] as const;

/** Expandable India-specific scam cards. Guidance only: no claim that FairSwap checks sellers or protects payments. */
export function InteractiveSafety() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
      {SCAMS.map(({ id, icon: Icon, title, text, detail }) => {
        const expanded = open === id;
        return (
          <li key={id} className="rounded-3xl border border-(--fs-ink-line)">
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`safety-${id}`}
                onClick={() => setOpen(expanded ? null : id)}
                className="flex min-h-11 w-full items-start gap-3 rounded-3xl p-4 text-left"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-(--fs-ink-accent)" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="mt-1.5 block text-sm font-normal text-(--fs-ink-muted)">{text}</span>
                </span>
                <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-(--fs-ink-accent) motion-safe:transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </h3>
            <div id={`safety-${id}`} hidden={!expanded} className="px-4 pb-4 pl-12 text-sm text-(--fs-ink-muted)">{detail}</div>
          </li>
        );
      })}
    </ul>
  );
}
