import { redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { ProfileEditor } from "@/components/account/profile/ProfileEditor";
import { createClient } from "@/lib/supabase/server";
import { loadProfileEditorData } from "@/lib/profile/load";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

export const metadata = {
  title: "Complete your profile — FairSwap",
  description: "Add your PIN code and area to finish setting up your FairSwap profile.",
};

interface CompleteProfilePageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function CompleteProfilePage({ searchParams }: CompleteProfilePageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params?.next) ? params.next[0] : params?.next;
  const next = sanitizeRedirectPath(rawNext, "/account");
  // Never bounce back into this page: that would loop for incomplete users.
  const safeNext = next.startsWith("/account/complete-profile") ? "/account" : next;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    const target = `/account/complete-profile${safeNext !== "/account" ? `?next=${encodeURIComponent(safeNext)}` : ""}`;
    redirect(`/auth/sign-in?next=${encodeURIComponent(target)}`);
  }

  const { accountStatus, privateDetails, values } = await loadProfileEditorData(supabase, userData.user);

  // Restricted accounts cannot edit; completed users have nothing to do here.
  if (accountStatus !== "active" || privateDetails?.onboarding_completed) {
    redirect(safeNext);
  }

  return (
    <AccountPageShell
      title="Complete your profile"
      width="lg"
      description="Add your PIN code and area to finish setting up. Your photo, full name and About You are optional."
    >
      <ProfileEditor mode="onboarding" values={values} next={safeNext} />
    </AccountPageShell>
  );
}
