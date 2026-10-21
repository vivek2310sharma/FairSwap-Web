import { type Profile } from "@/types/account";
import ProfileForm from "@/app/account/profile/profile-form";

interface ProfileSectionProps {
  profile: Profile | null;
  isSuspended: boolean;
}

export function ProfileSection({ profile, isSuspended }: ProfileSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-stone-100">Public Profile</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">
          This information is visible to other buyers and sellers on FairSwap.
        </p>
      </div>

      {isSuspended ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          Your account is suspended. Profile edits are disabled.
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </div>
  );
}
