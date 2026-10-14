import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { FileText, Clock, ShieldCheck } from "lucide-react";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

export const metadata = {
  title: "Terms of Service — FairSwap",
  description: "Terms governing FairSwap classifieds and optional paid listing promotion services in India.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Document Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="text-sm text-muted">
              FairSwap platform user agreement and classifieds terms of service.
            </p>
          </div>
        </div>

        {/* Version & Status Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <span>Version: {LEGAL_POLICY.termsVersion}</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div>
            <span>Last Updated: 14 October 2026 (paid-services clarification)</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Public Beta Baseline</span>
          </div>
        </div>

        {/* Terms Content */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
          {/* 1. About FairSwap */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              1. About FairSwap &amp; Operating Model
            </h2>
            <p className="mt-3">
              {LEGAL_POLICY.operatorDescription} FairSwap is a local classifieds discovery platform designed to connect local community members.
              The platform enables registered sellers to publish advertisements for items they wish to sell, exchange, or give away, and enables buyers to discover local advertisements and initiate communication.
            </p>
            <p className="mt-2">
              FairSwap operates a classifieds listing, discovery, and communication service. It is not the buyer or seller of user-listed items, a buyer-to-seller payment intermediary, an escrow provider, a shipping agent, or a logistics provider. Separately, when optional paid promotion features become available, FairSwap may sell its own digital advertising services to sellers.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              2. User Eligibility (18+ Only)
            </h2>
            <p className="mt-3">
              FairSwap is intended exclusively for individuals who are at least {LEGAL_POLICY.minimumAge} years of age.
              By creating an account, posting an advertisement, sending a message, or otherwise accessing the service, you confirm and warrant that:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>You are at least {LEGAL_POLICY.minimumAge} years old.</li>
              <li>You possess the legal capacity and authority under applicable law to enter into these Terms.</li>
              <li>You have not previously been suspended or permanently barred from the platform for safety, fraud, or policy violations.</li>
            </ul>
            <p className="mt-2">
              FairSwap accounts must not be created or operated by or on behalf of minors. FairSwap does not knowingly provide services to children or offer child/parental consent account flows during Public Beta.
            </p>
          </section>

          {/* 3. Account Responsibilities */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              3. Account Registration &amp; Security
            </h2>
            <p className="mt-3">
              To publish listings, save favourites, or communicate with other users, you must register a FairSwap account. When registering, you agree to:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Provide accurate, current, and genuine registration details (including a valid email address).</li>
              <li>Maintain the confidentiality and security of your login credentials and authentication tokens.</li>
              <li>Remain solely responsible for all activities, communications, and listing submissions conducted through your account.</li>
              <li>Promptly notify FairSwap through our support or grievance channels if you suspect unauthorized access or security compromise of your account.</li>
            </ul>
            <p className="mt-2">
              You must not sell, transfer, or share your account credentials with any third party. While FairSwap employs technical safeguards, FairSwap cannot independently guarantee account security if credentials are compromised.
            </p>
          </section>

          {/* 4. Nature of the Service */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              4. Nature of the Classifieds Service
            </h2>
            <p className="mt-3">
              You acknowledge and agree that FairSwap:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Provides online discovery, search, and communication tools for peer-to-peer classified advertisements.</li>
              <li>Is not the buyer, seller, or owner of any goods or services advertised on the platform.</li>
              <li>Does not collect purchase payments for items listed by users, provide escrow, settle buyer-to-seller transactions, or issue seller payouts. Fees for optional FairSwap promotion services, when available, are separate from the price of any listed item.</li>
              <li>Does not pack, ship, deliver, warehouse, or insure any physical goods.</li>
              <li>Does not provide buyer protection guarantees, seller protection programmes, or item return handling.</li>
              <li>Is not a party to, broker of, or guarantor of any contract, agreement, or exchange arranged between buyers and sellers.</li>
            </ul>
            <p className="mt-2">
              All arrangements—including price negotiation, physical inspection, payment method, handover time, and location—are made directly and independently between buyers and sellers.
            </p>
          </section>


          {/* 4A. Optional paid promotions are a separate merchant service. */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              4A. Optional Plus/Premium Listing Promotions &amp; Service Payments
            </h2>
            <p className="mt-3">
              Standard classifieds participation is separate from any optional Plus or Premium listing promotion. When these upgrades are launched, a seller may choose a paid digital advertising service to increase the visibility of an eligible listing within FairSwap. A paid upgrade is not a purchase of the advertised item and is never mandatory for a standard listing unless an explicit, separately disclosed category rule applies.
            </p>
            <p className="mt-2">
              Before any payment is requested, FairSwap will display the available package, specific promotional benefits, duration, price in Indian rupees, applicable taxes, and total payable amount. No recurring charge or automatic renewal applies unless explicitly offered and separately authorised. If checkout is not available, selecting or enquiring about a plan does not create a payment obligation.
            </p>
            <p className="mt-2">
              Every listing remains subject to the same content and safety moderation, regardless of promotion tier. Any paid promotion becomes active only after the listing is approved, payment is independently confirmed by the payment provider, and the purchased benefit is enabled. An upgrade does not verify a seller, endorse an item, bypass moderation, guarantee search rank at all times, or guarantee enquiries, sales, or buyer safety.
            </p>
            <p className="mt-2">
              When online checkout is enabled, payment for FairSwap&apos;s own promotional services may be collected by an authorised third-party payment gateway. FairSwap does not ask sellers to pay a personal UPI ID, respond to a payment request from another user, or pay an advance delivery or courier fee to activate an upgrade. For cancellations, failed or duplicate charges, rejected listings, and non-delivery of a purchased promotion, please read our{" "}
              <Link href="/refund-policy" className="font-medium text-brand-link underline hover:text-brand-hover">
                Refund &amp; Cancellation Policy
              </Link>.
            </p>
            <p className="mt-2 text-xs">
              These optional-payment provisions apply when a paid service is actually offered and accepted at checkout; they do not imply that payment collection is currently live.
            </p>
          </section>

          {/* 5. Seller & Listing Responsibilities */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              5. Seller Responsibilities &amp; Listing Accuracy
            </h2>
            <p className="mt-3">
              When submitting an advertisement on FairSwap, you represent and warrant that:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>You have the full legal right, title, and authority to advertise and sell or transfer the item.</li>
              <li>All information provided—including title, description, category, condition, locality, and price—is materially accurate, truthful, and not deceptive.</li>
              <li>All uploaded photographs are genuine, authentic representations of the actual item offered, and do not infringe any third-party copyright.</li>
              <li>The item offered complies with all applicable local, state, and national laws in India.</li>
              <li>The item is not stolen, encumbered, counterfeit, hazardous, or prohibited by our policies.</li>
            </ul>
          </section>

          {/* 6. Acceptable Use Policy */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              6. Acceptable Use &amp; Prohibited Listings
            </h2>
            <p className="mt-3">
              Your use of FairSwap is governed by our{" "}
              <Link href="/acceptable-use" className="font-medium text-brand-link underline hover:text-brand-hover">
                Acceptable Use &amp; Prohibited Listings Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
            <p className="mt-2">
              You must not publish advertisements for illegal goods, weapons, controlled substances, adult services, counterfeit goods, or hazardous materials, nor engage in fraudulent conduct, scams, harassment, or platform abuse.
            </p>
          </section>

          {/* 7. Messaging & User Conduct */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              7. Communication &amp; Conduct Rules
            </h2>
            <p className="mt-3">
              FairSwap provides direct in-app messaging to facilitate legitimate classifieds inquiries between buyers and sellers. When using messaging or community features, you agree not to:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Transmit threats, harassment, hate speech, defamatory remarks, or abusive communications.</li>
              <li>Engage in advance-payment fraud, phishing, identity theft, or deceptive solicitations.</li>
              <li>Impersonate any person, business, platform official, or moderator.</li>
              <li>Send unsolicited commercial messages, bulk advertising, or spam.</li>
              <li>Distribute malicious links, software, or files intended to harm or compromise devices.</li>
              <li>Attempt to circumvent platform abuse filters, rate limits, blocks, or moderation decisions.</li>
            </ul>
          </section>

          {/* 8. Moderation & Platform Enforcement */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              8. Moderation &amp; Enforcement
            </h2>
            <p className="mt-3">
              To protect the community and uphold platform standards, FairSwap maintains an active moderation architecture:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Listing Pre-Publication Review:</strong> Advertisements submitted by sellers are placed into a pending review status (<code className="text-xs bg-surface px-1 py-0.5 rounded">pending_review</code>) and undergo human moderation before initial public visibility. Moderators may approve the listing for publication or reject submissions that violate platform policies.
              </li>
              <li>
                <strong className="text-foreground">Post-Publication Removal:</strong> Published listings may be reviewed, modified, unlisted, or removed at any time upon receipt of user reports, policy updates, or safety concerns.
              </li>
              <li>
                <strong className="text-foreground">Communications &amp; Support Material:</strong> Direct messages, support tickets, and user reports are not universally pre-screened prior to transmission, but are subject to review in response to user reports, abuse signals, automated security detections, or statutory requests.
              </li>
              <li>
                <strong className="text-foreground">Enforcement Actions:</strong> FairSwap reserves the right to issue warnings, restrict account capabilities (such as listing creation or messaging), suspend accounts temporarily, terminate accounts permanently, and preserve necessary evidence where required by law.
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Moderation reviews do not constitute an endorsement, guarantee, or warranty regarding the quality, authenticity, safety, or legality of any item or user conduct.
            </p>
          </section>

          {/* 9. User-Generated Content Licence */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              9. User-Generated Content &amp; Limited Licence
            </h2>
            <p className="mt-3">
              You retain all ownership rights in the text, descriptions, and photographs you submit to FairSwap. FairSwap does not claim ownership of your content.
            </p>
            <p className="mt-2">
              By uploading or posting content to FairSwap, you grant FairSwap a non-exclusive, worldwide, royalty-free licence, with the right to permit FairSwap&apos;s service providers to process the content solely as necessary to host, store, reproduce, resize, display, distribute, secure, and operate FairSwap.
            </p>
            <p className="mt-2">
              This licence terminates when you delete your listing or delete your account, subject to technical backup lifecycles and retention required by law.
            </p>
          </section>

          {/* 10. Intellectual Property Complaints */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              10. Intellectual Property Rights &amp; Infringement
            </h2>
            <p className="mt-3">
              FairSwap respects intellectual property rights and expects users to do the same. You must not upload photos, text, or logos that infringe copyrights, trademarks, or proprietary rights of others.
            </p>
            <p className="mt-2">
              If you believe content on FairSwap infringes your copyright or trademark under Indian law, please submit a formal notice to FairSwap&apos;s Grievance Officer with the relevant listing URL, proof of ownership, and specific infringement details. Details are available on our{" "}
              <Link href="/grievance" className="font-medium text-brand-link underline hover:text-brand-hover">
                Grievance Redressal
              </Link>{" "}
              page or via email at{" "}
              <a href="mailto:grievance@fairswap.in" className="font-medium text-brand-link underline hover:text-brand-hover">
                grievance@fairswap.in
              </a>
              .
            </p>
          </section>

          {/* 11. Transactions & Personal Safety */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              11. Offline Transactions &amp; Personal Safety
            </h2>
            <p className="mt-3">
              Because FairSwap does not handle payments or delivery for items advertised by users, in-person meetings and transactions carry inherent risks. You agree to exercise care, diligence, and sound judgment:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Inspect physical items thoroughly in person before making any payment or completing an exchange.</li>
              <li>Meet during daylight hours in well-lit, populated public locations (such as transit hubs or commercial centres).</li>
              <li>Avoid secluded places, private residences, or unfamiliar areas for meetups.</li>
              <li>Never send advance token payments, wire transfers, or deposits for unseen items.</li>
            </ul>
            <p className="mt-2">
              Please review our{" "}
              <Link href="/safety" className="font-medium text-brand-link underline hover:text-brand-hover">
                In-Person Safety Guidelines
              </Link>{" "}
              for detailed practical recommendations.
            </p>
          </section>

          {/* 12. Warranties & Disclaimers */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              12. Disclaimers &amp; Limitation of Liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by applicable law, FairSwap is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express, implied, statutory, or otherwise.
            </p>
            <p className="mt-2">
              FairSwap specifically disclaims any warranties of merchantability, fitness for a particular purpose, non-infringement, title, and quiet enjoyment. FairSwap makes no representations or warranties regarding:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>The condition, quality, safety, genuineness, or legality of any item advertised on the platform.</li>
              <li>The truth, completeness, or accuracy of any listing description, photograph, or user profile.</li>
              <li>The identity, character, background, or creditworthiness of any buyer or seller.</li>
              <li>The willingness or ability of any counterparty to complete a transaction or fulfill agreed commitments.</li>
              <li>Uninterrupted, secure, or error-free operation of the platform.</li>
            </ul>
            <p className="mt-2">
              To the extent permitted by applicable law, FairSwap and Vivek Kumar shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or property damage arising from offline meetings, item defects, or user interactions.
            </p>
          </section>

          {/* 13. Grievance Redressal */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              13. Grievance Redressal Mechanism
            </h2>
            <p className="mt-3">
              In accordance with platform governance, FairSwap operates a dedicated grievance redressal process. If you have a grievance regarding accounts, listings, safety, privacy, content, or platform conduct, you may contact our Grievance Officer:
            </p>
            <div className="mt-4 rounded-lg border border-border/80 bg-surface/50 p-4 text-xs space-y-1">
              <p><strong className="text-foreground">Officer:</strong> {LEGAL_POLICY.operatorName}</p>
              <p><strong className="text-foreground">Designation:</strong> {LEGAL_POLICY.grievanceOfficerTitle}</p>
              <p>
                <strong className="text-foreground">Email:</strong>{" "}
                <a href={`mailto:${LEGAL_POLICY.grievanceEmail}`} className="text-brand-link underline hover:text-brand-hover">
                  {LEGAL_POLICY.grievanceEmail}
                </a>
              </p>
              <p>
                <strong className="text-foreground">Grievance Portal:</strong>{" "}
                <Link href={LEGAL_POLICY.grievanceRoute} className="text-brand-link underline hover:text-brand-hover">
                  fairswap.in{LEGAL_POLICY.grievanceRoute}
                </Link>
              </p>
            </div>
          </section>

          {/* 14. Privacy */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              14. Privacy &amp; Data Protection
            </h2>
            <p className="mt-3">
              FairSwap processes personal information in accordance with our{" "}
              <Link href="/privacy" className="font-medium text-brand-link underline hover:text-brand-hover">
                Privacy Policy
              </Link>
              . By using FairSwap, you acknowledge that your personal data is collected, stored, and processed as described in that policy.
            </p>
          </section>

          {/* 15. Suspension & Termination */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              15. Suspension &amp; Account Termination
            </h2>
            <p className="mt-3">
              You may close your FairSwap account at any time by submitting an account deletion request under{" "}
              <Link href="/account/privacy" className="font-medium text-brand-link underline hover:text-brand-hover">
                /account/privacy
              </Link>
              .
            </p>
            <p className="mt-2">
              FairSwap may suspend, restrict, or terminate your account or access to the service at any time with or without prior notice if we reasonably believe you have breached these Terms, violated our Acceptable Use Policy, engaged in fraudulent or abusive conduct, created security risks, or if required to do so by applicable law.
            </p>
          </section>

          {/* 16. Changes to Terms */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              16. Policy Updates &amp; Changes
            </h2>
            <p className="mt-3">
              FairSwap may update these Terms from time to time to reflect product enhancements, legal requirements, or operational changes. When material changes are made, we will update the version and date shown at the top of this page and provide notice through the platform where appropriate.
            </p>
            <p className="mt-2">
              Changes do not apply retroactively. Your continued access to or use of FairSwap following notification of updated Terms constitutes your agreement to the revised Terms.
            </p>
          </section>

          {/* 17. Governing Law */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              17. Governing Law &amp; Jurisdiction
            </h2>
            <p className="mt-3">
              These Terms are governed by the laws of India. Any dispute arising from these Terms or use of FairSwap will be subject to courts having competent jurisdiction under applicable law.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
