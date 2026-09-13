import { createClient } from "@/lib/supabase/server";
import StaffForm from "./staff-form";

interface StaffRoleRecord {
  user_id: string;
  role: string;
  assigned_at: string;
  assigned_by: string | null;
}

export default async function AdminStaffPage() {
  const supabase = await createClient();

  const { data: staffList } = await supabase
    .from("staff_roles")
    .select("*")
    .order("assigned_at", { ascending: false })
    .returns<StaffRoleRecord[]>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Role Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Assign, update, or revoke privileged staff roles. All actions require AAL2 MFA and are logged.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Assignment Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Assign / Update Role</h2>
          <StaffForm />
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900">Current Staff Members</h2>
          {(!staffList || staffList.length === 0) ? (
            <p className="mt-4 text-sm text-gray-500">No staff members found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-gray-500">
                    <th className="py-2">User ID</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffList.map((staff) => (
                    <tr key={staff.user_id}>
                      <td className="py-3 font-mono text-xs text-gray-800">{staff.user_id}</td>
                      <td className="py-3">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          {staff.role}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(staff.assigned_at).toLocaleString()}
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
