import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAccountOverview } from "@/lib/account/overview";
import { AccountOverview } from "@/components/account/AccountOverview";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account");
  }

  // The user id comes from the verified auth session, never from user-controlled metadata.
  const overview = await loadAccountOverview(supabase, {
    id: userData.user.id,
    email: userData.user.email,
  });

  return <AccountOverview overview={overview} />;
}
