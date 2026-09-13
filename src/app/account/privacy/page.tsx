import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type PrivacyRequest } from "@/types/account";
import PrivacyForm from "./privacy-form";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/privacy");
  }

  const { data: requests } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("requested_at", { ascending: false })
    .returns<PrivacyRequest[]>();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy & Data Rights</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit data export or account deletion requests under platform policy.
          </p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500">
          &larr; Back to Account
        </Link>
      </div>

      <div className="space-y-8">
        {/* Request Submission Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Submit a Privacy Request</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select the type of request. Submissions are limited to 3 requests per 30-day window.
          </p>

          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <span className="font-semibold">Milestone Notice:</span> Submitting here creates a tracked record
            in our database. Manual or automated export and account deletion processing will be fulfilled in
            Milestone 1.5.
          </div>

          <PrivacyForm />
        </div>

        {/* Request History Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Request History</h2>
          <p className="mt-1 text-xs text-gray-500">Records of your previous privacy requests</p>

          {(!requests || requests.length === 0) ? (
            <p className="mt-4 text-sm text-gray-500">No privacy requests submitted yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-gray-500">
                    <th className="py-2">Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Requested At</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className="py-3 font-medium text-gray-900">
                        {req.request_type === "export_data" ? "Data Export" : "Account Deletion"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            req.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : req.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-xs text-gray-600">
                        {req.resolution_notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
