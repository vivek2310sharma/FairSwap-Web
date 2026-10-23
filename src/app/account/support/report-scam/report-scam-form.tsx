"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { submitScamReportAction, type ScamReportState } from "./actions";
import { SCAM_REPORT_COPY } from "@/lib/account/copy";
import { SCAM_REPORT_MESSAGE_MIN, SUPPORT_LIMITS } from "@/lib/support/tickets";

const FIELD_CLASS =
  "mt-1.5 w-full min-h-[44px] rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted dark:placeholder:text-neutral-300 focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/40 disabled:opacity-60";

// A dropped connection after submit leaves the outcome unknown: never report success or an error
// that invites an immediate duplicate.
async function submitWithUncertaintyGuard(
  previous: ScamReportState,
  formData: FormData
): Promise<ScamReportState> {
  try {
    return await submitScamReportAction(previous, formData);
  } catch {
    return { error: SCAM_REPORT_COPY.uncertainBody, uncertain: true };
  }
}

export function ReportScamForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ScamReportState, FormData>(
    submitWithUncertaintyGuard,
    null
  );

  // Navigate only after the server confirmed the ticket exists (or to sign-in / policy review).
  useEffect(() => {
    if (state?.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  // Authoritative confirmation requires a validated ticket id from the server.
  if (state?.success && state.ticketId) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-action-600/30 bg-action-50 p-5 text-action-900 dark:bg-action-900/20 dark:text-action-100"
      >
        <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{SCAM_REPORT_COPY.successTitle}</p>
          <p className="text-sm">{SCAM_REPORT_COPY.successBody}</p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      {state?.error ? (
        <div
          id="scam-report-error"
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {state.uncertain ? (
              <strong className="block">{SCAM_REPORT_COPY.uncertainTitle}</strong>
            ) : null}
            {state.error}
            {state.uncertain ? (
              <Link
                href="/account/support"
                className="mt-1 block min-h-[44px] py-2 font-semibold underline"
              >
                {SCAM_REPORT_COPY.checkTickets}
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}

      <div>
        <label htmlFor="scam-subject" className="block text-sm font-semibold text-foreground">
          {SCAM_REPORT_COPY.subjectLabel}
        </label>
        <input
          id="scam-subject"
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={SUPPORT_LIMITS.subjectMax}
          disabled={isPending}
          placeholder={SCAM_REPORT_COPY.subjectHint}
          aria-describedby={state?.error ? "scam-report-error" : undefined}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label htmlFor="scam-message" className="block text-sm font-semibold text-foreground">
          {SCAM_REPORT_COPY.messageLabel}
        </label>
        <textarea
          id="scam-message"
          name="message"
          required
          rows={6}
          minLength={SCAM_REPORT_MESSAGE_MIN}
          maxLength={SUPPORT_LIMITS.messageMax}
          disabled={isPending}
          aria-describedby="scam-message-hint"
          className={FIELD_CLASS}
        />
        <p id="scam-message-hint" className="mt-1 text-xs text-muted dark:text-neutral-300">
          {SCAM_REPORT_COPY.messageHint}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-60 sm:w-auto dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{SCAM_REPORT_COPY.submitting}</span>
            </>
          ) : (
            <span>{SCAM_REPORT_COPY.submit}</span>
          )}
        </button>
      </div>
    </form>
  );
}
