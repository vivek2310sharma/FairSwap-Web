import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shield, Clock, CheckCircle2, XCircle, Trash2, Download } from "lucide-react";
import { ProcessDeletionButton } from "@/components/communication/ProcessDeletionButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & GDPR Fulfillment — FairSwap Admin",
  description: "Fulfill data subject access requests and account deletions.",
};

export default async function AdminPrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/auth/sign-in?next=/admin/privacy");
  }

  // Verify staff role: Administrator only
  const { data: staffData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!staffData || staffData.role !== "administrator") {
    redirect("/admin");
  }

  let query = supabase
    .from("privacy_requests")
    .select(`
      id,
      user_id,
      request_type,
      status,
      requested_at,
      resolved_at,
      resolution_notes
    `)
    .order("requested_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: requests } = await query;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in_progress" },
    { label: "Resolved", value: "resolved" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy & GDPR Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            Process data export requests and orchestrate account deletion and anonymization workflows.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/privacy?status=${t.value}`}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              status === t.value
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {requests && requests.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Request ID</th>
                <th className="px-6 py-3">User ID</th>
                <th className="px-6 py-3">Request Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created At</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">
                    {r.id.slice(0, 8)}...
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-700">
                    {r.user_id ? `${r.user_id.slice(0, 8)}...` : "(Deleted User)"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-800">
                      {r.request_type === "delete_account" ? (
                        <>
                          <Trash2 className="h-3 w-3 text-rose-600" />
                          Delete Account
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 text-blue-600" />
                          Data Export
                        </>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">{getStatusBadge(r.status)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                    {new Date(r.requested_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {r.request_type === "delete_account" &&
                      (r.status === "pending" || r.status === "in_progress") && (
                        <ProcessDeletionButton requestId={r.id} userEmail={r.user_id} />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 font-medium text-gray-800">No {status} privacy requests</p>
            <p className="text-sm">Requests matching this filter will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
