import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase server client
const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      getUser: mockGetUser,
    },
  })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { GET } from "@/app/auth/callback/route";

describe("Auth Callback Route Handler (GET /auth/callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("handles valid signup TokenHash and redirects to /account", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash_123&type=signup&next=/account"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "valid_hash_123",
    });
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("https://fair-swap-git-phase1-fairswap.vercel.app/account");
    expect(response.headers.get("x-request-id")).toBeDefined();
  });

  it("handles valid recovery TokenHash and redirects to password reset", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash_456&type=recovery&next=/auth/reset-password"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "valid_hash_456",
    });
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("https://fair-swap-git-phase1-fairswap.vercel.app/auth/reset-password");
  });

  it("handles invalid supplied TokenHash and redirects to sign-in with invalid_token error", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: null,
      error: { code: "otp_expired", message: "Token has expired" },
    });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=bad_hash&type=signup&next=/account"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "bad_hash",
    });
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?error=invalid_token");
  });

  it("handles missing TokenHash when unauthenticated with neutral continuation state (no false invalid_token or unverified confirmation)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?type=signup&next=/account"
    );

    const response = await GET(request);

    // Should NOT call verifyOtp without token_hash
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    // Must redirect to sign-in with neutral confirm_continue, NOT error=invalid_token and NOT claiming confirmation succeeded
    expect(location).toBe("https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?message=confirm_continue");
  });

  it("handles missing TokenHash when user is already authenticated and redirects directly to next", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "existing-user-789" } },
      error: null,
    });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?type=signup&next=/account/profile"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("https://fair-swap-git-phase1-fairswap.vercel.app/account/profile");
  });

  it("validates safe relative next redirect parameter", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash&type=signup&next=/account/notifications"
    );

    const response = await GET(request);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account/notifications"
    );
  });

  it("rejects malicious open redirect in next parameter and falls back to /account", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });

    // Open redirect attempt with protocol-relative URL
    const request1 = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash&type=signup&next=//evil.com"
    );
    const response1 = await GET(request1);
    expect(response1.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );

    // Open redirect attempt with absolute URL scheme
    const request2 = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash&type=signup&next=https://evil.com"
    );
    const response2 = await GET(request2);
    expect(response2.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );
  });
});
