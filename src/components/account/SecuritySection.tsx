import Link from "next/link";
import { type UserAccount } from "@/types/account";

interface SecuritySectionProps {
  email?: string;
  account: UserAccount | null;
  isSuspended: boolean;
}

export function SecuritySection({ email, account, isSuspended }: SecuritySectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Security & Status</h2>
        <p className="mt-1 text-sm text-muted">
          Review your account status, credentials, and legal policy acceptance.
        </p>
      </div>

      {isSuspended && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">Account Credentials</h3>
          <dl className="mt-4 divide-y divide-border text-sm">
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-muted">Email Address</dt>
              <dd className="font-semibold text-foreground sm:col-span-2">{email || "—"}</dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-muted">Account Status</dt>
              <dd className="sm:col-span-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    account?.account_status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {account?.account_status || "unknown"}
                </span>
              </dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-muted">Terms Accepted</dt>
              <dd className="text-muted sm:col-span-2">
                {account?.terms_version ? `${account.terms_version}` : "—"}
                {account?.terms_accepted_at && (
                  <span className="block text-xs text-muted">
                    Timestamp: {new Date(account.terms_accepted_at).toLocaleString()}
                  </span>
                )}
              </dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3">
              <dt className="text-muted">Privacy Policy</dt>
              <dd className="text-muted sm:col-span-2">
                {account?.privacy_policy_version ? `${account.privacy_policy_version}` : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">Password Management</h3>
          <p className="mt-1 text-sm text-muted">
            Need to change your password? Request a password reset link sent to your registered email.
          </p>
          <div className="mt-4">
            <Link
              href="/auth/forgot-password"
              className="inline-block rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-muted hover:bg-brand-50 dark:hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-action-500 focus:ring-offset-2  dark:hover:bg-stone-700"
            >
              Request Password Reset
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
