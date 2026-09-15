"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { moderateListingAction } from "../actions";

interface ModerationActionsProps {
  listingId: string;
  isSelfListing: boolean;
  canApprove: boolean;
}

export default function ModerationActions({
  listingId,
  isSelfListing,
  canApprove,
}: ModerationActionsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<"approve" | "reject" | "remove" | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await moderateListingAction(listingId, "approve");
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/admin/listings");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionWithReason = async () => {
    if (!actionType || actionType === "approve") return;
    if (!reason.trim()) {
      setError("A non-empty reason is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await moderateListingAction(listingId, actionType, reason.trim());
      if (res.error) {
        setError(res.error);
      } else {
        router.push("/admin/listings");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `${actionType} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSelfListing) {
    return (
      <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-xs text-amber-800">
        ⚠️ <strong>Self-approval denied:</strong> You cannot moderate your own listing. Another staff
        member must review it.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">Moderator Decision</h3>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {actionType === null ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canApprove || isSubmitting}
            onClick={handleApprove}
            className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {isSubmitting ? "Approving..." : "✓ Approve Listing"}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setActionType("reject")}
            className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            ✕ Reject with Reason
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setActionType("remove")}
            className="rounded-md border border-stone-300 bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200"
          >
            ⛔ Remove Listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">
              Provide reason to {actionType} this listing:
            </span>
            <button
              type="button"
              onClick={() => {
                setActionType(null);
                setReason("");
                setError(null);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Explain why this listing is being ${actionType}d...`}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting || !reason.trim()}
              onClick={handleActionWithReason}
              className={`rounded px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
                actionType === "reject"
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-stone-700 hover:bg-stone-600"
              }`}
            >
              {isSubmitting ? "Submitting..." : `Confirm ${actionType}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
