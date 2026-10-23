import Link from "next/link";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { ACCOUNT_COPY } from "@/lib/account/copy";

export const SCAM_REPORT_HREF = "/account/support/report-scam";

/** Warm safety strip beneath the account cards. Links to the real scam-report flow. */
export function ReportScamStrip() {
  const copy = ACCOUNT_COPY.scamStrip;

  return (
    <section
      aria-label={copy.title}
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">
              {copy.heading}
            </h2>
            <p className="mt-0.5 text-sm">{copy.body}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs sm:text-sm">
              {copy.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sm:shrink-0 sm:text-right">
          <Link
            href={SCAM_REPORT_HREF}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-amber-800 bg-transparent px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-auto dark:border-amber-200 dark:text-amber-100 dark:hover:bg-amber-900/60"
          >
            {copy.cta}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-1.5 text-xs text-amber-900/80 dark:text-amber-100/80">{copy.note}</p>
        </div>
      </div>
    </section>
  );
}
