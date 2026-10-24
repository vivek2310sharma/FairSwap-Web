"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { getAccountCopy } from "@/lib/account/copy";

interface ComingSoonDialogProps {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
}

/**
 * Native modal dialog: top-layer rendering (above sticky header and bottom nav),
 * focus trapping, Escape to close and focus return to the trigger are built in.
 * Opening or closing performs no network, storage or analytics work.
 */
export function ComingSoonDialog({ open, title, body, onClose }: ComingSoonDialogProps) {
  const copy = getAccountCopy();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="coming-soon-title"
      aria-describedby="coming-soon-body"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-action-100 px-2.5 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100">
              {copy.comingSoon}
            </span>
            <h2 id="coming-soon-title" className="mt-3 text-lg font-bold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-brand-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:hover:bg-brand-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p id="coming-soon-body" className="mt-3 text-sm leading-6 text-muted">
          {body}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-action-600 px-5 text-sm font-semibold text-white hover:bg-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 max-sm:w-full"
          >
            {copy.gotIt}
          </button>
        </div>
      </div>
    </dialog>
  );
}
