"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import {
  FullNameSchema,
  PrivateDetailsSchema,
  PublicProfileSchema,
  parseProfileTriggerError,
  profileErrorMessage,
} from "@/lib/profile/validation";

export type AccountActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
};

type RpcResult = { success?: boolean; error?: string; reason?: string } | null;

function describeRpcFailure(result: RpcResult, rpcError: { message?: string } | null): string {
  if (rpcError) {
    const trigger = parseProfileTriggerError(rpcError.message);
    return profileErrorMessage(trigger.code, trigger.reason);
  }
  return profileErrorMessage(result?.error, result?.reason);
}

/**
 * Single "Save Changes" handler for My Profile and profile completion.
 *
 * One RPC (`save_my_profile_details`) validates everything first and writes public and private
 * fields in one transaction, so a failure never leaves a half-saved profile. Without a PIN or
 * locality it is a public-only save, so legacy users can still edit their public fields.
 */
export async function saveProfileAction(
  prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const mode = formData.get("mode") === "onboarding" ? "onboarding" : "edit";
  const currentPath = mode === "onboarding" ? "/account/complete-profile" : "/account/profile";
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, currentPath);
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const publicParsed = PublicProfileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!publicParsed.success) {
    return { error: publicParsed.error.errors.map((e) => e.message).join(" ") };
  }

  const pin = String(formData.get("pinCode") ?? "").trim();
  const localityId = String(formData.get("localityId") ?? "").trim();
  const hasPersonalInput = Boolean(pin || localityId);

  const nameParsed = FullNameSchema.safeParse(formData.get("fullName") ?? "");
  if (!nameParsed.success) {
    return { error: nameParsed.error.errors[0]?.message || "Full name is not valid." };
  }
  const fullName = nameParsed.data;
  // The name the form was rendered with; the RPC acts only on auth.uid(), so this is just intent.
  const initialFullName = FullNameSchema.parse(formData.get("initialFullName") ?? "");
  const nameChanged = fullName !== initialFullName;

  let location: { pinCode: string; localityId: string; cityId?: string | null } | null = null;

  // PIN + locality are required for onboarding; in edit mode a legacy user may still save
  // public fields (and their private name) on their own, but a partial location is rejected.
  if (mode === "onboarding" || hasPersonalInput) {
    const privateParsed = PrivateDetailsSchema.safeParse({
      fullName,
      pinCode: pin,
      localityId: localityId || undefined,
      cityId: String(formData.get("cityId") ?? "").trim() || null,
      preferredLanguage: "en",
    });
    if (!privateParsed.success) {
      const issue = privateParsed.error.errors[0];
      const message =
        issue?.path[0] === "localityId" ? profileErrorMessage("LOCALITY_REQUIRED") : issue?.message;
      return { error: message || "Please check your personal information." };
    }
    location = privateParsed.data;
  }

  // Name intent: a non-empty changed name is set, an emptied saved name is cleared explicitly,
  // an untouched name is omitted so the server leaves it as it is. None of this needs a PIN.
  const nameArgs: { p_full_name?: string; p_clear_full_name?: boolean } = {};
  if (fullName && (nameChanged || mode === "onboarding")) nameArgs.p_full_name = fullName;
  else if (!fullName && initialFullName) nameArgs.p_clear_full_name = true;

  const { data, error } = await supabase.rpc("save_my_profile_details", {
    p_display_name: publicParsed.data.displayName,
    p_bio: publicParsed.data.bio,
    ...nameArgs,
    ...(location
      ? {
          p_pin_code: location.pinCode,
          p_locality_id: location.localityId,
          ...(location.cityId ? { p_city_id: location.cityId } : {}),
          p_preferred_language: "en",
        }
      : {}),
  });
  const result = data as RpcResult;
  if (error || !result?.success) {
    return { error: describeRpcFailure(result, error) };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");

  if (mode === "onboarding") {
    const next = sanitizeRedirectPath(String(formData.get("next") ?? ""), "/account");
    return { success: true, message: "Profile completed.", redirectTo: next };
  }
  return {
    success: true,
    message: hasPersonalInput || nameChanged
      ? "Profile updated successfully."
      : "Public information updated. Add your PIN code and area to finish setting up your profile.",
  };
}

const PrivacyRequestSchema = z.object({
  requestType: z.enum(["export_data", "delete_account"], {
    errorMap: () => ({ message: "Please select a valid privacy request type." }),
  }),
});

export async function submitPrivacyRequestAction(
  prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const parseResult = PrivacyRequestSchema.safeParse({
    requestType: formData.get("requestType"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.errors[0]?.message || "Invalid request." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Authentication required." };
  }

  const { requestType } = parseResult.data;

  // Insert into privacy_requests; database trigger enforces auth.uid() and advisory-locked rate limit
  const { error } = await supabase.from("privacy_requests").insert({
    request_type: requestType,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a pending privacy request of this type." };
    }
    return { error: error.message };
  }

  revalidatePath("/account/privacy");
  return {
    success: true,
    message:
      "Your privacy request has been recorded and will be processed according to platform policy. You can monitor the status in your request history.",
  };
}
