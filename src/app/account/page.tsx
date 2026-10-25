import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountOverview } from "@/components/account/AccountOverview";
import { type MyPrivateDetails, type Profile, type UserAccount } from "@/types/account";

function formatMemberSince(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

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

  // One owner-scoped read drives the completion banner. Legacy users keep full access;
  // a failed read never blocks the dashboard (no banner is shown).
  let privateDetails: MyPrivateDetails | null = null;
  try {
    const { data } = await supabase.rpc("get_my_private_details");
    privateDetails = (data as unknown as MyPrivateDetails | null) ?? null;
  } catch {
    privateDetails = null;
  }
  const isSuspended = !isAccountUnavailable && account?.account_status === "suspended";
  const isDeletionPending = !isAccountUnavailable && account?.account_status === "deletion_pending";
  const isDeleted = !isAccountUnavailable && account?.account_status === "deleted";
  const isActive = !isAccountUnavailable && account?.account_status === "active";
  const isRestricted = isSuspended || isDeletionPending || isDeleted || isAccountUnavailable;

  const notices = (
    <>
      {isAccountUnavailable && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <div className="font-bold text-amber-900 dark:text-amber-200">Account Information Unavailable</div>
          <p className="mt-1">
            Unable to verify account status right now. Profile editing and marketplace actions may be limited.
          </p>
        </div>
      )}

      {isSuspended && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="font-bold text-red-900 dark:text-red-200">Account Suspended</div>
          <p className="mt-1">
            Your account is currently suspended. Marketplace actions and profile updates are disabled.
            You retain access to your security overview, support appeals, and privacy rights.
          </p>
        </div>
      )}

      {isDeletionPending && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <div className="font-bold text-amber-900 dark:text-amber-200">Account Deletion Pending</div>
          <p className="mt-1">Your account deletion request is currently pending processing.</p>
        </div>
      )}

      {isDeleted && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="font-bold text-red-900 dark:text-red-200">Account Closed</div>
          <p className="mt-1">This account has been closed. Marketplace actions and profile updates are disabled.</p>
        </div>
      )}
    </>
  );

  // Pass only the display values the client overview needs.
  return (
    <AccountOverview
      displayName={profile?.display_name ?? null}
      email={userData.user.email ?? null}
      city={profile?.city?.trim() || null}
      memberSince={formatMemberSince(profile?.created_at)}
      avatarUrl={profile?.avatar_url ?? null}
      needsProfileCompletion={isActive && privateDetails !== null && !privateDetails.onboarding_completed}
      publicProfileHref={isActive ? `/seller/${userData.user.id}` : null}
      showVerification={isActive}
      isRestricted={isRestricted}
      notices={notices}
    />
  );
}
