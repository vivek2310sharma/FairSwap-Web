import { ShieldCheck } from "lucide-react";
import { getAccountCopy } from "@/lib/account/copy";

/** Frontend-only preview. No checkout, badge, storage flag or server write. */
export function VerificationBanner({ onOpen }: { onOpen: () => void }) {
  const copy = getAccountCopy();
  const v = copy.verification;

  return (
    <section
      aria-labelledby="verification-heading"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-action-100 text-action-800 dark:bg-action-900 dark:text-action-100">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="verification-heading" className="text-base font-bold text-foreground sm:text-lg">
            {v.heading}
          </h2>
          <p className="mt-1 text-sm text-muted">{v.body}</p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-foreground">
            <span className="text-muted">{v.regularLabel}</span>
            <s aria-hidden="true" className="text-muted">
              ₹99
            </s>
            <span aria-hidden="true" className="text-lg font-bold">
              ₹10
            </span>
            <span className="sr-only">
              {v.regularSr}. {v.offerSr}.
            </span>
            <span>{v.terms}</span>
          </p>
          <p className="mt-2 inline-flex rounded-full bg-action-100 px-2.5 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100">
            {v.status}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="inline-flex min-h-[44px] shrink-0 flex-col items-center justify-center rounded-lg bg-action-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 max-sm:w-full"
      >
        <span>{v.cta}</span>
        <span className="text-[11px] font-medium opacity-90">{copy.comingSoon}</span>
      </button>
    </section>
  );
}
