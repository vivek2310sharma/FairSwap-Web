"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { customerReplySupportTicketAction } from "@/app/account/support/actions";

interface SupportReplyFormProps {
  ticketId: string;
}

export function SupportReplyForm({ ticketId }: SupportReplyFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await customerReplySupportTicketAction({
        ticketId,
        content: content.trim(),
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setContent("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply. Please check your network.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5">
      <label htmlFor="support-reply" className="text-sm font-semibold text-foreground">
        Add a reply
      </label>

      {error && (
        <div
          id="support-reply-error"
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3">
        <textarea
          id="support-reply"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your reply here"
          maxLength={3000}
          disabled={isSubmitting}
          aria-describedby={error ? "support-reply-error" : undefined}
          className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted dark:placeholder:text-neutral-300 focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/40"
        />
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-action-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-action-700 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Sending…</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Send reply</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
