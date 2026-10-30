"use client";

import { requestIntroReplay } from "@/lib/home-intro/session";

/** Home-page-only replay control. Outside the modal and never changes session eligibility. */
export function ReplayIntroLink() {
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-3">
      <button type="button" onClick={() => requestIntroReplay()}
        className="rounded-md px-3 py-2 text-xs font-medium text-muted underline-offset-4 hover:underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        aria-label="Replay FairSwap introduction">
        Replay introduction
      </button>
    </div>
  );
}