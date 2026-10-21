import Link from "next/link";
import { Lock, FileText, Trash2, ArrowRight } from "lucide-react";

export function PrivacyOverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">Privacy & Data Rights</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">
          Manage your data protection, export structured personal data, or submit account deletion requests.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-stone-100">
              Dedicated Privacy Management Page
            </h3>
            <p className="text-xs text-gray-600 dark:text-stone-400">
              Full legal compliance processing under platform terms and Indian DPDP guidelines.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-stone-100">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Data Export Requests</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-stone-400">
              Download structured JSON files containing your profile, active listings, and message records.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-stone-100">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
              <span>Account Deletion</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-stone-400">
              Permanently delete authentication credentials and anonymize marketplace history.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-2">
          <Link
            href="/account/privacy"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span>Access Privacy Requests & History</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
