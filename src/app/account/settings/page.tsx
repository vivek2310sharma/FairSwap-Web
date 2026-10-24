import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Profile, type UserAccount } from "@/types/account";
import { ProfileSection } from "@/components/account/ProfileSection";
import { SecuritySection } from "@/components/account/SecuritySection";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { PrivacyOverviewSection } from "@/components/account/PrivacyOverviewSection";

export const metadata = {
  title: "Account Settings — FairSwap",
  description: "Manage your personal profile, security settings, and privacy preferences.",
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

  const accountStatus = account?.account_status;
  const isSuspended = accountStatus === "suspended";

  return (
    <AccountPageShell
      title="Account Settings"
      description="Manage your personal profile, security credentials, and privacy rights."
      width="lg"
    >
      {/* Settings Navigation Tabs */}
      <div className="mb-8 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none" aria-label="Settings tabs">
          <Link
            href="/account/settings?tab=profile"
            aria-current={activeTab === "profile" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "profile"
                ? "border-action-600 text-action-700 dark:border-action-400 dark:text-action-300"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            Public Profile
          </Link>

          <Link
            href="/account/settings?tab=security"
            aria-current={activeTab === "security" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "security"
                ? "border-action-600 text-action-700 dark:border-action-400 dark:text-action-300"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
            }`}
          >
            Account Security
          </Link>

          <Link
            href="/account/settings?tab=privacy"
            aria-current={activeTab === "privacy" ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors ${
              activeTab === "privacy"
                ? "border-action-600 text-action-700 dark:border-action-400 dark:text-action-300"
                : "border-transparent text-muted hover:border-border hover:text-foreground"
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
    </AccountPageShell>
  );
}
