import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ShieldCheck, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Privacy Policy (Draft) — FairSwap",
  description: "Draft privacy policy and data governance practices for the FairSwap prototype.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Draft Policy Document (Version: privacy-2026-09-draft)</span>
          </div>
          <p className="mt-1 text-xs">
            This document outlines data governance standards for the FairSwap prototype.
            It does not constitute a legal disclosure for a registered public entity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-brand-600" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy (Draft)
          </h1>
        </div>

        <div className="prose dark:prose-invert mt-8 max-w-none space-y-6 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-foreground">1. Minimal Public Visibility</h2>
            <p>
              FairSwap enforces strict boundaries between public seller attributes and private account data.
              Public profiles show only your chosen display name, avatar, bio, general city/state, and active listings.
              Your account email, phone number, notification settings, and internal IDs are never exposed in public queries
              or API responses.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">2. Listing Media Privacy</h2>
            <p>
              Original photograph uploads are strictly private and accessible only to you and authorized moderators.
              Public visitors only receive pre-processed, metadata-stripped derivative images (thumbnails and scaled WebP photos)
              for listings that have been approved by moderators.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">3. Privacy Rights &amp; Requests</h2>
            <p>
              Authenticated users can submit privacy requests (including data export and account deletion) directly from their
              account settings under <span className="font-semibold text-foreground">/account/privacy</span>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-foreground">4. Privacy Inquiries &amp; Grievances</h2>
            <p>
              For grievances or formal inquiries relating to your personal data, data protection, or privacy rights,
              you may contact FairSwap&apos;s Grievance Officer. Further details are published on our{" "}
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
