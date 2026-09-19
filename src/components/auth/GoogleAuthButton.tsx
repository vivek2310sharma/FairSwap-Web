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
        className="flex w-full items-center justify-center gap-2 rounded-md border border-[#747775] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 18 18"
          className="h-[18px] w-[18px] shrink-0"
        >
          <path
            fill="#4285F4"
            d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.703-1.568 2.684-3.879 2.684-6.615Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.957v2.332A9 9 0 0 0 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.706V4.962H.957A9 9 0 0 0 0 9c0 1.45.347 2.824.957 4.038l3.006-2.332Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.323 0 2.509.454 3.44 1.346l2.581-2.581C13.463.892 11.43 0 9 0A9 9 0 0 0 .957 4.962l3.006 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
          />
        </svg>
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
