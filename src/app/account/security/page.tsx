import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type UserAccount } from "@/types/account";

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/security");
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security & Credentials</h1>
          <p className="mt-1 text-sm text-gray-600">Review your account status and credentials.</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500">
          &larr; Back to Account
        </Link>
      </div>

      {isSuspended && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <p className="font-bold">Account Suspended</p>
          <p className="mt-1">
            Your account is currently suspended. You cannot post listings, send messages, or update your profile.
            You can still review your security status and request your data or account deletion on the{" "}
            <Link href="/account/privacy" className="font-semibold underline">
              Privacy Requests
            </Link>{" "}
            page.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Account Credentials</h2>
          <dl className="mt-4 divide-y divide-gray-100 text-sm">
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-gray-500">Email Address</dt>
              <dd className="font-semibold text-gray-900 sm:col-span-2">{userData.user.email}</dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-gray-500">Account Status</dt>
              <dd className="sm:col-span-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    account?.account_status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {account?.account_status || "unknown"}
                </span>
              </dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-gray-500">Terms Accepted</dt>
              <dd className="text-gray-700 sm:col-span-2">
                {account?.terms_version ? `${account.terms_version}` : "—"}
                {account?.terms_accepted_at && (
                  <span className="block text-xs text-gray-500">
                    Timestamp: {new Date(account.terms_accepted_at).toLocaleString()}
                  </span>
                )}
              </dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-gray-500">Privacy Policy</dt>
              <dd className="text-gray-700 sm:col-span-2">
                {account?.privacy_policy_version ? `${account.privacy_policy_version}` : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Password Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Need to change your password? Request a password reset link sent to your registered email.
          </p>
          <div className="mt-4">
            <Link
              href="/auth/forgot-password"
              className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Request Password Reset
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
