"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionResult } from "../actions";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";
import { AuthCloseLink } from "@/components/auth/AuthCloseLink";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signUpAction,
    null
  );

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <AuthCloseLink />
        <h1 className="pr-10 text-2xl font-bold text-gray-900">Create your FairSwap account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Sign in
          </Link>
        </p>

        {state?.error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              minLength={2}
              maxLength={50}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Your name or public handle"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password (min. 8 characters)
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start">
              <input
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
              />
              <label htmlFor="termsAccepted" className="ml-2 block min-w-0 text-xs text-gray-700">
                I accept the{" "}
                <Link href="/terms" className="text-emerald-700 underline hover:text-emerald-800" target="_blank">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/acceptable-use" className="text-emerald-700 underline hover:text-emerald-800" target="_blank">
                  Acceptable Use Policy
                </Link>
                , and acknowledge the{" "}
                <Link href="/privacy" className="text-emerald-700 underline hover:text-emerald-800" target="_blank">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <div className="flex items-start">
              <input
                id="ageConfirmed"
                name="ageConfirmed"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
              />
              <label htmlFor="ageConfirmed" className="ml-2 block min-w-0 text-xs text-gray-700">
                I confirm that I am at least {LEGAL_POLICY.minimumAge} years old.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-emerald-700 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-6 border-t border-gray-100 pt-4 text-center text-sm text-gray-600">
          Need help creating an account?{" "}
          <a href={HELP_CENTRE_URL} className="font-semibold text-emerald-700 underline hover:text-emerald-800">
            Visit the Help Centre
          </a>
        </p>
      </div>
    </main>
  );
}
