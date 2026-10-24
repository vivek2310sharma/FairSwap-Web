import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

export const metadata = {
  title: "Refund & Cancellation Policy — FairSwap",
  description: "Refunds, cancellations, failed payments, and delivery of optional FairSwap ad promotions in India.",
};

const mail = "contact@fairswap.in";

export default function RefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Refund &amp; Cancellation Policy</h1>
        <p className="mt-3 text-sm text-muted">
          Effective 14 October 2026 for optional paid services when they become available. Operator: {LEGAL_POLICY.operatorName} (FairSwap, India).
        </p>
        <p className="mt-4 text-sm text-muted">
          This policy covers payments made directly to FairSwap for its own digital classified-ad promotion services. It does not cover private payments or returns for items bought from or sold to other users. Optional Plus/Premium checkout is not yet represented as live by this policy.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">1. Services, pricing and delivery</h2>
            <p className="mt-2">When offered, Plus/Premium upgrades are optional digital advertising services for approved FairSwap ads. Before payment, the checkout will show the chosen package, exact benefits, service duration, price in INR, taxes and final payable amount. FairSwap does not sell or ship the goods described in users&apos; advertisements.</p>
            <p className="mt-2">A paid promotion is digitally delivered by enabling the purchased placement or visibility benefit on an approved ad after the payment provider confirms a successful payment. The service period starts on activation, not at payment initiation. If the ad cannot be approved or the promotion cannot be activated, the payment will be refunded in full.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">2. Cancellation before activation</h2>
            <p className="mt-2">You may cancel an optional promotion and request a full refund any time before its digital benefit is activated. If an ad is rejected during moderation or FairSwap is unable to supply the purchased service, FairSwap will cancel and refund the promotional charge in full, including taxes collected for that charge where applicable.</p>
            <p className="mt-2">You can request cancellation at <a className="text-brand-link underline" href={`mailto:${mail}`}>{mail}</a>. Include your registered email, ad reference, transaction/order reference if available, payment date, and reason. Never share a UPI PIN, OTP, password or full card number.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">3. Cancellation after activation</h2>
            <p className="mt-2">After the paid promotional benefit is activated, the service is considered to have started. Cancellation at the seller&apos;s request does not ordinarily entitle the seller to a refund of the already-delivered or elapsed portion. For a service that remains partly undelivered because of a verified FairSwap technical issue, FairSwap will provide a proportionate refund for the unused period or a mutually agreed equivalent remedy. Any refund required by applicable law will be honoured.</p>
            <p className="mt-2">Removal of an ad for violation of our <Link href="/acceptable-use" className="text-brand-link underline">Acceptable Use Policy</Link> does not automatically qualify the seller for a refund once promotional service has begun, except where applicable law requires one or FairSwap has not delivered the purchased benefit.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">4. Failed, duplicate or unauthorised payments</h2>
            <p className="mt-2">If payment fails but money is debited, FairSwap will not treat the order as paid without confirmation from the payment gateway. Banks or the gateway may automatically reverse such debits. Contact us if the reversal does not appear within 5–7 working days, with the transaction reference, so we can investigate.</p>
            <p className="mt-2">If the same FairSwap service is charged twice, or the payment is successful but the eligible promotion is never delivered, we will refund the duplicate or undelivered charge in full after verification. Report suspected unauthorised payments promptly to your bank/payment provider and to FairSwap.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">5. Refund review and timelines</h2>
            <p className="mt-2">FairSwap aims to acknowledge payment or refund requests within 2 working days and communicate a decision within 5 working days after receiving the details needed to verify the transaction. Approved refunds will normally be initiated to the original payment method within 5 working days of approval. The bank, card network, UPI provider or payment gateway may take an additional 5–10 working days to reflect the credit. Statutory or payment-network timelines take precedence where applicable.</p>
            <p className="mt-2">FairSwap never asks for an OTP, UPI PIN, card PIN, or a payment to process a refund. We may request a transaction reference or redacted proof of debit solely to verify the claim.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">6. Returns, shipping and user-to-user transactions</h2>
            <p className="mt-2">Paid ad promotions are digital services, not returnable physical products. FairSwap does not pack, dispatch, ship, deliver or accept returns of items advertised by third-party users. Buyers and sellers independently arrange inspection, exchange, any payment, and any return of an advertised item; this refund policy does not provide buyer protection or escrow for those transactions.</p>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">7. Contact and disputes</h2>
            <p className="mt-2">For paid-service cancellations and refunds, write to <a href={`mailto:${mail}`} className="text-brand-link underline">{mail}</a>. For unresolved complaints, contact FairSwap&apos;s Grievance Officer ({LEGAL_POLICY.operatorName}) at <a href={`mailto:${LEGAL_POLICY.grievanceEmail}`} className="text-brand-link underline">{LEGAL_POLICY.grievanceEmail}</a> or use our <Link href="/grievance" className="text-brand-link underline">grievance information page</Link>. See also the <Link href="/terms" className="text-brand-link underline">Terms of Service</Link> and <Link href="/privacy" className="text-brand-link underline">Privacy Policy</Link>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
