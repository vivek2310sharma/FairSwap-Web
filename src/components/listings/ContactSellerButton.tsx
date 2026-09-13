"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, X, AlertCircle } from "lucide-react";
import { startConversationAction } from "@/app/account/messages/actions";

interface ContactSellerButtonProps {
  sellerName: string;
  listingId?: string;
}

export function ContactSellerButton({ sellerName, listingId }: ContactSellerButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("Hi, is this still available?");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;

    const clean = message.trim();
    if (!clean) return;

    setIsSending(true);
    setErrorMessage(null);

    const clientRequestId = crypto.randomUUID();
    const result = await startConversationAction(listingId, clean, clientRequestId);
    setIsSending(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else if (result.conversationId) {
      setModalOpen(false);
      router.push(`/account/messages/${result.conversationId}`);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span>Contact Seller</span>
      </button>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950">
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="contact-modal-title" className="text-base font-bold text-foreground">
                  Contact {sellerName}
                </h3>
                <p className="text-xs text-muted">Send a direct inquiry about this item</p>
              </div>
            </div>

            <form onSubmit={handleSend} className="mt-4 space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-foreground">
                  Your Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  required
                  placeholder="Ask about condition, price, or pickup availability..."
                  className="mt-1 block w-full rounded-xl border border-border bg-surface p-3 text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
                <div className="mt-1 flex justify-end text-[10px] text-muted">
                  <span>{message.length} / 2000</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface/50 p-3 text-[11px] text-muted">
                <strong>Safety Tip:</strong> Keep payments and personal contact numbers private until you arrange an in-person meeting in a safe public location.
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSending}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !message.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSending ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
