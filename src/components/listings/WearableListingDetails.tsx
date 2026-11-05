import { ShieldAlert } from "lucide-react";
import { wearableFacts, type WearableDetails } from "@/lib/listings/wearables/public";

/** Buyer-facing wearable specifications. Everything is labelled seller-reported; FairSwap does not verify device, serial or account status. */
export default function WearableListingDetails({ details }: { details: WearableDetails }) {
  const facts = wearableFacts(details);
  return <section aria-label="Wearable details" className="mt-6 rounded-xl border border-border bg-card p-4">
    <h2 className="text-base font-semibold">Wearable details <span className="text-sm font-normal text-muted-foreground">(seller-reported)</span></h2>
    {!details.transfer_ready && <p role="note" className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"><ShieldAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0"/>{details.pairing_status === "still_paired" ? "The seller says this device is still paired to their account. It is not ready for transfer yet; ask to see it signed out and reset before you pay." : "The seller has not confirmed the pairing or account status. Ask to see it signed out and reset before you pay."}</p>}
    <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">{facts.map(f => <div key={f.field} className="min-w-0"><dt className="text-xs text-muted-foreground">{f.label}</dt><dd className="break-words text-sm">{f.value}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-muted-foreground">FairSwap does not verify the device, its serial number, compatibility or account status. Meet in a public place and inspect before paying.</p>
  </section>;
}
