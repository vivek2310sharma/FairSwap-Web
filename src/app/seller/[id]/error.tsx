"use client";

import { getAccountCopy } from "@/lib/account/copy";

export default function SellerProfileError({ reset }: { error: Error; reset: () => void }) {
  const copy = getAccountCopy("en").seller;
  return (
    <main className="flex-1 bg-surface/20">
      <div role="alert" className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-foreground">{copy.errorTitle}</h1>
        <p className="mt-2 text-sm text-muted">{copy.errorBody}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-action-600 px-4 py-2 text-sm font-semibold text-white hover:bg-action-700"
        >
          {copy.retry}
        </button>
      </div>
    </main>
  );
}
