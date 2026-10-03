// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { signInAction, sendEmailOtpAction, forgotPasswordAction } from "@/app/auth/actions";
import { NEUTRAL_OTP_ACKNOWLEDGEMENT } from "@/lib/auth/constants";

// Mock Supabase server client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("authentication account-enumeration safeguards", () => {
  const authActions = fs
    .readFileSync(path.join(process.cwd(), "src/app/auth/actions.ts"), "utf8")
    .replace(/\\'/g, "'").replace(/\r\n/g, "\n");

  describe("Static contract checks", () => {
    it("keeps sign-in failures generic and non-enumerating", () => {
      expect(authActions).toContain(
        "We couldn't sign you in with those credentials. Check your email and password and try again."
      );
      expect(authActions).not.toContain("User does not exist");
      expect(authActions).not.toContain("User doesn't exist");
      expect(authActions).not.toContain("Email does not exist");
      expect(authActions).not.toContain("Email doesn't exist");
    });

    it("keeps password recovery responses non-enumerating", () => {
      expect(authActions).toContain(
        "If an account exists with this email, you will receive password reset instructions shortly."
      );
    });

    it("keeps OTP send responses neutral and non-enumerating via shared contract", () => {
      expect(NEUTRAL_OTP_ACKNOWLEDGEMENT).toBe(
        "If this email is associated with an eligible account, you'll receive a sign-in code shortly."
      );
      expect(authActions).toContain("NEUTRAL_OTP_ACKNOWLEDGEMENT");
    });
  });

  describe("Behavior-level runtime safeguards", () => {
    it("returns neutral acknowledgement when signInWithOtp encounters unknown user", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { code: "user_not_found", message: "User not found" },
      });

      const fd = new FormData();
      fd.append("email", "nonexistent@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res.success).toBe(true);
      expect(res.message).toBe(
        "If this email is associated with an eligible account, you'll receive a sign-in code shortly."
      );
      expect(res.error).toBeUndefined();
    });

    it("returns neutral acknowledgement when signInWithOtp encounters otp_disabled or signup_disabled", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { code: "otp_disabled", message: "Signups not allowed for OTP" },
      });

      const fd = new FormData();
      fd.append("email", "unknown-user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res.success).toBe(true);
      expect(res.message).toBe(
        "If this email is associated with an eligible account, you'll receive a sign-in code shortly."
      );
    });

    it("keeps rate-limiting error distinct from account-existence signals", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { status: 429, code: "over_email_send_rate_limit", message: "Rate limit exceeded" },
      });

      const fd = new FormData();
      fd.append("email", "rate-limited@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res.error).toBe("Too many requests. Please wait a moment before trying again.");
      expect(res.success).toBeUndefined();
    });

    it("keeps password sign-in failure generic when user does not exist or credentials invalid", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      });

      const fd = new FormData();
      fd.append("email", "nonexistent@example.com");
      fd.append("password", "wrongpassword123");

      const res = await signInAction(null, fd);
      expect(res).toEqual({
        error: "We couldn't sign you in with those credentials. Check your email and password and try again.",
        email: "nonexistent@example.com",
      });
    });

    it("keeps forgot password response neutral regardless of account existence", async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "anyone@example.com");

      const res = await forgotPasswordAction(null, fd);
      expect(res).toEqual({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions shortly.",
      });
    });
  });
});
