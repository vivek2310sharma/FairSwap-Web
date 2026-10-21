import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { Mail, Clock, ShieldCheck, Scale } from "lucide-react";

export const metadata = {
  title: "Contact Guidance — FairSwap",
  description: "Contact channels, support information, and grievance redressal guidance for FairSwap.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-action-600" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Contact Guidance
          </h1>
        </div>

        <div className="mt-8 space-y-6">
          {/* Public support must remain accessible without authentication. */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Mail className="h-5 w-5 text-action-600" aria-hidden="true" />
              Public Help &amp; Email Support
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              If you cannot sign up or sign in, visit the{" "}
              <a href={HELP_CENTRE_URL} className="font-medium text-brand-link underline hover:text-brand-hover">
                Help Centre
              </a>{" "}
              for public guidance. You can also email{" "}
              <a href="mailto:support@fairswap.in" className="font-medium text-brand-link underline hover:text-brand-hover">
                support@fairswap.in
              </a>{" "}
              without an account. Never send passwords, OTPs or payment details.
            </p>
          </div>

          {/* Public business WhatsApp support: messaging support; not emergency assistance. */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Mail className="h-5 w-5 text-action-600" aria-hidden="true" />
              WhatsApp Support
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              For FairSwap platform-related questions, you can reach our support team on WhatsApp at{" "}
              <a
                href="https://wa.me/917877966996"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-link underline hover:text-brand-hover"
              >
                +91 7877966996
              </a>.
              You can also use the{" "}
              <a href="https://help.fairswap.in/en/contact" className="font-medium text-brand-link underline hover:text-brand-hover">
                Help Centre contact page
              </a>{" "}
              to find support options.
            </p>
          </div>

          {/* Formal Grievance Redressal Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Scale className="h-5 w-5 text-action-600" aria-hidden="true" />
              Formal Grievance Redressal
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              For grievances regarding your FairSwap account, listings, user conduct, safety, privacy,
              intellectual property notices, or platform compliance, you may contact FairSwap&apos;s Grievance Officer directly:
            </p>
            <div className="mt-3 rounded-lg border border-border/70 bg-surface/50 p-4 text-sm space-y-1">
              <p><strong className="text-foreground">Grievance Officer:</strong> Vivek Kumar</p>
              <p><strong className="text-foreground">Designation:</strong> Grievance Officer — FairSwap</p>
              <p>
                <strong className="text-foreground">Email:</strong>{" "}
                <a
                  href="mailto:grievance@fairswap.in"
                  className="text-brand-link underline hover:text-brand-hover"
                >
                  grievance@fairswap.in
                </a>
              </p>
            </div>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              For detailed submission requirements, categories, and sensitive-information warnings, please visit the{" "}
              <Link href="/grievance" className="font-medium text-brand-link underline hover:text-brand-hover">
                Grievance Redressal Portal
              </Link>.
            </p>
          </div>

          {/* Account Support & Appeals */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="h-5 w-5 text-action-600" aria-hidden="true" />
              Account Support &amp; Moderation Appeals
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Authenticated users can view and manage their support tickets, submit inquiries regarding listing
              moderation decisions, or appeal account actions directly from the{" "}
              <Link href="/account/support" className="font-medium text-brand-link underline hover:text-brand-hover">
                Support Tickets
              </Link>{" "}
              dashboard.
            </p>
          </div>

          {/* Urgent Safety or Prohibited Items */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              Marketplace Safety &amp; Content Reporting
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              To report suspicious listings, fraudulent behavior, harassment, or prohibited items, use the
              built-in <strong className="text-foreground">Report</strong> and <strong className="text-foreground">Block</strong>{" "}
              controls available directly on listing detail pages, seller profiles, and message threads.
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              If you believe there is an immediate risk to someone&apos;s physical safety, please contact your
              local emergency or law enforcement authorities immediately. FairSwap does not provide emergency dispatch services.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
