"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAccountCopy } from "@/lib/account/copy";

export function SignOutButton({ className = "" }: { className?: string }) {
  const { signOut } = useAuth();
  const copy = getAccountCopy();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setPending(true);
    setFailed(false);
    try {
      await signOut();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-foreground/30 bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:hover:bg-brand-800 max-sm:w-full"
      >
        {pending ? copy.signingOut : copy.signOut}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {copy.signOutFailed}
        </p>
      )}
    </div>
  );
}
