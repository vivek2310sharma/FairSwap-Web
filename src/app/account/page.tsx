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

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

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

      {/* Account Suspended Notice */}
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
              Create, edit, pause, or submit listings for review across categories.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-emerald-200/60 pt-4 dark:border-emerald-900/40">
            <Link
              href="/account/listings"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              View My Listings &rarr;
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
              View Inbox &rarr;
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

        {/* Card 3: Account Settings */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">Account Settings</h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">Profile, credentials & privacy</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-stone-300">
              <div>
                <span className="font-medium text-gray-500 dark:text-stone-400">Name: </span>
                <span className="font-semibold text-gray-900 dark:text-stone-100">{profile?.display_name || "—"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-stone-400">Email: </span>
                <span className="text-gray-800 dark:text-stone-200">{userData.user.email}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-xs dark:border-stone-800">
            <Link
              href="/account/settings"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              Manage Settings &rarr;
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-stone-100">Help & Support</h2>
                <p className="text-xs text-gray-600 dark:text-stone-400">
                  {isSuspended ? "Appeals & Inquiries" : "Customer assistance & safety"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-stone-300">
              {isSuspended
                ? "Submit a formal moderation appeal to the FairSwap review team."
                : "Get help with fraud reporting, listing queries, or platform safety."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-stone-800">
            <Link
              href="/account/support"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              {isSuspended ? "Submit Appeal &rarr;" : "Support Tickets &rarr;"}
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
