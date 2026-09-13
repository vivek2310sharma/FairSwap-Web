"use client";

import { useState } from "react";
import { MessageSquare, AlertCircle, X } from "lucide-react";

interface ContactSellerButtonProps {
  sellerName: string;
}

export function ContactSellerButton({ sellerName }: ContactSellerButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
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

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>

            <h3 id="contact-modal-title" className="mt-4 text-lg font-bold text-foreground">
              Contacting {sellerName} (Direct Messaging in Development)
            </h3>

            <p className="mt-2 text-xs text-muted leading-relaxed">
              In this development build (<span className="font-semibold text-foreground">Milestone 1.4</span>),
              public discovery and favourites are live. Persistent real-time buyer-seller conversations and safety
              protections are being built for <span className="font-semibold text-foreground">Milestone 1.5</span>.
            </p>

            <p className="mt-2 text-xs text-muted leading-relaxed">
              To protect user privacy, direct phone numbers and email addresses are not exposed publicly.
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-surface border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
