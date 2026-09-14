import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users, Search, Filter, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "User Management — FairSwap Admin",
  description: "Search, inspect, and moderate marketplace user accounts.",
};

type AccountStatus = Database["public"]["Enums"]["account_status_enum"];

export type AdminUserSearchResult = {
  user_id: string;
  email: string;
  display_name: string | null;
  account_status: AccountStatus;
  role: Database["public"]["Enums"]["staff_role_enum"] | null;
  created_at: string;
  listings_count: number;
};

interface AdminUsersPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { q = "", status = "all", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/auth/sign-in?next=/admin/users");
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

  const queryParam = q.trim() || undefined;
  const statusParam =
    status !== "all" && ["active", "suspended", "deletion_pending", "deleted"].includes(status)
      ? (status as AccountStatus)
      : undefined;

  const { data: rawUsers, error } = await supabase.rpc("admin_search_users", {
    p_query: queryParam,
    p_status: statusParam,
    p_limit: pageSize + 1, // fetch 1 extra to check if there is a next page
    p_offset: offset,
  });

  const allUsers = (rawUsers as unknown as AdminUserSearchResult[]) || [];
  const userList = allUsers.slice(0, pageSize);
  const hasNextPage = allUsers.length > pageSize;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "active":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Active
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            Suspended
          </span>
        );
      case "deletion_pending":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Deletion Pending
          </span>
        );
      case "deleted":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            Deleted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            User Account Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Inspect marketplace accounts, review listings & safety reports, and manage suspensions.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by email, display name, or user UUID..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              name="status"
              defaultValue={status}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deletion_pending">Deletion Pending</option>
              <option value="deleted">Deleted</option>
            </select>

            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Search
            </button>

            {(q || status !== "all") && (
              <Link
                href="/admin/users"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load users: {error.message}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {userList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {q || status !== "all"
                ? "Try adjusting your search query or filter."
                : "No marketplace users are registered in the system."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold uppercase text-gray-500">
                  <th scope="col" className="px-6 py-3">User</th>
                  <th scope="col" className="px-6 py-3">Account Status</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Listings</th>
                  <th scope="col" className="px-6 py-3">Registered</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userList.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {u.display_name || "Unnamed User"}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <div className="font-mono text-[11px] text-gray-400 mt-0.5">{u.user_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(u.account_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.role ? (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          <Shield className="h-3 w-3" />
                          {u.role}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {u.listings_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/admin/users/${u.user_id}`}
                        className="font-semibold text-emerald-600 hover:text-emerald-500"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
          <div className="text-sm text-gray-500">
            Page {currentPage}
          </div>
          <div className="flex items-center space-x-2">
            {currentPage > 1 ? (
              <Link
                href={`/admin/users?page=${currentPage - 1}&q=${encodeURIComponent(q)}&status=${status}`}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-300 cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" /> Previous
              </span>
            )}

            {hasNextPage ? (
              <Link
                href={`/admin/users?page=${currentPage + 1}&q=${encodeURIComponent(q)}&status=${status}`}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-300 cursor-not-allowed">
                Next <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
