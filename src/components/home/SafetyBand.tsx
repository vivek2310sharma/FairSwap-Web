import Link from "next/link";
import { Shield, Banknote, Truck, QrCode } from "lucide-react";

const WARNINGS = [
  { icon: Banknote, title: "UPI advance requests", text: "Do not send a token, booking or \"refundable\" amount to someone you have not met." },
  { icon: Truck, title: "Fake courier or pickup", text: "Be wary of anyone who says a courier or agent will collect the item or pay you later." },
  { icon: QrCode, title: "Payment links and QR codes", text: "Scanning a code or approving a request sends money out. It never receives money." },
];

export function SafetyBand() {
  return (
    <section id="safety" aria-labelledby="safety-heading" className="fs-ink-band scroll-mt-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-14">
        <div className="lg:col-span-5">
          <Shield className="h-8 w-8 text-(--fs-ink-accent)" aria-hidden="true" />
          <h2 id="safety-heading" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Your safety matters</h2>
          <p className="mt-3 text-base text-(--fs-ink-muted)"><strong className="text-(--fs-on-ink)">Stay safe on FairSwap.</strong> Inspect before paying. Never share an OTP or scan a QR code to receive money. <Link href="/safety" className="font-semibold text-(--fs-ink-accent) underline">Safety tips</Link></p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
          {WARNINGS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-3xl border border-(--fs-ink-line) p-4">
              <Icon className="h-5 w-5 text-(--fs-ink-accent)" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-bold">{title}</h3>
              <p className="mt-1.5 text-sm text-(--fs-ink-muted)">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
