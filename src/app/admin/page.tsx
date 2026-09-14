import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: roleData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData?.user?.id || "")
    .single();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Operations</h1>
        <p className="mt-1 text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-900">{userData?.user?.email}</span> (Role:{" "}
          <span className="font-bold text-emerald-700">{roleData?.role}</span>)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Staff Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Assign, modify, or revoke staff roles (administrator, moderator, support agent, content editor).
          </p>
          <div className="mt-4">
            <Link
              href="/admin/staff"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Manage Staff &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Security Audit Trail</h2>
          <p className="mt-1 text-sm text-gray-600">
            View immutable append-only logs of administrative mutations and privileged actions.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/audit"
              className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              View Audit Logs &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Moderation Queue</h2>
          <p className="mt-1 text-sm text-gray-600">
            Review pending marketplace listings, inspect photographs, and approve or reject submissions.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/listings"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Review Listings &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Categories & Schemas</h2>
          <p className="mt-1 text-sm text-gray-600">
            Configure marketplace categories, sort orders, and typed dynamic attributes.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/categories"
              className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Manage Categories &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Locations</h2>
          <p className="mt-1 text-sm text-gray-600">
            View available pilot cities and neighborhood localities for listing placement.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/locations"
              className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              View Locations &rarr;
            </Link>
          </div>
        </div>

        {["administrator", "moderator"].includes(roleData?.role || "") && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            <p className="mt-1 text-sm text-gray-600">
              Search and inspect marketplace accounts, view listings and reports, and manage suspensions.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/users"
                className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Manage Users &rarr;
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">User & Content Reports</h2>
          <p className="mt-1 text-sm text-gray-600">
            Moderate flagged listings, abusive users, and inspect case-scoped reported messages.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/reports"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Reports Queue &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Support & Appeals</h2>
          <p className="mt-1 text-sm text-gray-600">
            Handle customer service inquiries, disputes, and account moderation appeals.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/support"
              className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Support Queue &rarr;
            </Link>
          </div>
        </div>

        {roleData?.role === "administrator" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Privacy & GDPR Fulfillment</h2>
            <p className="mt-1 text-sm text-gray-600">
              Process data export requests and orchestrate account deletion workflows.
            </p>
            <div className="mt-4">
              <Link
                href="/admin/privacy"
                className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Privacy Requests &rarr;
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Security Invariants</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-600">
            <li>All mutations require verified AAL2 MFA.</li>
            <li>Actions are logged atomically with caller UID.</li>
            <li>Audit logs cannot be updated or deleted by application roles.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
