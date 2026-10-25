import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type UserAccount } from "@/types/account";
import { SecuritySection } from "@/components/account/SecuritySection";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { getAccountCopy } from "@/lib/account/copy";
import { resolveSettingsTab } from "@/lib/account/settings-tabs";

export const metadata = {
  title: "Account Settings — FairSwap",
  description: "Manage your account security and preferences.",
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const destination = resolveSettingsTab(resolvedSearchParams?.tab);

  if (destination.kind === "redirect") {
    redirect(destination.href);
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent("/account/settings")}`);
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";
  const copy = getAccountCopy();

  return (
    <AccountPageShell
      title="Account Settings"
      description="Manage your account security. Edit your profile on My Profile, and manage data requests on Privacy & your data."
      width="lg"
    >
      <div className="space-y-8">
        <SecuritySection email={userData.user.email} account={account} isSuspended={isSuspended} />

        <section aria-labelledby="notification-preferences" className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="notification-preferences" className="text-lg font-bold text-foreground">
              {copy.notificationPreferences.title}
            </h2>
            <span className="rounded-full bg-action-100 px-2 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100">
              {copy.comingSoon}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">{copy.notificationPreferences.body}</p>
        </section>
      </div>
    </AccountPageShell>
  );
}
