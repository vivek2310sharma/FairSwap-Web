"use client";

import { useActionState, useState } from "react";
import { updateUserAccountStatusAction, type UserModerationResult } from "./actions";

interface UserStatusFormProps {
  targetUserId: string;
  currentStatus: string;
  isSelf: boolean;
  canModerate: boolean;
  blockReason?: string;
}

export default function UserStatusForm({
  targetUserId,
  currentStatus,
  isSelf,
  canModerate,
  blockReason,
}: UserStatusFormProps) {
  const [state, formAction, isPending] = useActionState<UserModerationResult | null, FormData>(
    updateUserAccountStatusAction,
    null
  );

  const defaultNextStatus = currentStatus === "suspended" ? "active" : "suspended";
  const [selectedStatus, setSelectedStatus] = useState(defaultNextStatus);
  const [reason, setReason] = useState("");

  if (isSelf) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
        <span className="font-semibold">Self-Moderation Restricted:</span> You cannot modify your own account status.
      </div>
    );
  }

  if (!canModerate) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
        <span className="font-semibold">Permission Restricted:</span> {blockReason || "You do not have permission to moderate this account."}
      </div>
    );
  }

  const reasonLen = reason.trim().length;
  const isReasonValid = reasonLen >= 10 && reasonLen <= 500;

  return (
    <form action={formAction} className="space-y-4">
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

      <input type="hidden" name="targetUserId" value={targetUserId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Status Action
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium transition-colors ${
              selectedStatus === "suspended"
                ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-500"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="newStatus"
              value="suspended"
              checked={selectedStatus === "suspended"}
              onChange={() => setSelectedStatus("suspended")}
              className="sr-only"
            />
            <span>Suspend Account</span>
          </label>

          <label
            className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm font-medium transition-colors ${
              selectedStatus === "active"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="newStatus"
              value="active"
              checked={selectedStatus === "active"}
              onChange={() => setSelectedStatus("active")}
              className="sr-only"
            />
            <span>Reinstate (Active)</span>
          </label>
        </div>
        {selectedStatus === currentStatus && (
          <p className="mt-1 text-xs text-amber-600">
            Target account is already {currentStatus}. Selecting the same status will be rejected.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Moderation Reason <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-xs ${
              reasonLen > 500
                ? "font-semibold text-red-600"
                : reasonLen >= 10
                ? "text-emerald-600"
                : "text-gray-400"
            }`}
          >
            {reasonLen} / 500 (min 10)
          </span>
        </div>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide mandatory reason for audit log (10-500 characters)..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          This reason will be recorded immutably in the administrative audit log.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending || !isReasonValid || selectedStatus === currentStatus}
        className={`w-full rounded-md py-2 px-4 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
          selectedStatus === "suspended"
            ? "bg-red-600 hover:bg-red-500 focus:ring-red-500"
            : "bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500"
        }`}
      >
        {isPending
          ? "Applying Change..."
          : selectedStatus === "suspended"
          ? "Confirm Account Suspension"
          : "Confirm Account Reinstatement"}
      </button>
    </form>
  );
}
