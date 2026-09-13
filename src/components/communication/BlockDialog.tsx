"use client";

import { useState } from "react";
import { ShieldAlert, X, AlertTriangle } from "lucide-react";
import { blockUserAction } from "@/app/account/messages/actions";

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetUserName: string;
  onBlocked?: () => void;
}

export function BlockDialog({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  onBlocked,
}: BlockDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await blockUserAction(targetUserId, reason);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      if (onBlocked) onBlocked();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="block-modal-title" className="text-base font-bold text-foreground">
              Block {targetUserName}
            </h3>
            <p className="text-xs text-muted">Prevent future communications</p>
          </div>
        </div>

        <form onSubmit={handleBlock} className="mt-4 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200 leading-relaxed">
            When you block this user:
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Neither of you will be able to send messages to each other.</li>
              <li>They will not be notified that they were blocked.</li>
              <li>Existing message history will remain visible to both for safety records.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="block-reason" className="block text-xs font-semibold text-foreground">
              Reason for blocking (Private, optional)
            </label>
            <input
              id="block-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Unresponsive, rude, or scam attempt"
              maxLength={500}
              className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
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
              disabled={isSubmitting}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {isSubmitting ? "Blocking..." : "Block User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
