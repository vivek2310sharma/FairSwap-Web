import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ShieldAlert, AlertCircle } from "lucide-react";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { SCAM_REPORT_COPY } from "@/lib/account/copy";
import { ReportScamForm } from "./report-scam-form";

export const metadata: Metadata = {
  title: "Report a scam — FairSwap",
  description: "Tell FairSwap about a suspected scam. Reports are reviewed by the support team.",
};

export default async function ReportScamPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/support/report-scam");
  }

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const status = accountError || !account ? "unavailable" : account.account_status;
  const canReport = status === "active";

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6">
          <Link
            href="/account/support"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-brand-link hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to Help &amp; safety
          </Link>

          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{SCAM_REPORT_COPY.title}</h1>
              <p className="mt-1 text-sm text-muted dark:text-neutral-300">{SCAM_REPORT_COPY.intro}</p>
            </div>
          </div>

          {canReport ? (
            <ReportScamForm />
          ) : (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{SCAM_REPORT_COPY.restrictedTitle}</p>
                <p className="mt-1">
                  {status === "suspended"
                    ? SCAM_REPORT_COPY.restrictedSuspended
                    : SCAM_REPORT_COPY.restrictedOther}
                </p>
              </div>
            </div>
          )}

          <aside className="rounded-2xl border border-border bg-card p-5 text-sm">
            <h2 className="font-semibold text-foreground">{SCAM_REPORT_COPY.financialFraudTitle}</h2>
            <p className="mt-1 text-muted dark:text-neutral-300">{SCAM_REPORT_COPY.financialFraudBody}</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
