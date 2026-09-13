"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, LifeBuoy, AlertCircle, Loader2 } from "lucide-react";
import { createSupportTicketAction } from "@/app/account/support/actions";
import { type SupportTicketCategory } from "@/types/communication";

interface CreateTicketDialogProps {
  isSuspended?: boolean;
}

export function CreateTicketDialog({ isSuspended = false }: CreateTicketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<SupportTicketCategory>(
    isSuspended ? "moderation_appeal" : "general"
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!subject.trim() || subject.trim().length < 5) {
      setError("Subject must be at least 5 characters long.");
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setError("Please provide at least 10 characters describing your issue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createSupportTicketAction({
      category,
      subject: subject.trim(),
      message: message.trim(),
    });

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setIsOpen(false);
    setSubject("");
    setMessage("");

    if (res.ticketId) {
      router.push(`/account/support/${res.ticketId}`);
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
      >
        <Plus className="h-4 w-4" />
        <span>{isSuspended ? "Submit Appeal" : "New Inquiry"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => !isSubmitting && setIsOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-stone-100">
                    {isSuspended ? "Submit Moderation Appeal" : "Create Support Ticket"}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Our team typically responds within 24–48 business hours.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  disabled={isSuspended}
                  className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-800/90 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                >
                  <option value="general">General Question</option>
                  <option value="account">Account & Privacy</option>
                  <option value="listing_issue">Listing Help</option>
                  <option value="safety_concern">Safety & Security Concern</option>
                  <option value="moderation_appeal">Moderation Appeal</option>
                  <option value="other">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Summary of your inquiry..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-800/90 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Detailed Description
                </label>
                <textarea
                  rows={5}
                  placeholder="Please provide all relevant details..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={3000}
                  className="mt-1.5 w-full rounded-xl border border-stone-700 bg-stone-800/90 p-3 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-stone-700 bg-transparent px-4 py-2 text-sm font-medium text-stone-300 hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject.trim() || !message.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
