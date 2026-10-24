"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ShareProfileButtonProps {
  title: string;
  label: string;
  copiedLabel: string;
  failedLabel: string;
}

export function ShareProfileButton({ title, label, copiedLabel, failedLabel }: ShareProfileButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
      } catch {
        setStatus("failed");
      }
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand-300 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600"
      >
        {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        {label}
      </button>
      <span role="status" aria-live="polite" className="min-h-4 text-xs text-muted">
        {status === "copied" ? copiedLabel : status === "failed" ? failedLabel : ""}
      </span>
    </div>
  );
}
