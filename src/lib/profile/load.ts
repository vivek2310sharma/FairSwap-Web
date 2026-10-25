import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileEditorValues } from "@/components/account/profile/ProfileEditor";
import type { MyPrivateDetails, Profile, UserAccount } from "@/types/account";

export function formatMemberSince(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

export interface ProfileEditorData {
  profile: Profile | null;
  accountStatus: UserAccount["account_status"] | null;
  isAccountUnavailable: boolean;
  privateDetails: MyPrivateDetails | null;
  values: ProfileEditorValues;
}

/** Owner-scoped reads for My Profile / Complete profile. Private details come from the owner-only RPC. */
export async function loadProfileEditorData(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<ProfileEditorData> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", user.id)
    .single<UserAccount>();

  let privateDetails: MyPrivateDetails | null = null;
  try {
    const { data } = await supabase.rpc("get_my_private_details");
    privateDetails = (data as unknown as MyPrivateDetails | null) ?? null;
  } catch {
    privateDetails = null;
  }

  const publicLocation =
    privateDetails?.exists && privateDetails.locality
      ? [privateDetails.locality, privateDetails.district].filter(Boolean).join(", ")
      : null;

  return {
    profile: profile ?? null,
    accountStatus: account?.account_status ?? null,
    isAccountUnavailable: Boolean(accountError || !account),
    privateDetails,
    values: {
      displayName: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      email: user.email ?? null,
      memberSince: formatMemberSince(profile?.created_at),
      publicLocation,
      fullName: privateDetails?.full_name ?? "",
      pinCode: privateDetails?.pin_code ?? "",
      localityId: privateDetails?.locality_id ?? "",
      cityId: privateDetails?.city_id ?? "",
    },
  };
}
