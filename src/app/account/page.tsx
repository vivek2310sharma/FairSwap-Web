import Link from "next/link";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../auth/actions";
import { type Profile, type UserAccount } from "@/types/account";
import { ShoppingBag, MessageSquare, Bell, Settings, LifeBuoy, Heart, Lock } from "lucide-react";

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

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isAccountUnavailable = Boolean(accountError || !account);
  const isSuspended = !isAccountUnavailable && account?.account_status === "suspended";
  const isDeletionPending = !isAccountUnavailable && account?.account_status === "deletion_pending";
  const isDeleted = !isAccountUnavailable && account?.account_status === "deleted";
  const isActive = !isAccountUnavailable && account?.account_status === "active";
  const isRestricted = isSuspended || isDeletionPending || isDeleted || isAccountUnavailable;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-stone-100">My Account</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">
            Overview of your marketplace listings, conversations, settings, and support.
          </p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Alert Notices */}
      {isAccountUnavailable && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <span aria-hidden="true">⚠️</span> Account Information Unavailable
          </div>
          <p className="mt-1">
            Unable to verify account status right now. Profile editing and marketplace actions may be limited.
          </p>
        </div>
      )}

      {isSuspended && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-200">
            <span aria-hidden="true">⚠️</span> Account Suspended
          </div>
          <p className="mt-1">
            Your account is currently suspended. Marketplace actions and profile updates are disabled.
            You retain access to your security overview, support appeals, and privacy rights.
          </p>
        </div>
      )}

      {isDeletionPending && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <span aria-hidden="true">⏳</span> Account Deletion Pending
          </div>
          <p className="mt-1">
            Your account deletion request is currently pending processing.
          </p>
        </div>
      )}

      {isDeleted && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-200">
            <span aria-hidden="true">⚠️</span> Account Closed
          </div>
          <p className="mt-1">
            This account has been closed. Marketplace actions and profile updates are disabled.
          </p>
        </div>
      )}

      {/* 4 Streamlined Cards Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Card 1: My Listings */}
        <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">My Listings</h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">Manage items & photos</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700 dark:text-stone-300">
              Create, edit, pause, or submit listings for review.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-emerald-200/60 pt-4 dark:border-emerald-900/40">
            <Link
              href="/account/listings"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              View My Listings →
            </Link>
            <Link
              href="/account/favourites"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              Favourites
            </Link>
          </div>
        </div>

        {/* Card 2: Messages & Activity */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                <MessageSquare className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">Messages & Activity</h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">Buyer & seller communications</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-stone-300">
              Reply to buyer inquiries, communicate securely, and view account alerts.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-stone-800">
            <Link
              href="/account/messages"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              View Inbox →
            </Link>
            <Link
              href="/account/notifications"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              Notifications
            </Link>
          </div>
        </div>

        {/* Card 3: Account Security & Manage Settings */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">Account Security</h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">Manage your account security and sign-in details.</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-stone-300">
              <div>
                <span className="font-medium text-gray-500 dark:text-stone-400">Email: </span>
                <span className="font-semibold text-gray-900 dark:text-stone-100">{userData.user.email}</span>
              </div>
              {profile?.display_name && (
                <div>
                  <span className="font-medium text-gray-500 dark:text-stone-400">Name: </span>
                  <span className="text-gray-800 dark:text-stone-200">{profile.display_name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-xs dark:border-stone-800">
            <Link
              href="/account/settings"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Manage Settings →
            </Link>
            <span className="text-gray-300 dark:text-stone-700">•</span>
            {isActive ? (
              <Link
                href="/account/profile"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                Edit Profile →
              </Link>
            ) : (
              <Link
                href="/account/profile"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                View Profile →
              </Link>
            )}
            <span className="text-gray-300 dark:text-stone-700">•</span>
            <Link
              href="/account/security"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Security Settings →
            </Link>
            <span className="text-gray-300 dark:text-stone-700">•</span>
            <Link
              href="/account/privacy"
              className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <Lock className="h-3 w-3" aria-hidden="true" />
              Privacy Requests
            </Link>
          </div>
        </div>

        {/* Card 4: Help & Support */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                <LifeBuoy className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">
                  {isRestricted ? "Appeals & Inquiries" : "Help & Support"}
                </h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">
                  {isRestricted ? "Moderation appeals & safety" : "Customer assistance & safety"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-stone-300">
              {isRestricted
                ? "Submit a formal moderation appeal to the FairSwap review team."
                : "Get help with fraud reporting, listing queries, or platform safety."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-stone-800">
            <Link
              href="/account/support"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              {isRestricted ? "Submit Appeal" : "Support Tickets →"}
            </Link>
            <a
              href={HELP_CENTRE_URL}
              className="text-xs font-medium text-gray-600 hover:text-emerald-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              Help Centre ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
