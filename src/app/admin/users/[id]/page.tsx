import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Shield, User, Package, AlertTriangle, FileText, Calendar, Mail, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import UserStatusForm from "../user-status-form";
import type { AdminUserSearchResult } from "../page";

export const metadata: Metadata = {
  title: "User Details & Moderation — FairSwap Admin",
  description: "Inspect user profile, listings, safety reports, and manage moderation status.",
};

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminUserDetailPage({ params, searchParams }: AdminUserDetailPageProps) {
  const { id: targetUserId } = await params;
  const { tab = "listings" } = await searchParams;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect(`/auth/sign-in?next=/admin/users/${targetUserId}`);
  }

  // Verify caller staff role
  const { data: callerStaff } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!callerStaff || !["administrator", "moderator"].includes(callerStaff.role)) {
    redirect("/admin");
  }

  // Fetch target user via search RPC (authoritative for safe email extraction)
  const { data: rawTargetUsers, error: searchError } = await supabase.rpc("admin_search_users", {
    p_query: targetUserId,
    p_limit: 1,
    p_offset: 0,
  });

  const targetUsers = (rawTargetUsers as unknown as AdminUserSearchResult[]) || [];

  if (searchError || targetUsers.length === 0) {
    notFound();
  }

  const targetUser = targetUsers[0];
  const isSelf = targetUserId === userData.user.id;
  const isTargetStaff = !!targetUser.role;
  const isCallerModerator = callerStaff.role === "moderator";
  const canModerate = !isSelf && !(isCallerModerator && isTargetStaff);
  const blockReason = isSelf
    ? "Staff members cannot alter their own account status."
    : isCallerModerator && isTargetStaff
    ? "Moderators cannot modify staff accounts."
    : undefined;

  // Tab 1: Fetch user listings
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, slug, status, price_paise, created_at")
    .eq("seller_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(30);

  // Tab 2: Fetch reports against this user
  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, status, created_at, action_taken")
    .eq("target_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(30);

  // Tab 3: Fetch audit history (Administrator only)
  let auditLogs: Array<{
    id: string;
    action: string;
    actor_id: string;
    details: Record<string, unknown> | null;
    created_at: string;
  }> | null = null;

  if (callerStaff.role === "administrator") {
    const { data: rawLogs } = await supabase
      .from("audit_logs")
      .select("id, action, actor_id, details, created_at")
      .eq("target_entity", "user_accounts")
      .eq("target_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(30);

    auditLogs = (rawLogs || []).map((l) => ({
      ...l,
      details: (typeof l.details === "object" && l.details !== null) ? (l.details as Record<string, unknown>) : null,
    }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header / Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-500 mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to User Management
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="h-7 w-7 text-emerald-600" />
              {targetUser.display_name || "User Profile"}
            </h1>
            <p className="mt-1 text-xs text-gray-500 font-mono">{targetUser.user_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                targetUser.account_status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : targetUser.account_status === "suspended"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              Status: {targetUser.account_status.toUpperCase()}
            </span>
            {targetUser.role && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                <Shield className="h-3 w-3" />
                {targetUser.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: User Profile & Moderation Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Left 2 Cols: User Details */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account Information</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{targetUser.email}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Display Name
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {targetUser.display_name || "—"}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Member Since
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(targetUser.created_at).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Total Listings
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{targetUser.listings_count}</dd>
            </div>
          </dl>
        </div>

        {/* Right Col: Moderation Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-1.5">
            <Shield className="h-5 w-5 text-emerald-600" /> Moderation Action
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Suspend or reinstate this marketplace account. Requires verified AAL2.
          </p>
          <UserStatusForm
            targetUserId={targetUser.user_id}
            currentStatus={targetUser.account_status}
            isSelf={isSelf}
            canModerate={canModerate}
            blockReason={blockReason}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <Link
            href={`/admin/users/${targetUserId}?tab=listings`}
            className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 ${
              tab === "listings"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Package className="h-4 w-4" />
            User Listings ({listings?.length || 0})
          </Link>

          <Link
            href={`/admin/users/${targetUserId}?tab=reports`}
            className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 ${
              tab === "reports"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Safety Reports Against User ({reports?.length || 0})
          </Link>

          <Link
            href={`/admin/users/${targetUserId}?tab=audit`}
            className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 ${
              tab === "audit"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="h-4 w-4" />
            Audit History {callerStaff.role !== "administrator" && "(Admin Only)"}
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      {tab === "listings" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {(!listings || listings.length === 0) ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No listings found for this user.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Listing</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Price</th>
                  <th scope="col" className="px-6 py-3">Created</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {l.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {l.price_paise !== null ? `₹${(l.price_paise / 100).toFixed(2)}` : "Free"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/listings?q=${l.id}`}
                        className="text-emerald-600 hover:text-emerald-500 font-medium inline-flex items-center gap-1"
                      >
                        Inspect <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {(!reports || reports.length === 0) ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No reports have been filed against this user.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Report ID</th>
                  <th scope="col" className="px-6 py-3">Reason</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Created</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.reason}</div>
                      {r.details && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.details}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/reports/${r.id}`}
                        className="text-emerald-600 hover:text-emerald-500 font-medium inline-flex items-center gap-1"
                      >
                        Review <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden p-6">
          {callerStaff.role !== "administrator" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
              <span className="font-semibold">Access Restricted:</span> Immutable security audit logs can only be inspected by users with the Administrator role.
            </div>
          ) : (!auditLogs || auditLogs.length === 0) ? (
            <div className="text-center text-sm text-gray-500 py-6">
              No audit log entries recorded for this user account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-2">Timestamp</th>
                    <th scope="col" className="px-4 py-2">Action</th>
                    <th scope="col" className="px-4 py-2">Actor ID</th>
                    <th scope="col" className="px-4 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">
                        {log.actor_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        <pre className="max-w-md overflow-x-auto bg-gray-50 p-2 rounded text-[11px] font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
