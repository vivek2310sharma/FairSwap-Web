"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, LifeBuoy, AlertCircle, Loader2 } from "lucide-react";
import { createSupportTicketAction } from "@/app/account/support/actions";
import {
  CUSTOMER_SELECTABLE_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_LIMITS,
  SUPPORT_UNCERTAIN_MESSAGE,
  supportTicketCategorySchema,
  type SupportTicketCategory,
} from "@/lib/support/tickets";

interface CreateTicketDialogProps {
  isSuspended?: boolean;
}

const FIELD_CLASS =
  "mt-1.5 w-full min-h-[44px] rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted dark:placeholder:text-neutral-300 focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/40 disabled:opacity-60";

export function CreateTicketDialog({ isSuspended = false }: CreateTicketDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<SupportTicketCategory>(
    isSuspended ? "moderation_appeal" : "general"
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when a previous submit may or may not have created a ticket. Blocks resubmission until the
  // user has looked at their ticket list.
  const [uncertain, setUncertain] = useState(false);

  const router = useRouter();
  const uid = useId();
  const titleId = `${uid}-title`;
  const errorId = `${uid}-error`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    subjectRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || uncertain) return;

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 5) {
      setError("Subject must be at least 5 characters long.");
      return;
    }
    if (trimmedMessage.length < 10) {
      setError("Please provide at least 10 characters describing your issue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Suspended accounts can only file appeals; the server enforces this too.
      const parsedCategory = supportTicketCategorySchema.safeParse(
        isSuspended ? "moderation_appeal" : category
      );
      if (!parsedCategory.success) {
        setError(parsedCategory.error.errors[0]?.message ?? "Please choose a valid category.");
        return;
      }

      const res = await createSupportTicketAction({
        category: parsedCategory.data,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      if (res.uncertain) {
        setUncertain(true);
        setError(res.error ?? SUPPORT_UNCERTAIN_MESSAGE);
        return;
      }

      if (res.error || !res.ticketId) {
        // A success flag without a validated ticket id is never treated as confirmation.
        setError(res.error ?? SUPPORT_UNCERTAIN_MESSAGE);
        if (!res.error) setUncertain(true);
        return;
      }

      setIsOpen(false);
      setSubject("");
      setMessage("");
      router.push(`/account/support/${res.ticketId}`);
    } catch {
      // The request may have reached the server before the connection dropped.
      setUncertain(true);
      setError(SUPPORT_UNCERTAIN_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-action-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-action-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>{isSuspended ? "Submit appeal" : "New inquiry"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={close} aria-hidden="true" />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-action-50 text-action-700 dark:bg-action-900/40 dark:text-action-300">
                  <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 id={titleId} className="text-base font-semibold text-foreground">
                  {isSuspended ? "Submit moderation appeal" : "Create support ticket"}
                </h3>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={isSubmitting}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted dark:text-neutral-300 hover:bg-surface hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
              {error && (
                <div
                  id={errorId}
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {error}
                    {uncertain ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Keep the draft, close the dialog and refresh the list so the user can look.
                          setUncertain(false);
                          setError(null);
                          setIsOpen(false);
                          triggerRef.current?.focus();
                          router.refresh();
                        }}
                        className="mt-1 block min-h-[44px] py-2 text-left text-sm font-semibold underline"
                      >
                        Check my tickets
                      </button>
                    ) : null}
                  </span>
                </div>
              )}

              <div>
                <label htmlFor={`${uid}-category`} className="block text-sm font-semibold text-foreground">
                  Category
                </label>
                <select
                  id={`${uid}-category`}
                  value={isSuspended ? "moderation_appeal" : category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  disabled={isSuspended || isSubmitting}
                  className={FIELD_CLASS}
                >
                  {(isSuspended ? (["moderation_appeal"] as const) : CUSTOMER_SELECTABLE_CATEGORIES).map(
                    (value) => (
                      <option key={value} value={value}>
                        {SUPPORT_CATEGORY_LABELS[value]}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label htmlFor={`${uid}-subject`} className="block text-sm font-semibold text-foreground">
                  Subject
                </label>
                <input
                  id={`${uid}-subject`}
                  ref={subjectRef}
                  type="text"
                  placeholder="Summary of your inquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={SUPPORT_LIMITS.subjectMax}
                  disabled={isSubmitting}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <label htmlFor={`${uid}-message`} className="block text-sm font-semibold text-foreground">
                  Details
                </label>
                <textarea
                  id={`${uid}-message`}
                  rows={5}
                  placeholder="Please provide all relevant details"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={SUPPORT_LIMITS.messageMax}
                  disabled={isSubmitting}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={FIELD_CLASS}
                />
                <p className="mt-1 text-xs text-muted dark:text-neutral-300">
                  Do not share passwords, OTPs, UPI PINs or card numbers.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={isSubmitting}
                  className="min-h-[44px] rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uncertain || !subject.trim() || !message.trim()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-action-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-action-700 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <span>Submit ticket</span>
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
