import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { FileText, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Terms of Service (Draft) — FairSwap",
  description: "Draft terms of service for the FairSwap development prototype.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Draft Policy Document (Version: terms-2026-09-draft)</span>
          </div>
          <p className="mt-1 text-xs">
            This document is a developmental draft for local testing and architectural validation.
            It does not constitute a legally binding corporate contract or public terms of service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-brand-600" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Terms of Service (Draft)
          </h1>
        </div>

        <div className="prose dark:prose-invert mt-8 max-w-none space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-foreground">1. Nature of the Platform</h2>
            <p>
              FairSwap is designed as a local classifieds discovery platform. FairSwap operates solely as a directory
              enabling sellers to publish advertisements and buyers to discover them. FairSwap does not act as a buyer,
              seller, broker, auctioneer, or payment processor.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">2. User Responsibility &amp; Content Moderation</h2>
            <p>
              All advertisements submitted to FairSwap are subject to human moderation and review. Submissions containing
              unlawful goods, prohibited items, abusive content, or fraudulent claims will be rejected or removed.
              Users remain solely responsible for the accuracy and legality of items they advertise.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">3. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              FairSwap makes no representations or warranties regarding the condition, safety, merchantability, or legality
              of items listed. Users engage in transactions at their own sole risk and discretion.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">4. Grievance Redressal</h2>
            <p>
              For grievances relating to accounts, content, privacy, safety, intellectual property, or platform use,
              users may contact FairSwap&apos;s Grievance Officer. Details and submission guidance are available on our{" "}
              <Link href="/grievance" className="font-medium text-brand-link underline hover:text-brand-hover">
                Grievance Redressal
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
