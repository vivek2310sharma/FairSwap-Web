"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentPolicyAcceptance } from "@/lib/compliance/policy-acceptance";

const ProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(50, "Display name cannot exceed 50 characters."),
  bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional().nullable(),
  city: z.string().max(100, "City cannot exceed 100 characters.").optional().nullable(),
  state: z.string().max(100, "State cannot exceed 100 characters.").optional().nullable(),
});

export type AccountActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  requiresPolicyReview?: boolean;
  redirectTo?: string;
};

export async function updateProfileAction(
  prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const supabase = await createClient();

  const guard = await requireCurrentPolicyAcceptance(supabase, "/account/profile");
  if (!guard.allowed) {
    return {
      error: guard.error,
      requiresPolicyReview: guard.requiresPolicyReview,
      redirectTo: guard.redirectTo,
    };
  }

  const parseResult = ProfileUpdateSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ? (formData.get("bio") as string).trim() : null,
    city: formData.get("city") ? (formData.get("city") as string).trim() : null,
    state: formData.get("state") ? (formData.get("state") as string).trim() : null,
  });

  if (!parseResult.success) {
    const errorMsg = parseResult.error.errors.map((e) => e.message).join(" ");
    return { error: errorMsg };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: "Authentication required to update profile." };
  }

  const { displayName, bio, city, state } = parseResult.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      city: city || null,
      state: state || null,
    })
    .eq("id", userData.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/account/settings");
  return { success: true, message: "Profile updated successfully." };
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
  revalidatePath("/account/settings");
  return {
    success: true,
    message:
      "Your privacy request has been recorded and will be processed according to platform policy. You can monitor the status in your request history.",
  };
}
