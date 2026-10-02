"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

const SignUpSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(50, "Display name cannot exceed 50 characters."),
  termsAccepted: z.literal("on", {
    errorMap: () => ({ message: "You must accept the Terms of Service and Acceptable Use Policy, and acknowledge the Privacy Policy." }),
  }),
  ageConfirmed: z.literal("on", {
    errorMap: () => ({ message: "You must confirm that you are at least 18 years old to create an account." }),
  }),
});

export type AuthActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function signUpAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parseResult = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
    termsAccepted: formData.get("termsAccepted"),
    ageConfirmed: formData.get("ageConfirmed"),
  });

  if (!parseResult.success) {
    logger.warn("auth.signup_validation_failed", { operation: "signUpAction" });
    const errorMsg = parseResult.error.errors.map((e) => e.message).join(" ");
    return { error: errorMsg };
  }

  const { email, password, displayName } = parseResult.data;
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        terms_accepted: "true",
        terms_version: LEGAL_POLICY.termsVersion,
        privacy_policy_version: LEGAL_POLICY.privacyVersion,
        acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
        age_confirmed: "true",
        minimum_age_confirmed: LEGAL_POLICY.minimumAge,
      },
      emailRedirectTo: `${siteUrl}/auth/callback?type=signup&next=/account`,
    },
  });

  if (error) {
    logger.warn("auth.signup_failed", {
      operation: "signUpAction",
      error_code: error.code || "SIGNUP_FAILED",
    });
    return { error: error.message };
  }

  logger.info("auth.signup_success", { operation: "signUpAction" });
  redirect("/auth/confirm?email=" + encodeURIComponent(email));
}

const SignInSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export async function signInAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parseResult = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parseResult.success) {
    logger.warn("auth.signin_validation_failed", { operation: "signInAction" });
    return { error: "Please enter a valid email and password." };
  }

  const { email, password } = parseResult.data;
  const rawNext = formData.get("next") as string | null;
  const next = sanitizeRedirectPath(rawNext, "/account");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn("auth.signin_failed", {
      operation: "signInAction",
      error_code: "INVALID_CREDENTIALS",
    });
    return { error: "We couldn't sign you in with those credentials. Check your email and password and try again." };
  }

  // Confirm identity from server
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    logger.warn("auth.signin_verification_failed", { operation: "signInAction" });
    return { error: "Could not verify user identity. Please try again." };
  }

  logger.info("auth.signin_success", {
    operation: "signInAction",
    actor_id: userData.user.id,
  });

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  logger.info("auth.signout", { operation: "signOutAction" });
  redirect("/");
}

export async function forgotPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  if (!email || !email.includes("@")) {
    return { error: "Please provide a valid email address." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery&next=/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "If an account exists with this email, you will receive password reset instructions shortly.",
  };
}

export async function resetPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/sign-in?message=password_reset_success");
}
