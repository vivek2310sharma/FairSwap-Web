"use client";

import { useActionState } from "react";
import { updateProfileAction, type AccountActionResult } from "../actions";
import { type Profile } from "@/types/account";

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, isPending] = useActionState<AccountActionResult | null, FormData>(
    updateProfileAction,
    null
  );

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
          Display Name *
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          minLength={2}
          maxLength={50}
          defaultValue={profile?.display_name || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <p className="mt-1 text-xs text-gray-500">Your public name or business handle (2–50 characters).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            maxLength={100}
            defaultValue={profile?.city || ""}
            placeholder="e.g. Jaipur"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State
          </label>
          <input
            id="state"
            name="state"
            type="text"
            maxLength={100}
            defaultValue={profile?.state || ""}
            placeholder="e.g. Rajasthan"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          About / Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={profile?.bio || ""}
          placeholder="Brief description about yourself or what you typically trade."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <p className="mt-1 text-xs text-gray-500">Maximum 500 characters.</p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
