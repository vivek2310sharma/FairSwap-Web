import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Profile, type UserAccount } from "@/types/account";
import { ProfileSection } from "@/components/account/ProfileSection";
import { SecuritySection } from "@/components/account/SecuritySection";
import { PrivacyOverviewSection } from "@/components/account/PrivacyOverviewSection";

export const metadata = {
  title: "Account Settings — FairSwap",
  description: "Manage your public profile, security settings, and privacy preferences.",
};

export type SettingsTab = "profile" | "security" | "privacy";

export function parseTab(tabParam: string | string[] | undefined): SettingsTab {
  const rawTab = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  if (!rawTab) return "profile";
  const normalized = rawTab.toLowerCase().trim();
  if (normalized === "security") return "security";
  if (normalized === "privacy") return "privacy";
  return "profile";
}

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const activeTab = parseTab(resolvedSearchParams?.tab);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    const nextPath = `/account/settings${activeTab !== "profile" ? `?tab=${activeTab}` : ""}`;
    redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
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

  const accountStatus = account?.account_status || "active";
  const isSuspended = accountStatus === "suspended";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-stone-100">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">
            Manage your personal profile, security credentials, and privacy rights.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200 dark:border-stone-800">
        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none" aria-label="Settings tabs">
          <Link
            href="/account/settings?tab=profile"
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "profile"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            Public Profile
          </Link>

          <Link
            href="/account/settings?tab=security"
            aria-current={activeTab === "security" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "security"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            Account Security
          </Link>

          <Link
            href="/account/settings?tab=privacy"
            aria-current={activeTab === "privacy" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "privacy"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            Privacy & Data Rights
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "security" ? (
          <SecuritySection email={userData.user.email} account={account} isSuspended={isSuspended} />
        ) : activeTab === "privacy" ? (
          <PrivacyOverviewSection />
        ) : (
          <ProfileSection profile={profile} accountStatus={accountStatus} />
        )}
      </div>
    </div>
  );
}
