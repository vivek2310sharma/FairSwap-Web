import { redirect } from "next/navigation";
import Link from "next/link";
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

  const { data: account } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Public Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            This information is visible to other buyers and sellers on FairSwap.
          </p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500">
          &larr; Back to Account
        </Link>
      </div>

      {isSuspended ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          Your account is suspended. Profile edits are disabled.
        </div>
      ) : (
        <ProfileForm profile={profile} />
      )}
    </div>
  );
}
