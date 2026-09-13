"use client";

import { useActionState } from "react";
import { assignStaffRoleAction, type AdminActionResult } from "../actions";

export default function StaffForm() {
  const [state, formAction, isPending] = useActionState<AdminActionResult | null, FormData>(
    assignStaffRoleAction,
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

      <div>
        <label htmlFor="targetUserId" className="block text-sm font-medium text-gray-700">
          Target User UUID
        </label>
        <input
          id="targetUserId"
          name="targetUserId"
          type="text"
          required
          placeholder="00000000-0000-0000-0000-000000000000"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Staff Role
        </label>
        <select
          id="role"
          name="role"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="moderator">Moderator</option>
          <option value="support_agent">Support Agent</option>
          <option value="content_editor">Content Editor</option>
          <option value="administrator">Administrator</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Assigning..." : "Assign Staff Role"}
      </button>
    </form>
  );
}
