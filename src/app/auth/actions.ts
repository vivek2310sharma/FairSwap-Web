"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sanitizeRedirectPath } from "@/lib/security/redirect";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";
import { NEUTRAL_OTP_ACKNOWLEDGEMENT } from "@/lib/auth/constants";

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
  email?: string;
  rateLimited?: boolean;
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

  const rawEmail =
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string).trim().toLowerCase()
      : undefined;

  if (!parseResult.success) {
    logger.warn("auth.signin_validation_failed", { operation: "signInAction" });
    return { error: "Please enter a valid email and password.", email: rawEmail };
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
    return {
      error: "We couldn't sign you in with those credentials. Check your email and password and try again.",
      email: email.trim().toLowerCase(),
    };
  }

  // Confirm identity from server
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    logger.warn("auth.signin_verification_failed", { operation: "signInAction" });
    return {
      error: "Could not verify user identity. Please try again.",
      email: email.trim().toLowerCase(),
    };
  }

  logger.info("auth.signin_success", {
    operation: "signInAction",
    actor_id: userData.user.id,
  });

  redirect(next);
}

const SendOtpSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
});

export async function sendEmailOtpAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parseResult = SendOtpSchema.safeParse({
    email: formData.get("email"),
  });

  const rawEmail =
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string).trim().toLowerCase()
      : undefined;

  if (!parseResult.success) {
    logger.warn("auth.send_otp_validation_failed", { operation: "sendEmailOtpAction" });
    return { error: "Please enter a valid email address.", email: rawEmail };
  }

  const { email } = parseResult.data;
  const emailKey = email.trim().toLowerCase();
  const rawNext = formData.get("next") as string | null;
  const next = sanitizeRedirectPath(rawNext, "/account");

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let res: Awaited<ReturnType<typeof supabase.auth.signInWithOtp>>;
  try {
    res = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/auth/callback?type=email&next=${encodeURIComponent(next)}`,
      },
    });
  } catch (thrown) {
    logger.error("auth.send_otp_exception", {
      operation: "sendEmailOtpAction",
      error: thrown instanceof Error ? thrown.message : String(thrown),
    });
    return {
      error: "Unable to send verification code at this time. Please try again later.",
      email: emailKey,
    };
  }

  // Strict SDK response envelope validation against pinned SDK contract
  if (!res || typeof res !== "object" || Array.isArray(res) || !("error" in res)) {
    logger.error("auth.send_otp_malformed_response", { operation: "sendEmailOtpAction" });
    return {
      error: "Unable to send verification code at this time. Please try again later.",
      email: emailKey,
    };
  }

  if (res.error !== null) {
    if (typeof res.error !== "object" || Array.isArray(res.error)) {
      logger.error("auth.send_otp_malformed_response", { operation: "sendEmailOtpAction" });
      return {
        error: "Unable to send verification code at this time. Please try again later.",
        email: emailKey,
      };
    }
  } else {
    // res.error === null -> must have valid data object matching pinned SDK contract:
    // AuthOtpResponse: { data: { user: null, session: null, messageId?: string | null }, error: null }
    if (!("data" in res) || typeof res.data !== "object" || res.data === null || Array.isArray(res.data)) {
      logger.error("auth.send_otp_malformed_response", { operation: "sendEmailOtpAction" });
      return {
        error: "Unable to send verification code at this time. Please try again later.",
        email: emailKey,
      };
    }

    const dataObj = res.data as Record<string, unknown>;
    // Reject empty object {} or missing expected OTP data fields
    if (!("user" in dataObj) || !("session" in dataObj) || dataObj.user !== null || dataObj.session !== null) {
      logger.error("auth.send_otp_malformed_response", { operation: "sendEmailOtpAction" });
      return {
        error: "Unable to send verification code at this time. Please try again later.",
        email: emailKey,
      };
    }
  }

  const error = res.error;

  if (error) {
    // 1. Distinguish rate limiting
    if (
      error.status === 429 ||
      error.code === "over_email_send_rate_limit" ||
      error.code === "over_request_rate_limit" ||
      error.code === "over_sms_send_rate_limit" ||
      error.code === "rate_limit_exceeded"
    ) {
      logger.warn("auth.send_otp_rate_limited", {
        operation: "sendEmailOtpAction",
        error_code: error.code || "RATE_LIMITED",
      });
      return {
        error: "Too many requests. Please wait a moment before trying again.",
        email: emailKey,
        rateLimited: true,
      };
    }

    // 2. Distinguish transport/service failures
    if (
      (typeof error.status === "number" && error.status >= 500) ||
      error.name === "AuthRetryableFetchError" ||
      error.code === "unexpected_failure" ||
      error.code === "request_timeout" ||
      error.code === "hook_timeout" ||
      error.code === "hook_timeout_after_retry"
    ) {
      logger.error("auth.send_otp_service_error", {
        operation: "sendEmailOtpAction",
        error_code: error.code || "SERVICE_ERROR",
      });
      return {
        error: "Unable to send verification code at this time. Please try again later.",
        email: emailKey,
      };
    }

    // 3. CAPTCHA verification failures
    if (error.code === "captcha_failed") {
      logger.warn("auth.send_otp_captcha_failed", {
        operation: "sendEmailOtpAction",
        error_code: error.code,
      });
      return {
        error: "Security verification failed. Please refresh and try again.",
        email: emailKey,
      };
    }

    // 4. Delivery or provider configuration restrictions
    if (
      error.code === "email_provider_disabled" ||
      error.code === "provider_disabled" ||
      error.code === "signup_disabled" ||
      error.code === "email_address_not_authorized" ||
      error.code === "email_address_invalid" ||
      error.code === "bad_json" ||
      error.code === "validation_failed"
    ) {
      logger.warn("auth.send_otp_config_restriction", {
        operation: "sendEmailOtpAction",
        error_code: error.code,
      });
      return {
        error: "Sign-in with email code is currently unavailable. Please sign in with your password or contact support.",
        email: emailKey,
      };
    }

    // 5. Account-sensitive provider responses where shouldCreateUser: false
    // Explicitly documented and justified account-sensitive error codes:
    // - 'user_not_found': No matching user identity with shouldCreateUser: false.
    // - 'otp_disabled': GoTrue returns otp_disabled when create_user: false is supplied for a non-existent
    //   or unlinked user identity (GoTrue server implementation detail for OTP signin).
    // - 'email_not_confirmed': User exists but email is not yet confirmed. Exposing this error would reveal account existence.
    // - 'user_banned': User account is banned/suspended. Revealing this discloses account existence and status.
    // - 'identity_not_found': Associated identity does not exist.
    if (
      error.code === "user_not_found" ||
      error.code === "otp_disabled" ||
      error.code === "email_not_confirmed" ||
      error.code === "user_banned" ||
      error.code === "identity_not_found"
    ) {
      logger.warn("auth.send_otp_account_sensitive", {
        operation: "sendEmailOtpAction",
        error_code: error.code,
      });
      return {
        success: true,
        message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
        email: emailKey,
      };
    }

    // 6. Unknown / unclassified provider error: must NOT automatically become success
    logger.error("auth.send_otp_unclassified_error", {
      operation: "sendEmailOtpAction",
      error_code: error.code || "UNKNOWN_ERROR",
    });
    return {
      error: "Unable to send verification code at this time. Please try again later.",
      email: emailKey,
    };
  }

  // Accepted request: legitimate send result data: { user: null, session: null }
  logger.info("auth.send_otp_success", { operation: "sendEmailOtpAction" });
  return {
    success: true,
    message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
    email: emailKey,
  };
}

const VerifyOtpSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  token: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit verification code."),
});

export async function verifyEmailOtpAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parseResult = VerifyOtpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token") || formData.get("otpCode"),
  });

  const rawEmail =
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string).trim().toLowerCase()
      : undefined;

  if (!parseResult.success) {
    logger.warn("auth.verify_otp_validation_failed", { operation: "verifyEmailOtpAction" });
    return {
      error: "Please enter a valid 6-digit verification code.",
      email: rawEmail,
    };
  }

  const { email, token } = parseResult.data;
  const emailKey = email.trim().toLowerCase();
  const rawNext = formData.get("next") as string | null;
  const next = sanitizeRedirectPath(rawNext, "/account");

  const supabase = await createClient();
  let res: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;

  try {
    res = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
  } catch (thrown) {
    logger.error("auth.verify_otp_exception", {
      operation: "verifyEmailOtpAction",
      error: thrown instanceof Error ? thrown.message : String(thrown),
    });
    return {
      error: "Unable to verify code at this time. Please try again later.",
      email: emailKey,
    };
  }

  // Strict SDK response envelope validation against pinned SDK contract
  if (!res || typeof res !== "object" || Array.isArray(res) || !("error" in res)) {
    logger.error("auth.verify_otp_malformed_response", { operation: "verifyEmailOtpAction" });
    return {
      error: "Unable to verify code at this time. Please try again later.",
      email: emailKey,
    };
  }

  if (res.error !== null) {
    if (res.error === undefined || typeof res.error !== "object" || Array.isArray(res.error)) {
      logger.error("auth.verify_otp_malformed_response", { operation: "verifyEmailOtpAction" });
      return {
        error: "Unable to verify code at this time. Please try again later.",
        email: emailKey,
      };
    }
  } else {
    // res.error === null -> must have valid data object with user and session properties
    if (!("data" in res) || typeof res.data !== "object" || res.data === null || Array.isArray(res.data)) {
      logger.error("auth.verify_otp_malformed_response", { operation: "verifyEmailOtpAction" });
      return {
        error: "Unable to verify code at this time. Please try again later.",
        email: emailKey,
      };
    }
    const dataObj = res.data as Record<string, unknown>;
    if (!("user" in dataObj) || !("session" in dataObj)) {
      logger.error("auth.verify_otp_malformed_response", { operation: "verifyEmailOtpAction" });
      return {
        error: "Unable to verify code at this time. Please try again later.",
        email: emailKey,
      };
    }
  }

  const { data, error } = res;

  if (error) {
    // 1. Rate-limit failures
    if (
      error.status === 429 ||
      error.code === "over_request_rate_limit" ||
      error.code === "over_email_send_rate_limit" ||
      error.code === "rate_limit_exceeded"
    ) {
      logger.warn("auth.verify_otp_rate_limited", {
        operation: "verifyEmailOtpAction",
        error_code: error.code || "RATE_LIMITED",
      });
      return {
        error: "Too many attempts. Please wait a moment before trying again.",
        email: emailKey,
      };
    }

    // 2. Transport and server errors
    if (
      (typeof error.status === "number" && error.status >= 500) ||
      error.name === "AuthRetryableFetchError" ||
      error.code === "unexpected_failure" ||
      error.code === "request_timeout"
    ) {
      logger.error("auth.verify_otp_service_error", {
        operation: "verifyEmailOtpAction",
        error_code: error.code || "SERVICE_ERROR",
      });
      return {
        error: "Unable to verify code at this time. Please try again later.",
        email: emailKey,
      };
    }

    // 3. Invalid or expired OTP token / credentials
    logger.warn("auth.verify_otp_invalid_code", {
      operation: "verifyEmailOtpAction",
      error_code: error.code || "INVALID_OTP",
    });
    return {
      error: "The verification code is invalid or has expired. Please check the code and try again.",
      email: emailKey,
    };
  }

  // 4. Verification succeeded: verify that user and session exist
  if (!data || !data.user || !data.session) {
    logger.warn("auth.verify_otp_missing_session", { operation: "verifyEmailOtpAction" });
    return {
      error: "The verification code is invalid or has expired. Please check the code and try again.",
      email: emailKey,
    };
  }

  // 5. Confirm identity from server session and ensure it matches the verified user and email
  let userData: { user: { id: string; email?: string } | null } | null = null;
  let userError: unknown = null;
  try {
    const userRes = await supabase.auth.getUser();
    userData = userRes.data;
    userError = userRes.error;
  } catch (thrown) {
    userError = thrown;
  }

  if (
    userError ||
    !userData?.user ||
    userData.user.id !== data.user.id ||
    (userData.user.email && userData.user.email.toLowerCase() !== emailKey)
  ) {
    logger.warn("auth.verify_otp_identity_mismatch", { operation: "verifyEmailOtpAction" });
    // Successful verifyOtp sets session cookies via the SSR cookie adapter.
    // If subsequent getUser confirmation fails or detects an identity mismatch,
    // clear local session cookies via local-scoped signOut to prevent a mismatched
    // cookie from remaining in the browser, without revoking sessions globally across other devices.
    try {
      const cleanupRes = await supabase.auth.signOut({ scope: "local" });
      if (cleanupRes?.error) {
        logger.warn("auth.verify_otp_cleanup_error", {
          operation: "verifyEmailOtpAction",
          error_code: cleanupRes.error.name || "SIGNOUT_ERROR",
        });
      }
    } catch (cleanupThrown) {
      logger.warn("auth.verify_otp_cleanup_exception", {
        operation: "verifyEmailOtpAction",
        error: cleanupThrown instanceof Error ? cleanupThrown.message : String(cleanupThrown),
      });
    }
    return {
      error: "Could not verify user identity. Please try again.",
      email: emailKey,
    };
  }

  logger.info("auth.verify_otp_success", {
    operation: "verifyEmailOtpAction",
    actor_id: userData.user.id,
  });

  // Keep redirect outside narrow SDK try/catch handling to allow Next.js NEXT_REDIRECT to propagate
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
