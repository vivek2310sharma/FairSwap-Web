import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldAlert, Eye, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports Queue — FairSwap Admin",
  description: "Review and resolve user and content reports.",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "pending" } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/auth/sign-in?next=/admin/reports");
  }

  // Verify staff role
  const { data: staffData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!staffData || !["administrator", "moderator"].includes(staffData.role)) {
    redirect("/admin");
  }

  // Fetch reports based on status filter
  let query = supabase
    .from("reports")
    .select(`
      id,
      target_type,
      target_id,
      reason,
      details,
      status,
      action_taken,
      created_at,
      resolved_at
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: reports } = await query;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "investigating":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <Clock className="h-3 w-3" />
            Investigating
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case "dismissed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            <XCircle className="h-3 w-3" />
            Dismissed
          </span>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { label: "Pending", value: "pending" },
    { label: "Investigating", value: "investigating" },
    { label: "Resolved", value: "resolved" },
    { label: "Dismissed", value: "dismissed" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User & Content Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            Moderate flagged listings, suspicious user accounts, and reported messages.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/reports?status=${t.value}`}
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
        {reports && reports.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Report ID</th>
                <th className="px-6 py-3">Target</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Reported At</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">
                    {r.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-700">
                      {r.target_type}
                    </span>
                    <div className="mt-1 font-mono text-xs text-gray-400">
                      {r.target_id.slice(0, 12)}...
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold capitalize text-gray-900">
                      {r.reason.replace("_", " ")}
                    </span>
                    {r.details && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{r.details}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">{getStatusBadge(r.status)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/admin/reports/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 font-medium text-gray-800">No {status} reports found</p>
            <p className="text-sm">Reports matching this filter will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
