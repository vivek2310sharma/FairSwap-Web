"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

type GoogleAuthButtonProps = {
  next?: string;
};

export function GoogleAuthButton({ next = "/account" }: GoogleAuthButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleAuth() {
    setError(null);
    setIsPending(true);

    const safeNext = sanitizeRedirectPath(next, "/account");
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeNext);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (oauthError) {
      setIsPending(false);
      setError("Google sign-in could not be started. Please try again.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs font-bold text-gray-700"
        >
          G
        </span>
        {isPending ? "Connecting to Google..." : "Continue with Google"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
