import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { AlertOctagon, Clock, ShieldCheck, Ban, ShieldAlert, Flag } from "lucide-react";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

export const metadata = {
  title: "Acceptable Use & Prohibited Ads — FairSwap",
  description:
    "Community safety rules, prohibited items, and acceptable use standards for the FairSwap classifieds platform.",
};

export default function AcceptableUsePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <AlertOctagon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Acceptable Use &amp; Prohibited Ads
            </h1>
            <p className="text-sm text-muted">
              Classifieds standards, prohibited goods, and conduct policies for FairSwap.
            </p>
          </div>
        </div>

        {/* Version & Status Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="h-4 w-4 text-action-600" aria-hidden="true" />
            <span>Version: {LEGAL_POLICY.acceptableUseVersion}</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div>
            <span>Last Updated: {LEGAL_POLICY.acceptableUseLastUpdated}</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Public Beta Baseline</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
          {/* 1. Purpose & Scope */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              1. Purpose &amp; Scope
            </h2>
            <p className="mt-3">
              {LEGAL_POLICY.operatorDescription} FairSwap is built to facilitate safe, honest, and lawful peer-to-peer local trade.
              This Acceptable Use &amp; Prohibited Ads Policy sets out the rules governing all ads, messages, accounts, and interactions on the platform.
            </p>
            <p className="mt-2">
              Every user who creates an account, submits an advertisement, or communicates on FairSwap agrees to comply with these rules in full. Violations may result in ad rejection, immediate removal, account restriction, or permanent termination.
            </p>
          </section>

          {/* 2. Prohibited Conduct */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Ban className="h-5 w-5 text-red-600" aria-hidden="true" />
              <span>2. Prohibited User Conduct &amp; Platform Abuse</span>
            </div>
            <p className="mt-3">
              When using FairSwap, you must never engage in any of the following prohibited activities:
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Fraud &amp; Scams:</span>
                <span>Offering non-existent items, soliciting advance payments, token-fee scams, or phishing attempts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Impersonation &amp; Deception:</span>
                <span>Pretending to be another individual, business entity, moderator, or platform representative.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Harassment &amp; Threats:</span>
                <span>Sending abusive, threatening, hateful, discriminatory, stalking, or intimidating communications.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Privacy Violations &amp; Doxxing:</span>
                <span>Publishing or threatening to publish phone numbers, residential addresses, or private photos without explicit consent.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Spam &amp; Bulk Messaging:</span>
                <span>Sending unsolicited commercial solicitations, automated mass messages, or repetitive duplicate advertisements.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Malware &amp; Security Tampering:</span>
                <span>Distributing malicious links, viruses, unauthorized automated scrapers, or attempting to compromise platform infrastructure.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-foreground min-w-40 sm:min-w-48">• Evading Enforcement:</span>
                <span>Creating new accounts to bypass prior bans, restrictions, blocks, or moderation penalties.</span>
              </li>
            </ul>
          </section>

          {/* 3. Prohibited & Restricted Listings */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <span>3. Prohibited &amp; Restricted Ads</span>
            </div>
            <p className="mt-3">
              FairSwap prohibits the advertising, sale, trade, or transfer of the following categories of items and services:
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Weapons &amp; Dangerous Items</h3>
                <p className="text-muted">Firearms, ammunition, explosives, fireworks, switchblades, tactical combat weapons, and weapon-making blueprints.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Drugs &amp; Controlled Substances</h3>
                <p className="text-muted">Illegal narcotics, prescription medications, pharmacy-only drugs, recreational drugs, and drug paraphernalia.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Stolen &amp; Encumbered Goods</h3>
                <p className="text-muted">Items obtained through theft, burglary, looting, or goods subject to active liens without legal right to transfer.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Counterfeit &amp; Replica Products</h3>
                <p className="text-muted">Fake branded items, counterfeit currency, pirated software, forged official documents, and unauthorized copies.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Protected Wildlife &amp; Animal Trade</h3>
                <p className="text-muted">Endangered species, regulated wildlife, live animals, ivory, animal skins, and prohibited biological specimens.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Hazardous &amp; Regulated Materials</h3>
                <p className="text-muted">Radioactive substances, toxic chemicals, biohazard agents, uncertified pesticides, and regulated flammable liquids.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Adult Services &amp; Exploitative Content</h3>
                <p className="text-muted">Prostitution, escort services, sexually explicit content, non-consensual intimate media, and child-harmful material.</p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/40 p-3.5 space-y-1">
                <h3 className="font-semibold text-foreground">Financial Schemes &amp; Fraud Tools</h3>
                <p className="text-muted">Pyramid schemes, multi-level marketing (MLM), advance-fee solicitations, bank account rentals, and card skimmers.</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              <strong className="font-semibold">Illustrative Boundary:</strong> This list is illustrative rather than exhaustive. FairSwap reserves the right to reject, remove, or modify any ad that is unlawful, unsafe, deceptive, harmful, or incompatible with the platform&apos;s community standards.
            </div>
          </section>

          {/* 4. Moderation & Enforcement */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              4. Platform Moderation &amp; Sanctions
            </h2>
            <p className="mt-3">
              FairSwap enforces compliance with these standards through a combination of review mechanisms and moderation workflows:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Pre-Publication Ad Review:</strong> All seller ad submissions are placed in a moderation review queue and reviewed before becoming publicly searchable. Submissions violating these policies are rejected with stated feedback.
              </li>
              <li>
                <strong className="text-foreground">Ad Removal:</strong> Published advertisements reported or found to violate policies will be removed or unlisted promptly.
              </li>
              <li>
                <strong className="text-foreground">Account Sanctions:</strong> Violations may result in formal warnings, temporary feature restrictions (such as disabling messaging or ad capabilities), temporary account suspension, or permanent account termination.
              </li>
              <li>
                <strong className="text-foreground">Evidence Preservation &amp; Law Enforcement:</strong> FairSwap preserves records and audit trails where reasonably necessary and cooperates with valid lawful orders from Indian law enforcement or regulatory authorities.
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Sanctions are determined contextually based on the severity, frequency, and safety impact of the violation. FairSwap does not guarantee that every violation receives an identical penalty.
            </p>
          </section>

          {/* 5. Reporting & Safety */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Flag className="h-5 w-5 text-action-600" aria-hidden="true" />
              <span>5. Reporting Violations &amp; Safety</span>
            </div>
            <p className="mt-3">
              If you discover an ad or user conduct that violates this policy, we urge you to report it immediately:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Use the in-app <strong className="text-foreground">Report</strong> button located on ad cards, user profiles, and chat conversations.</li>
              <li>Use the in-app <strong className="text-foreground">Block</strong> control to immediately prevent unwanted contact from any abusive user.</li>
              <li>Review our <Link href="/safety" className="font-medium text-brand-link underline hover:text-brand-hover">In-Person Safety Guidelines</Link> before meeting any user for trade.</li>
            </ul>
            <p className="mt-3">
              For formal complaints, intellectual property notices, or severe platform issues, please contact our Grievance Officer on our{" "}
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
        </div>
      </main>
      <Footer />
    </>
  );
}
