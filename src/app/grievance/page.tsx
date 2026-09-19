import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Scale, Mail, ShieldAlert, AlertTriangle, CheckCircle2, FileText } from "lucide-react";

export const metadata = {
  title: "Grievance Redressal — FairSwap",
  description:
    "Contact FairSwap's Grievance Officer regarding account, listing, safety, privacy, content, or other platform-related concerns.",
};

export default function GrievancePage() {
  const categories = [
    { title: "Account or access", desc: "Issues accessing your account, authentication difficulties, or account status." },
    { title: "Listing or content", desc: "Concerns regarding advertised items, descriptions, pricing accuracy, or prohibited content." },
    { title: "User behaviour / safety", desc: "Harassment, abusive communication, suspicious buyer or seller conduct, or safety risks." },
    { title: "Reporting or blocking", desc: "Inquiries or appeals regarding platform reports, blocked users, or moderation outcomes." },
    { title: "Privacy / personal data", desc: "Questions or requests regarding personal data handling, privacy rights, or data protection." },
    { title: "Intellectual property or legal notice", desc: "Notices regarding copyright, trademark infringement, or statutory notices." },
    { title: "Technical / platform issue", desc: "Platform defects, unexpected error states, or system failures affecting usage." },
    { title: "Other grievance", desc: "Any other grievance or platform-related concern not covered by the categories above." },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Grievance Redressal
            </h1>
            <p className="text-sm text-muted">
              FairSwap platform grievance redressal mechanism and Grievance Officer details.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {/* Grievance Officer Card */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              Contact the Grievance Officer
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              If you have a grievance relating to your FairSwap account, a listing, user-generated content,
              safety, privacy, reporting, or use of the FairSwap platform, you may contact FairSwap&apos;s
              Grievance Officer.
            </p>

            <div className="mt-6 rounded-lg border border-border/80 bg-surface/50 p-5 space-y-3">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted uppercase tracking-wider">
                    Grievance Officer
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    Vivek Kumar
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted uppercase tracking-wider">
                    Designation
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    Grievance Officer — FairSwap
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted uppercase tracking-wider">
                    Email Address
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    <a
                      href="mailto:grievance@fairswap.in"
                      className="inline-flex items-center gap-1.5 text-brand-link underline hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      <span>grievance@fairswap.in</span>
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted uppercase tracking-wider">
                    Grievance Portal
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    <Link
                      href="/grievance"
                      className="text-brand-link underline hover:text-brand-hover"
                    >
                      https://fairswap.in/grievance
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>

            <p className="mt-4 text-xs text-muted">
              Please include enough information for us to understand and investigate your grievance.
            </p>
          </section>

          {/* Grievance Categories */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              Grievance Categories
            </h2>
            <p className="mt-1 text-sm text-muted">
              When contacting the Grievance Officer, please select or specify the relevant category for your concern:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {categories.map((cat) => (
                <div key={cat.title} className="rounded-lg border border-border/60 bg-surface/30 p-3.5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" />
                    <span>{cat.title}</span>
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What to Include */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              What to Include in Your Submission
            </h2>
            <p className="mt-1 text-sm text-muted">
              To assist with prompt and accurate review, please provide the following details in your email:
            </p>

            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">Full Name:</strong> Your name as the complainant or authorized representative.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">FairSwap Account Email:</strong> If applicable, the email associated with your FairSwap account.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">Grievance Category:</strong> The category that best describes your concern.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">Specific Identifier:</strong> Relevant listing URL, user profile, or conversation identifier.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">Clear Description:</strong> A factual explanation of the concern, including relevant dates and circumstances.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span><strong className="text-foreground">Supporting Material:</strong> Screenshots or documentation where appropriate to assist investigation.</span>
              </li>
            </ul>

            {/* Privacy & Security Warning */}
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Security &amp; Sensitive Information Notice</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                For your security, please <strong>never</strong> include passwords, OTP codes, MFA/TOTP secrets,
                recovery codes, payment credentials, bank account numbers, card details, or Aadhaar numbers.
                FairSwap does not request Aadhaar or other identity documents as part of the normal grievance process.
                Please do not submit unnecessary sensitive personal information.
              </p>
            </div>
          </section>

          {/* Response & Review Process */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              Review and Response Process
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              FairSwap will review grievances submitted through the published grievance channel, acknowledge
              them as required by applicable law or policy, investigate the information provided, take
              appropriate action where required, and communicate an outcome or request further information
              where necessary.
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              If the intermediary grievance provisions of the Information Technology
              (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 apply to FairSwap,
              Rule 3A provides an appeal route to the Grievance Appellate Committee (GAC).
              A person aggrieved by a Grievance Officer decision may appeal within the applicable
              30-day period, and Rule 3A also covers certain grievances not resolved within the
              applicable Rule 3 resolution period. Appeals are handled online through the{" "}
              <a
                href="https://gac.gov.in"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-link underline hover:text-brand-hover"
              >
                official GAC portal
              </a>
              .
            </p>
          </section>

          {/* Safety & Urgent Concerns */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldAlert className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <span>Safety and Urgent Concerns</span>
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              For active marketplace interactions, users should utilize FairSwap&apos;s existing{" "}
              <strong className="text-foreground">Report</strong> and <strong className="text-foreground">Block</strong>{" "}
              controls available on listings, user profiles, and chat conversations.
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              If you believe there is an immediate risk to someone&apos;s safety, contact the appropriate local
              emergency or law-enforcement service. FairSwap is an online classifieds directory and does not
              provide emergency response services.
            </p>
            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-4 text-xs text-muted">
              <span>
                Read our{" "}
                <Link href="/safety" className="text-brand-link underline hover:text-brand-hover">
                  In-Person Safety Tips
                </Link>
              </span>
              <span>•</span>
              <span>
                Visit the{" "}
                <Link href="/help" className="text-brand-link underline hover:text-brand-hover">
                  Help Center &amp; FAQ
                </Link>
              </span>
              <span>•</span>
              <span>
                Review{" "}
                <Link href="/contact" className="text-brand-link underline hover:text-brand-hover">
                  Contact Guidance
                </Link>
              </span>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
