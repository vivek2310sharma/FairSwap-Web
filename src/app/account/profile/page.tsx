import { redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { ProfileEditor } from "@/components/account/profile/ProfileEditor";
import { createClient } from "@/lib/supabase/server";
import { loadProfileEditorData } from "@/lib/profile/load";

export const metadata = {
  title: "My Profile — FairSwap",
  description: "Manage your public profile and personal information.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/profile");
  }

  const { profile, accountStatus, isAccountUnavailable, privateDetails, values } = await loadProfileEditorData(
    supabase,
    userData.user
  );

  const isSuspended = accountStatus === "suspended";
  const isDeletionPending = accountStatus === "deletion_pending";
  const isDeleted = accountStatus === "deleted";
  const canEdit = accountStatus === "active" && !isAccountUnavailable;

  return (
    <AccountPageShell
      title="My Profile"
      width="lg"
      description={
        canEdit
          ? "Choose what other members see, and keep your private details up to date."
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
          <div className="space-y-3 rounded-xl border border-border bg-card p-6 text-sm shadow-sm">
            <div>
              <span className="text-muted">Name: </span>
              <span className="font-semibold text-foreground">{profile?.display_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted">Location: </span>
              <span className="text-foreground">{values.publicLocation ?? "Not set"}</span>
            </div>
            <div>
              <span className="text-muted">Bio: </span>
              <span className="text-muted">{profile?.bio || "No bio yet."}</span>
            </div>
            {privateDetails?.exists && (
              <div>
                <span className="text-muted">Private details (only you can see these): </span>
                <span className="text-foreground">
                  {[privateDetails.full_name, privateDetails.pin_code].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ProfileEditor mode="edit" values={values} />
      )}
    </AccountPageShell>
  );
}
