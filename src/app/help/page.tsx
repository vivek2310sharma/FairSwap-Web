import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { HelpCircle, Search, Shield, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Help Center & FAQ — FairSwap",
  description: "Truthful project guidance and frequently asked questions for the FairSwap development prototype.",
};

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Draft Notice */}
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>Development Prototype Documentation</span>
          </div>
          <p className="mt-1 text-xs">
            This guidance document represents the current prototype implementation of FairSwap (Milestone 1.4).
            Live operations, customer dispute queues, and messaging services are scheduled for Milestone 1.5/1.6.
          </p>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h1>
        <p className="mt-2 text-sm text-muted">
          Understanding how peer-to-peer discovery works on FairSwap.
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Search className="h-5 w-5 text-brand-600" aria-hidden="true" />
              How does browsing and search work?
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              FairSwap indexes approved local listings by title, description, category, and municipal region.
              Keyword searches use PostgreSQL full-text search. Results can be filtered by city, locality, price range,
              and item condition.
            </p>
            <p className="mt-2 text-xs text-muted">
              Note: City selection limits results to that municipality; we do not compute GPS distance radii or pretend
              to provide exact distance measurements.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <HelpCircle className="h-5 w-5 text-brand-600" aria-hidden="true" />
              How do I contact a seller?
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              In this Milestone 1.4 development release, public discovery and favourites are live, but in-app messaging
              is currently in development for Milestone 1.5. No live communication channels or personal phone number
              exchanges are operated at this milestone.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Shield className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Does FairSwap hold money or guarantee delivery?
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              No. FairSwap is strictly a local classifieds bulletin. We never handle payments, provide escrow,
              or guarantee transactions. All exchanges must be conducted directly in person between buyer and seller.
              Please read our{" "}
              <Link href="/safety" className="font-medium text-brand-link underline">
                Safety Tips
              </Link>{" "}
              before meeting.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
