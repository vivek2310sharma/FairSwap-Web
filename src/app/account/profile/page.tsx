import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Profile, type UserAccount } from "@/types/account";
import { ProfileSection } from "@/components/account/ProfileSection";

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

  const { data: account } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100">Edit Public Profile</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">
            This information is visible to other buyers and sellers on FairSwap.
          </p>
        </div>
        <Link href="/account/settings?tab=profile" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          &larr; Settings
        </Link>
      </div>

      <ProfileSection profile={profile} isSuspended={isSuspended} />
    </div>
  );
}
