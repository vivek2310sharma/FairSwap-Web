"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction, type AuthActionResult } from "../actions";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

function SignInForm() {
  const searchParams = useSearchParams();
  const next = sanitizeRedirectPath(searchParams.get("next"), "/account");
  const errorParam = searchParams.get("error");
  const messageParam = searchParams.get("message");

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signInAction,
    null
  );

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Sign in to FairSwap</h1>
        <p className="mt-2 text-sm text-gray-600">
          Don&apos;t have an account yet?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Create account
          </Link>
        </p>

        {errorParam === "invalid_token" && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            The confirmation or reset link was invalid or has expired. Please request a new one.
          </div>
        )}

        {errorParam === "oauth_failed" && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            Google sign-in could not be completed. If this is your first time on FairSwap, create an
            account with email first, then use Google with the same verified email.
          </div>
        )}

        {messageParam === "confirm_continue" && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
          >
            Please sign in to continue. If you have just confirmed your email, your account is ready to use.
          </div>
        )}

        {messageParam === "password_reset_success" && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            Your password has been successfully updated. You may now sign in.
          </div>
        )}

        {state?.error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

        <div className="mt-6">
          <GoogleAuthButton next={next} />
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Use the Google account with the same verified email as your existing FairSwap account.
          </p>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or use email</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or use phone</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <PhoneAuthForm next={next} />
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-12 text-center text-gray-600">
          Loading sign in...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
