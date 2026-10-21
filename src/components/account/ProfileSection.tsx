import { type Profile, type AccountStatus } from "@/types/account";
import ProfileForm from "@/app/account/profile/profile-form";

interface ProfileSectionProps {
  profile: Profile | null;
  accountStatus?: AccountStatus | string;
}

export function ProfileSection({ profile, accountStatus = "active" }: ProfileSectionProps) {
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
        return "Profile edits are disabled for this account.";
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

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3 text-sm dark:border-stone-800 dark:bg-stone-900">
            <div>
              <span className="text-gray-500 dark:text-stone-400">Name: </span>
              <span className="font-semibold text-gray-900 dark:text-stone-100">{profile?.display_name || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-stone-400">Location: </span>
              <span className="text-gray-800 dark:text-stone-200">
                {profile?.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}` : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-stone-400">Bio: </span>
              <span className="text-gray-700 dark:text-stone-200">{profile?.bio || "No bio yet."}</span>
            </div>
          </div>
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </div>
  );
}
