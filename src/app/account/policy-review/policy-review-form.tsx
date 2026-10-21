"use client";

import { useActionState } from "react";
import Link from "next/link";
import { recordPolicyReacceptanceAction, type PolicyReacceptanceActionResult } from "./actions";
import { signOutAction } from "@/app/auth/actions";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

interface PolicyReviewFormProps {
  nextTarget: string;
}

export function PolicyReviewForm({ nextTarget }: PolicyReviewFormProps) {
  const [state, formAction, isPending] = useActionState<PolicyReacceptanceActionResult | null, FormData>(
    recordPolicyReacceptanceAction,
    null
  );

  return (
    <div className="space-y-6">
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="next" value={nextTarget} />

        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start">
            <input
              id="termsAccepted"
              name="termsAccepted"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
            />
            <label htmlFor="termsAccepted" className="ml-3 block text-sm text-gray-700">
              I accept the{" "}
              <Link
                href="/terms"
                className="font-semibold text-emerald-700 underline hover:text-emerald-800"
                target="_blank"
              >
                Terms of Service (v{LEGAL_POLICY.termsVersion})
              </Link>{" "}
              and{" "}
              <Link
                href="/acceptable-use"
                className="font-semibold text-emerald-700 underline hover:text-emerald-800"
                target="_blank"
              >
                Acceptable Use Policy (v{LEGAL_POLICY.acceptableUseVersion})
              </Link>
              , and acknowledge the{" "}
              <Link
                href="/privacy"
                className="font-semibold text-emerald-700 underline hover:text-emerald-800"
                target="_blank"
              >
                Privacy Policy (v{LEGAL_POLICY.privacyVersion})
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
              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
            />
            <label htmlFor="ageConfirmed" className="ml-3 block text-sm text-gray-700">
              I confirm that I am at least {LEGAL_POLICY.minimumAge} years old.
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Recording Acceptance..." : "Accept & Continue"}
        </button>
      </form>

      <div className="border-t border-gray-200 pt-4 text-center space-y-3">
        <p className="text-xs text-gray-500">
          Need to export your data or appeal an account restriction before accepting?
        </p>
        <div className="flex justify-center gap-4 text-xs">
          <Link href="/account/privacy" className="font-semibold text-emerald-700 hover:underline">
            Privacy & Data Rights
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/account/support" className="font-semibold text-emerald-700 hover:underline">
            Support & Appeals
          </Link>
        </div>
        <p className="text-xs text-gray-500 pt-2">
          Or you may sign out of FairSwap:
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 underline focus:outline-none"
          >
            Sign out of FairSwap
          </button>
        </form>
      </div>
    </div>
  );
}
