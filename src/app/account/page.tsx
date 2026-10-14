import Link from "next/link";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../auth/actions";
import { type Profile, type UserAccount } from "@/types/account";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single<Profile>();

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your personal profile, security preferences, and privacy requests.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </form>
      </div>

      {isSuspended && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="flex items-center gap-2 font-bold text-red-900">
            <span aria-hidden="true">⚠️</span> Account Suspended
          </div>
          <p className="mt-1">
            Your account is currently suspended. Marketplace actions and profile updates are disabled.
            You retain access to your security overview and privacy/data rights.
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Listings Card */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">My Listings</h2>
          <p className="mt-1 text-xs text-gray-600">Manage marketplace items & photos</p>
          <div className="mt-4 text-sm text-gray-700">
            Create, edit, pause, or submit listings for review.
          </div>
          <div className="mt-6">
            <Link
              href="/account/listings"
              className="inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View Listings &rarr;
            </Link>
          </div>
        </div>
        {/* Profile Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Public Profile</h2>
          <p className="mt-1 text-xs text-gray-500">Visible to other FairSwap users</p>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-semibold text-gray-900">{profile?.display_name || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500">Location: </span>
              <span className="text-gray-800">
                {profile?.city ? `${profile.city}, ${profile.state || ""}` : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Bio: </span>
              <span className="text-gray-700">{profile?.bio || "No bio yet."}</span>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/account/profile"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              Edit Profile &rarr;
            </Link>
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Security & Status</h2>
          <p className="mt-1 text-xs text-gray-500">Account status and credentials</p>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="font-semibold text-gray-900">{userData.user.email}</span>
            </div>
            <div>
              <span className="text-gray-500">Status: </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  account?.account_status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {account?.account_status || "unknown"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Terms Version: </span>
              <span className="text-xs text-gray-700">{account?.terms_version || "—"}</span>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/account/security"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              Security Settings &rarr;
            </Link>
          </div>
        </div>

        {/* Messages Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <p className="mt-1 text-xs text-gray-500">Buyer and seller chats</p>
          <div className="mt-4 text-sm text-gray-600">
            View active conversations, reply to inquiries, and communicate securely.
          </div>
          <div className="mt-6">
            <Link
              href="/account/messages"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              View Inbox &rarr;
            </Link>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          <p className="mt-1 text-xs text-gray-500">Activity and alerts</p>
          <div className="mt-4 text-sm text-gray-600">
            Stay updated on listing moderation, incoming messages, and support updates.
          </div>
          <div className="mt-6">
            <Link
              href="/account/notifications"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              Notification Center &rarr;
            </Link>
          </div>
        </div>

        {/* Support Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Help & Support</h2>
          <p className="mt-1 text-xs text-gray-500">
            {isSuspended ? "Appeals & Inquiries" : "Customer assistance"}
          </p>
          <div className="mt-4 text-sm text-gray-600">
            {isSuspended
              ? "Submit a formal moderation appeal to the FairSwap review team."
              : "Contact customer support or follow up on existing inquiries."}
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/account/support"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              {isSuspended ? "Submit Appeal" : "Support Tickets"}
            </Link>
            <a
              href={HELP_CENTRE_URL}
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              Help Centre
            </a>
          </div>
        </div>

        {/* Privacy Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Data & Privacy</h2>
          <p className="mt-1 text-xs text-gray-500">Manage your data rights</p>
          <div className="mt-4 text-sm text-gray-600">
            Submit formal requests for account data export or account deletion.
          </div>
          <div className="mt-6">
            <Link
              href="/account/privacy"
              className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-500"
            >
              Privacy Requests &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
