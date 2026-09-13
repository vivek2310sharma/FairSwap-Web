"use client";

import { useActionState } from "react";
import { submitPrivacyRequestAction, type AccountActionResult } from "../actions";

export default function PrivacyForm() {
  const [state, formAction, isPending] = useActionState<AccountActionResult | null, FormData>(
    submitPrivacyRequestAction,
    null
  );

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {state?.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div role="alert" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {state.message}
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">Select Request Type:</legend>

        <div className="flex items-start">
          <input
            id="export_data"
            name="requestType"
            type="radio"
            value="export_data"
            defaultChecked
            className="mt-1 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="export_data" className="ml-3 block text-sm text-gray-700">
            <span className="font-semibold">Export Account Data</span>
            <span className="block text-xs text-gray-500">
              Request a portable copy of your account profile, listings, and message history.
            </span>
          </label>
        </div>

        <div className="flex items-start">
          <input
            id="delete_account"
            name="requestType"
            type="radio"
            value="delete_account"
            className="mt-1 h-4 w-4 border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="delete_account" className="ml-3 block text-sm text-gray-700">
            <span className="font-semibold text-red-700">Delete Account &amp; Data</span>
            <span className="block text-xs text-gray-500">
              Request permanent closure of your account and anonymization of your public advertisements.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
