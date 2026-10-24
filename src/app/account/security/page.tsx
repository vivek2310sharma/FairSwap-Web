import { AccountPageShell } from "@/components/account/AccountPageShell";
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
    <AccountPageShell title="Security & Credentials" description="Review your account status and credentials.">
      <SecuritySection email={userData.user.email} account={account} isSuspended={isSuspended} />
    </AccountPageShell>
  );
}
