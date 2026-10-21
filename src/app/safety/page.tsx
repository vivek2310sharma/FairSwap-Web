import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ShieldAlert, Users, Eye, CreditCard, MapPin } from "lucide-react";
import { IndiaSafetyCard } from "@/components/listings/IndiaSafetyAdvice";

export const metadata = {
  title: "Safety Advice & Guidelines — FairSwap",
  description: "Essential personal safety recommendations for in-person classifieds exchanges.",
};

export default function SafetyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
            <ShieldAlert className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              In-Person Safety Guidelines
            </h1>
            <p className="text-sm text-muted">
              Important rules to protect yourself when trading locally.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MapPin className="h-5 w-5 text-action-600" aria-hidden="true" />
              Meet in Public Spaces
            </div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Always arrange meetups in well-lit, populated public locations during daylight hours, such as
              shopping complexes, transit hubs, or near police stations. Avoid private residences or secluded spots.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Eye className="h-5 w-5 text-action-600" aria-hidden="true" />
              Inspect Before Exchanging
            </div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Thoroughly inspect the physical condition and authenticity of the item in person before handing over
              any cash or making an agreed payment. Test electronics and verify serial numbers where applicable.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <CreditCard className="h-5 w-5 text-action-600" aria-hidden="true" />
              No Advance Payments
            </div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Never wire funds, pay deposits, or transfer money before physically seeing the item.
              Fraudulent sellers often promise courier delivery after advance token transfers. FairSwap does not support
              remote shipping or escrow.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Users className="h-5 w-5 text-action-600" aria-hidden="true" />
              Bring a Friend
            </div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Whenever possible, bring a friend or family member with you to meetings, particularly for high-value
              electronics, vehicles, or jewelry. Inform someone you trust about where you are going.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <IndiaSafetyCard />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">
            Reporting Suspicious Activity &amp; Grievances
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            If you encounter suspicious listings, prohibited items, abusive communication, or fraudulent attempts,
            use the in-app <strong className="text-foreground">Report</strong> and <strong className="text-foreground">Block</strong>{" "}
            features directly on the relevant listing, user profile, or chat message. For full details on prohibited items
            and community standards, review our{" "}
            <Link href="/acceptable-use" className="font-medium text-brand-link underline hover:text-brand-hover">
              Acceptable Use &amp; Prohibited Listings
            </Link>{" "}
            policy.
          </p>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            For unresolved platform concerns or formal grievances, you may contact FairSwap&apos;s Grievance Officer.
            See our{" "}
            <Link href="/grievance" className="font-medium text-brand-link underline hover:text-brand-hover">
              Grievance Redressal
            </Link>{" "}
            page for details.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
