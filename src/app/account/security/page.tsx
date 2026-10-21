import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type UserAccount } from "@/types/account";
import { SecuritySection } from "@/components/account/SecuritySection";

export default async function SecurityPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/security");
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .single<UserAccount>();

  const isSuspended = account?.account_status === "suspended";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100">Security & Credentials</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-stone-400">Review your account status and credentials.</p>
        </div>
        <Link href="/account/settings?tab=security" className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          &larr; Settings
        </Link>
      </div>

      <SecuritySection email={userData.user.email} account={account} isSuspended={isSuspended} />
    </div>
  );
}
