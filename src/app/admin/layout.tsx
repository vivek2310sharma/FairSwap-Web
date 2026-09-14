import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/admin");
  }

  // Check MFA AAL2 assurance
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    redirect("/auth/mfa?next=/admin");
  }

  // Check staff role
  const { data: staffData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!staffData || !staffData.role) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center space-x-4">
            <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
              Staff Portal
            </span>
            <span className="text-sm font-semibold text-gray-900">FairSwap Admin</span>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
              AAL2 Verified
            </span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              Overview
            </Link>
            <Link href="/admin/listings" className="text-gray-600 hover:text-gray-900">
              Listings
            </Link>
            {["administrator", "moderator"].includes(staffData.role) && (
              <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">
                Users
              </Link>
            )}
            {["administrator", "moderator"].includes(staffData.role) && (
              <Link href="/admin/reports" className="text-gray-600 hover:text-gray-900">
                Reports
              </Link>
            )}
            {["administrator", "support_agent"].includes(staffData.role) && (
              <Link href="/admin/support" className="text-gray-600 hover:text-gray-900">
                Support
              </Link>
            )}
            {staffData.role === "administrator" && (
              <Link href="/admin/privacy" className="text-gray-600 hover:text-gray-900">
                Privacy
              </Link>
            )}
            {staffData.role === "administrator" && (
              <Link href="/admin/staff" className="text-gray-600 hover:text-gray-900">
                Staff Roles
              </Link>
            )}
            {staffData.role === "administrator" && (
              <Link href="/admin/audit" className="text-gray-600 hover:text-gray-900">
                Audit Trail
              </Link>
            )}
            <Link href="/" className="text-emerald-600 hover:text-emerald-500">
              &larr; Marketplace
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
