import Link from "next/link";
import { Shield } from "lucide-react";
import { InteractiveSafety } from "./InteractiveSafety";

export function SafetyBand() {
  return (
    <section id="safety" aria-labelledby="safety-heading" className="fs-ink-band scroll-mt-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-14">
        <div className="lg:col-span-5">
          <Shield className="h-8 w-8 text-(--fs-ink-accent)" aria-hidden="true" />
          <h2 id="safety-heading" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Your safety matters</h2>
          <p className="mt-3 text-base text-(--fs-ink-muted)"><strong className="text-(--fs-on-ink)">Stay safe on FairSwap.</strong> Inspect before paying. Never share an OTP or scan a QR code to receive money. <Link href="/safety" className="font-semibold text-(--fs-ink-accent) underline">Safety tips</Link></p>
        </div>
        <InteractiveSafety />
      </div>
    </section>
  );
}
