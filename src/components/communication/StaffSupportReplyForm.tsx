"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffReplySupportTicketAction, updateTicketStatusAction } from "@/app/admin/support/actions";
import { Send, Lock, MessageSquare, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface StaffSupportReplyFormProps {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
}

export function StaffSupportReplyForm({
  ticketId,
  currentStatus,
  currentPriority,
}: StaffSupportReplyFormProps) {
  const [content, setContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const router = useRouter();

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await staffReplySupportTicketAction(ticketId, content.trim(), isInternalNote);

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setContent("");
    setSuccess(res.message || "Action completed.");
    router.refresh();
  };

  const handleUpdateStatusAndPriority = async () => {
    setIsUpdatingStatus(true);
    setError(null);
    setSuccess(null);

    const res = await updateTicketStatusAction(
      ticketId,
      status as "open" | "in_progress" | "awaiting_user" | "resolved" | "closed",
      priority as "low" | "normal" | "high" | "urgent"
    );

    setIsUpdatingStatus(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess("Ticket status updated.");
    router.refresh();
  };

  return (
    <div className="space-y-6">
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

      {/* Ticket Status & Priority Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Manage Ticket State</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting for User</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpdateStatusAndPriority}
          disabled={isUpdatingStatus}
          className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          {isUpdatingStatus ? "Updating..." : "Save State"}
        </button>
      </div>

      {/* Add Reply or Internal Note Form */}
      <form
        onSubmit={handleSendReply}
        className={`rounded-xl border p-5 shadow-sm transition-colors ${
          isInternalNote ? "border-amber-300 bg-amber-50/50" : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={() => setIsInternalNote(false)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                !isInternalNote
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Customer Reply</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInternalNote(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                isInternalNote
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Internal Note</span>
            </button>
          </div>

          {isInternalNote && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              <Lock className="h-3 w-3" />
              Hidden from customer
            </span>
          )}
        </div>

        <div className="mt-3">
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isInternalNote
                ? "Write an internal staff note regarding this case..."
                : "Type message to send directly to the customer..."
            }
            className={`w-full rounded-md border p-3 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
              isInternalNote
                ? "border-amber-300 bg-amber-50/20 focus:border-amber-500 focus:ring-amber-500"
                : "border-gray-300 bg-white focus:border-emerald-500 focus:ring-emerald-500"
            }`}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${
              isInternalNote
                ? "bg-amber-600 hover:bg-amber-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : isInternalNote ? (
              <>
                <Lock className="h-4 w-4" />
                <span>Save Internal Note</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send to Customer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
