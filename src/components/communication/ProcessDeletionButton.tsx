"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processAccountDeletionAction } from "@/app/admin/privacy/actions";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface ProcessDeletionButtonProps {
  requestId: string;
  userEmail?: string | null;
}

export function ProcessDeletionButton({
  requestId,
  userEmail,
}: ProcessDeletionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleProcess = async () => {
    if (confirmText !== "DELETE") return;

    setIsProcessing(true);
    setError(null);

    const res = await processAccountDeletionAction(requestId);

    setIsProcessing(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Process Deletion</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !isProcessing && setIsOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Confirm Account Deletion
              </h3>
            </div>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              This will irreversibly anonymize personal records, remove owned storage objects,
              and invoke Supabase Auth Admin deletion for{" "}
              <span className="font-semibold text-gray-900">{userEmail || "this user"}</span>.
            </p>

            {error && (
              <div className="mt-3 rounded-md bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700">
                Type <span className="font-mono text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm uppercase font-mono focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isProcessing}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcess}
                disabled={isProcessing || confirmText !== "DELETE"}
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Orchestrator...</span>
                  </>
                ) : (
                  <span>Execute Deletion</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
