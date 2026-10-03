// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyEmailOtpAction } from "@/app/auth/actions";

const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();
const mockRedirect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

// Note: This test verifies action-level behavior and redirect parameter passing in verifyEmailOtpAction.
// It is action-level contract coverage, not proof of downstream AAL2 enforcement (which is enforced
// by middleware/proxy route guards tested in their respective security suites).
describe("Staff OTP Sign-in Action-Level Verification & Redirect Contract (Issue #80 & #82)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates via OTP at action level and passes next target path to redirect", async () => {
    const staffUserId = "00000000-0000-0000-0000-000000000099";
    mockVerifyOtp.mockResolvedValueOnce({
      data: {
        user: { id: staffUserId, email: "admin@fairswap.local" },
        session: { access_token: "jwt_aal1", user: { id: staffUserId } },
      },
      error: null,
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: staffUserId, email: "admin@fairswap.local" } },
      error: null,
    });

    const fd = new FormData();
    fd.append("email", "admin@fairswap.local");
    fd.append("token", "654321");
    fd.append("next", "/admin");

    await verifyEmailOtpAction(null, fd);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: "admin@fairswap.local",
      token: "654321",
      type: "email",
    });
    // Redirects to next path; proxy will enforce AAL2 on /admin route
    expect(mockRedirect).toHaveBeenCalledWith("/admin");
  });

  it("rejects invalid, expired, and reused OTPs with generic message without exposing internal state", async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "otp_expired", message: "Token has expired or already used" },
    });

    const fd = new FormData();
    fd.append("email", "admin@fairswap.local");
    fd.append("token", "111222");

    const res = await verifyEmailOtpAction(null, fd);
    expect(res).toEqual({
      error: "The verification code is invalid or has expired. Please check the code and try again.",
      email: "admin@fairswap.local",
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("server-side validates token length and rejects malformed tokens before calling Supabase", async () => {
    const fd = new FormData();
    fd.append("email", "admin@fairswap.local");
    fd.append("token", "123"); // only 3 digits

    const res = await verifyEmailOtpAction(null, fd);
    expect(res).toEqual({
      error: "Please enter a valid 6-digit verification code.",
      email: "admin@fairswap.local",
    });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
