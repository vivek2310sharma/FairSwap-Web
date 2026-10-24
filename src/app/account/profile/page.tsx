import { redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { createClient } from "@/lib/supabase/server";
import { type Profile, type UserAccount } from "@/types/account";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single<Profile>();

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isAccountUnavailable = Boolean(accountError || !account);
  const isSuspended = !isAccountUnavailable && account?.account_status === "suspended";
  const isDeletionPending = !isAccountUnavailable && account?.account_status === "deletion_pending";
  const isDeleted = !isAccountUnavailable && account?.account_status === "deleted";
  const isActive = !isAccountUnavailable && account?.account_status === "active";
  const canEdit = isActive && !isAccountUnavailable;

  return (
    <AccountPageShell
      title={canEdit ? "Edit Public Profile" : "Public Profile"}
      description={
        canEdit
          ? "This information is visible to other buyers and sellers on FairSwap."
          : "Review your saved profile information. Editing is currently unavailable."
      }
    >
      {!canEdit ? (
        <div className="space-y-6">
          <div
            role="alert"
            className={`rounded-lg border p-4 text-sm ${
              isAccountUnavailable || isDeletionPending
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {isDeletionPending
              ? "Your account deletion request is pending. Profile edits are disabled."
              : isDeleted
              ? "This account has been closed. Profile edits are disabled."
              : isSuspended
              ? "Your account is suspended. Profile edits are disabled."
              : "Account information is currently unavailable. Profile edits are disabled."}
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3 text-sm">
            <div>
              <span className="text-muted">Name: </span>
              <span className="font-semibold text-foreground">{profile?.display_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted">Location: </span>
              <span className="text-foreground">
                {profile?.city ? `${profile.city}, ${profile.state || ""}` : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-muted">Bio: </span>
              <span className="text-muted">{profile?.bio || "No bio yet."}</span>
            </div>
          </div>
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </AccountPageShell>
  );
}
