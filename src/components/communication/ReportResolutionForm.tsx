"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveReportAction } from "@/app/admin/reports/actions";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ReportResolutionFormProps {
  reportId: string;
  currentStatus: string;
  currentNotes?: string | null;
}

export function ReportResolutionForm({
  reportId,
  currentStatus,
  currentNotes,
}: ReportResolutionFormProps) {
  const initialStatus = (["investigating", "resolved", "dismissed"].includes(currentStatus)
    ? currentStatus
    : "resolved") as "investigating" | "resolved" | "dismissed";
  const [status, setStatus] = useState<"investigating" | "resolved" | "dismissed">(initialStatus);
  const [notes, setNotes] = useState(currentNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await resolveReportAction(reportId, status, notes);

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess(res.message || "Report updated successfully.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          Report Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "investigating" | "resolved" | "dismissed")}
          className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="investigating">Under Investigation</option>
          <option value="resolved">Resolved (Action Taken)</option>
          <option value="dismissed">Dismissed (No Violation)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          Resolution / Action Notes
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Explain the findings and actions taken (e.g. seller warned, listing removed, or no violation found)..."
          className="mt-1.5 w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Update Report Status</span>
          )}
        </button>
      </div>
    </form>
  );
}
