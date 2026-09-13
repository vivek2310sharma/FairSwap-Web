import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Mail, Clock, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Contact Guidance — FairSwap",
  description: "Truthful operational status and contact guidance for the FairSwap development prototype.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>Operational Status Notice</span>
          </div>
          <p className="mt-1 text-xs">
            FairSwap is currently in Milestone 1.4 development. There is no active call center,
            live support inbox, or dispute resolution team at this stage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-brand-600" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Contact Guidance
          </h1>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Support &amp; Reporting Availability
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Operational customer support workflows, live buyer-seller reporting queues, and user appeals are scheduled
              for implementation in <span className="font-semibold text-foreground">Milestone 1.5</span> (Communication &amp; Safety)
              and <span className="font-semibold text-foreground">Milestone 1.6</span> (Pilot Readiness).
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              To avoid false expectations, automated contact forms and email submission buttons are disabled until the
              associated staff response queues are fully staffed and operational.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">
              Urgent Safety or Prohibited Items
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              All advertisements currently undergo manual staff review prior to publication. If you encounter any
              suspicious or unlawful behavior during your local testing of this prototype, please report it to your
              local repository administrator or test coordinator.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
