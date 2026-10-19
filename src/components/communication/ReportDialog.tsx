"use client";

import { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createReportAction } from "@/app/account/reports/actions";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "listing" | "user" | "message";
  targetId: string;
  targetName?: string;
}

export function ReportDialog({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await createReportAction(targetType, targetId, reason, details);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    }
  };

  const presetReasons =
    targetType === "message"
      ? [
          "Harassment or offensive language",
          "Scam or fraudulent offer",
          "Unsolicited spam or advertising",
          "Suspicious payment or off-platform request",
          "Other safety concern",
        ]
      : targetType === "listing"
      ? [
          "Prohibited or illegal item",
          "Misleading title or description",
          "Suspected counterfeit or fraud",
          "Duplicate advertisement",
          "Inappropriate photos or content",
        ]
      : [
          "Suspicious behavior or scam",
          "Abusive communications",
          "Impersonation or fake account",
          "Repeated policy violations",
        ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-muted hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
            <Flag className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="report-modal-title" className="text-base font-bold text-foreground">
              Report {targetType}
            </h3>
            {targetName && (
              <p className="text-xs text-muted truncate max-w-xs">{targetName}</p>
            )}
          </div>
        </div>

        {success ? (
          <div className="my-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <h4 className="mt-3 text-base font-bold text-foreground">Report Submitted</h4>
            <p className="mt-1 text-xs text-muted max-w-xs">
              Thank you. Our moderation team will review this report. Your identity is kept confidential.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="report-reason" className="block text-xs font-semibold text-foreground">
                Reason for reporting
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-action-500"
              >
                <option value="">Select a reason...</option>
                {presetReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-details" className="block text-xs font-semibold text-foreground">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Provide any context that will help our team investigate..."
                className="mt-1 block w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-action-500"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-3 text-[11px] text-muted">
              <strong>Confidentiality Note:</strong> The reported party will never be shown who submitted this report.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason}
                className="rounded-xl bg-action-600 px-4 py-2 text-xs font-semibold text-white hover:bg-action-700 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
