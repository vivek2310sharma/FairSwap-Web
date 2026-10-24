import { type Profile, type AccountStatus } from "@/types/account";
import ProfileForm from "@/app/account/profile/profile-form";

interface ProfileSectionProps {
  profile: Profile | null;
  accountStatus?: AccountStatus | string | null;
}

export function ProfileSection({ profile, accountStatus }: ProfileSectionProps) {
  const isActive = accountStatus === "active";

  const getAlertMessage = () => {
    switch (accountStatus) {
      case "suspended":
        return "Your account is suspended. Profile edits are disabled.";
      case "deletion_pending":
        return "Your account deletion request is pending. Profile edits are disabled.";
      case "deleted":
        return "This account has been closed. Profile edits are disabled.";
      default:
        return "Account status unavailable. Profile edits are temporarily disabled.";
    }
  };

  return (
    <div className="space-y-6">
      {!isActive ? (
        <div className="space-y-6">
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
          >
            {getAlertMessage()}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3 text-sm">
            <div>
              <span className="text-muted">Name: </span>
              <span className="font-semibold text-foreground">{profile?.display_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted">Location: </span>
              <span className="text-foreground">
                {profile?.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : "Not set"}
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
    </div>
  );
}
