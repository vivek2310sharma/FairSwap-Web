import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DigiLockerBadge } from "@/components/idv/DigiLockerBadge";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";

/**
 * Server-derived DigiLocker state for the account banner.
 * `verified` only ever comes from the Backend (`get_my_marketplace_access().digilocker_verified`); `disabled` means the
 * server feature flag is off; `unknown` means the Backend status could not be read. Never derived from query or client state.
 */
export type VerificationBannerState = "verified" | "unverified" | "disabled" | "unknown";

/** Mobile-first DigiLocker verification banner. Purely presentational; the page decides the state. */
export function VerificationBanner({ state }: { state: VerificationBannerState }) {
  const c = digiLockerCopy.en;
  const body = state === "unverified" ? c.bannerBody : state === "disabled" ? c.bannerUnavailable : state === "unknown" ? c.bannerUnknown : null;

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
            {state === "verified" ? <DigiLockerBadge /> : c.heading}
          </h2>
          {body && <p className="mt-1 text-sm text-muted">{body}</p>}
        </div>
      </div>
      {state === "unverified" && (
        <div className="flex items-center gap-3 max-sm:w-full">
          <Link
            href="/account/verification"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-action-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 max-sm:w-full"
          >
            {c.button}
          </Link>
        </div>
      )}
    </section>
  );
}
