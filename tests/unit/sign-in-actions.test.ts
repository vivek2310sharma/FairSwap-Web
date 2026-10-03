// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signInAction,
  sendEmailOtpAction,
  verifyEmailOtpAction,
} from "@/app/auth/actions";
import { NEUTRAL_OTP_ACKNOWLEDGEMENT } from "@/lib/auth/constants";

const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

describe("Authentication Server Actions (Issue #80 & #82)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signInAction", () => {
    it("rejects empty or invalid email/password", async () => {
      const fd = new FormData();
      fd.append("email", "invalid-email");
      fd.append("password", "");

      const res = await signInAction(null, fd);
      expect(res).toEqual({
        error: "Please enter a valid email and password.",
        email: "invalid-email",
      });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("does not trim password preserving user whitespace", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("password", " leadingAndTrailingSpaces ");

      await signInAction(null, fd);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: " leadingAndTrailingSpaces ",
      });
      expect(mockRedirect).toHaveBeenCalledWith("/account");
    });

    it("returns scoped error on invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { code: "invalid_credentials", message: "Invalid credentials" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("password", "wrongpassword");

      const res = await signInAction(null, fd);
      expect(res).toEqual({
        error: "We couldn't sign you in with those credentials. Check your email and password and try again.",
        email: "user@example.com",
      });
    });

    it("returns scoped error if getUser fails after password sign-in", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "User session missing" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("password", "validpassword");

      const res = await signInAction(null, fd);
      expect(res).toEqual({
        error: "Could not verify user identity. Please try again.",
        email: "user@example.com",
      });
    });
  });

  describe("sendEmailOtpAction", () => {
    it("passes shouldCreateUser: false to signInWithOtp", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "seller@example.com");

      const res = await sendEmailOtpAction(null, fd);

      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "seller@example.com",
          options: expect.objectContaining({
            shouldCreateUser: false,
          }),
        })
      );
      expect(res).toEqual({
        success: true,
        message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
        email: "seller@example.com",
      });
    });

    it("accepts legitimate send acknowledgement with null user/session", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        success: true,
        message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
        email: "user@example.com",
      });
    });

    it("returns neutral acknowledgement on explicitly supported account-sensitive codes", async () => {
      const sensitiveCodes = [
        "user_not_found",
        "otp_disabled",
        "email_not_confirmed",
        "user_banned",
        "identity_not_found",
      ];

      for (const code of sensitiveCodes) {
        mockSignInWithOtp.mockResolvedValueOnce({
          error: { code, message: `Error: ${code}` },
        });

        const fd = new FormData();
        fd.append("email", "sensitive@example.com");

        const res = await sendEmailOtpAction(null, fd);
        expect(res).toEqual({
          success: true,
          message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
          email: "sensitive@example.com",
        });
      }
    });

    it("does not return success on CAPTCHA failure", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { code: "captcha_failed", message: "Captcha failed" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Security verification failed. Please refresh and try again.",
        email: "user@example.com",
      });
    });

    it("does not return success on delivery or provider configuration restrictions", async () => {
      const configErrorCodes = [
        "email_provider_disabled",
        "provider_disabled",
        "signup_disabled",
        "email_address_not_authorized",
        "email_address_invalid",
      ];

      for (const code of configErrorCodes) {
        mockSignInWithOtp.mockResolvedValueOnce({
          error: { code, message: "Disabled" },
        });

        const fd = new FormData();
        fd.append("email", "user@example.com");

        const res = await sendEmailOtpAction(null, fd);
        expect(res).toEqual({
          error:
            "Sign-in with email code is currently unavailable. Please sign in with your password or contact support.",
          email: "user@example.com",
        });
      }
    });

    it("does not return success on unknown/unclassified provider errors", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { code: "unrecognized_custom_code", message: "Custom internal message" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to send verification code at this time. Please try again later.",
        email: "user@example.com",
      });
    });

    it("returns distinct rate limit error on status 429 and rate limit codes", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { status: 429, code: "over_email_send_rate_limit" },
      });

      const fd = new FormData();
      fd.append("email", "spam@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Too many requests. Please wait a moment before trying again.",
        email: "spam@example.com",
        rateLimited: true,
      });
    });

    it("returns distinct service error on 5xx status or service timeout", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { status: 503, code: "service_unavailable" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to send verification code at this time. Please try again later.",
        email: "user@example.com",
      });
    });

    it("handles thrown SDK exceptions without crashing and returns safe error", async () => {
      mockSignInWithOtp.mockRejectedValueOnce(new Error("Network connection dropped"));

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to send verification code at this time. Please try again later.",
        email: "user@example.com",
      });
    });

    it("never produces success on null or undefined SDK responses", async () => {
      mockSignInWithOtp.mockResolvedValueOnce(null as unknown as { error: null });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to send verification code at this time. Please try again later.",
        email: "user@example.com",
      });
    });

    it("rejects malformed envelopes during OTP send: empty object, arrays, primitives, and missing fields", async () => {
      const malformedCases = [
        null,
        undefined,
        {},
        [],
        "primitive-string",
        999,
        { data: null, error: null },
        { data: [], error: null },
        { data: {} },
        { data: {}, error: null },
        { data: { user: null } },
        { data: { user: null }, error: null },
        { data: { session: null } },
        { data: { session: null }, error: null },
        { data: { user: null, session: null } }, // missing error field
        { data: { user: null, session: null }, error: undefined },
        { error: "non-object-error" },
        { error: [] },
      ];

      for (const badResponse of malformedCases) {
        mockSignInWithOtp.mockResolvedValueOnce(badResponse as unknown as { error: null });

        const fd = new FormData();
        fd.append("email", "user@example.com");

        const res = await sendEmailOtpAction(null, fd);
        expect(res).toEqual({
          error: "Unable to send verification code at this time. Please try again later.",
          email: "user@example.com",
        });
      }
    });

    it("accepts valid canonical GoTrue AuthOtpResponse and optional messageId", async () => {
      // 1. Canonical response
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const fd1 = new FormData();
      fd1.append("email", "user1@example.com");

      const res1 = await sendEmailOtpAction(null, fd1);
      expect(res1).toEqual({
        success: true,
        message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
        email: "user1@example.com",
      });

      // 2. Canonical response with optional messageId
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null, messageId: "msg_abc123" },
        error: null,
      });

      const fd2 = new FormData();
      fd2.append("email", "user2@example.com");

      const res2 = await sendEmailOtpAction(null, fd2);
      expect(res2).toEqual({
        success: true,
        message: NEUTRAL_OTP_ACKNOWLEDGEMENT,
        email: "user2@example.com",
      });
    });

    it("returns structured rateLimited: true on provider rate limiting", async () => {
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { status: 429, code: "over_email_send_rate_limit", message: "Rate limit exceeded" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");

      const res = await sendEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Too many requests. Please wait a moment before trying again.",
        email: "user@example.com",
        rateLimited: true,
      });
    });
  });

  describe("verifyEmailOtpAction", () => {
    it("rejects token with less than 6 digits", async () => {
      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "12345");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Please enter a valid 6-digit verification code.",
        email: "user@example.com",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("rejects token with more than 6 digits", async () => {
      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "1234567");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Please enter a valid 6-digit verification code.",
        email: "user@example.com",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("rejects non-numeric characters in token", async () => {
      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "12345a");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Please enter a valid 6-digit verification code.",
        email: "user@example.com",
      });
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("accepts valid 6-digit token with leading zeroes and verifies type: 'email'", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "user-otp-1", email: "user@example.com" },
          session: { access_token: "tok-1" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-otp-1", email: "user@example.com" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "012345");
      fd.append("next", "/account/listings");

      await verifyEmailOtpAction(null, fd);

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "user@example.com",
        token: "012345",
        type: "email",
      });
      expect(mockRedirect).toHaveBeenCalledWith("/account/listings");
    });

    it("returns generic error on invalid or expired code", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { code: "otp_expired", message: "Token has expired" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "999999");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "The verification code is invalid or has expired. Please check the code and try again.",
        email: "user@example.com",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("distinguishes rate limit errors during verification", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { status: 429, code: "over_request_rate_limit" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Too many attempts. Please wait a moment before trying again.",
        email: "user@example.com",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("distinguishes service/transport failures during verification", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { status: 500, code: "unexpected_failure" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to verify code at this time. Please try again later.",
        email: "user@example.com",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("handles thrown SDK exceptions during verification", async () => {
      mockVerifyOtp.mockRejectedValueOnce(new Error("Timeout during token verification"));

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Unable to verify code at this time. Please try again later.",
        email: "user@example.com",
      });
    });

    it("rejects verification if user or session is missing in response", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "The verification code is invalid or has expired. Please check the code and try again.",
        email: "user@example.com",
      });
    });

    it("rejects verification if server identity does not match verified user id", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "user-otp-1", email: "user@example.com" },
          session: { access_token: "tok-1" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "DIFFERENT-USER-ID", email: "user@example.com" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Could not verify user identity. Please try again.",
        email: "user@example.com",
      });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("rejects verification if server identity email does not match submitted email", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "user-otp-1", email: "attacker@example.com" },
          session: { access_token: "tok-1" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-otp-1", email: "attacker@example.com" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "victim@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Could not verify user identity. Please try again.",
        email: "victim@example.com",
      });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("rejects malformed envelopes during OTP verification: null, undefined, {}, [], and missing fields", async () => {
      const malformedCases = [
        null,
        undefined,
        {},
        [],
        "primitive-string",
        42,
        { data: null, error: null },
        { data: [], error: null },
        { data: {} },
        { data: { user: { id: "u" } } }, // missing error field
        { data: { user: { id: "u" } }, error: undefined },
        { data: { user: { id: "u" }, session: { access_token: "t" } }, error: undefined },
        { error: "non-object-error" },
        { error: [] },
      ];

      for (const badResponse of malformedCases) {
        mockVerifyOtp.mockResolvedValueOnce(badResponse as unknown as { error: null });

        const fd = new FormData();
        fd.append("email", "user@example.com");
        fd.append("token", "123456");

        const res = await verifyEmailOtpAction(null, fd);
        expect(res).toEqual({
          error: "Unable to verify code at this time. Please try again later.",
          email: "user@example.com",
        });
      }
    });

    it("invokes local signOut when verifyOtp succeeds but getUser fails", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "user-otp-1", email: "user@example.com" },
          session: { access_token: "tok-1" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Failed to fetch user" },
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Could not verify user identity. Please try again.",
        email: "user@example.com",
      });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("invokes local signOut when verifyOtp succeeds but user ID mismatches", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "verified-id-1", email: "user@example.com" },
          session: { access_token: "tok-1" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "DIFFERENT-ID-2", email: "user@example.com" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");

      const res = await verifyEmailOtpAction(null, fd);
      expect(res).toEqual({
        error: "Could not verify user identity. Please try again.",
        email: "user@example.com",
      });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("completes successfully without signOut when identity matches intended recipient", async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: "valid-user-99", email: "user@example.com" },
          session: { access_token: "tok-verified" },
        },
        error: null,
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "valid-user-99", email: "user@example.com" } },
        error: null,
      });

      const fd = new FormData();
      fd.append("email", "user@example.com");
      fd.append("token", "123456");
      fd.append("next", "/account/settings");

      await verifyEmailOtpAction(null, fd);

      expect(mockSignOut).not.toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/account/settings");
    });
  });
});
