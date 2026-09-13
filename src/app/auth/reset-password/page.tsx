"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionResult } from "../actions";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose a new secure password for your FairSwap account.
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password (min. 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? "Updating password..." : "Update Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth/sign-in" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
            Cancel and return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
