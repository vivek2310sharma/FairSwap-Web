import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
  })),
}));

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

  it("exchanges a valid OAuth code and redirects to the sanitized next path", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "user-google" } },
      error: null,
    });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?code=oauth_code_123&next=/account/profile"
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("oauth_code_123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account/profile"
    );
    expect(response.headers.get("x-request-id")).toBeDefined();
  });

  it("handles an OAuth code exchange failure without leaking provider details", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { code: "bad_code", message: "Sensitive upstream detail" },
    });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?code=bad_code&next=/account/messages"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?error=oauth_failed&next=%2Faccount%2Fmessages"
    );
  });

  it("handles OAuth provider cancellation with a generic sign-in error", async () => {
    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?error=access_denied&error_description=provider_detail&next=/account"
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?error=oauth_failed"
    );
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
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );
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
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/reset-password"
    );
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
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?error=invalid_token"
    );
  });

  it("handles missing TokenHash when unauthenticated with neutral continuation state", async () => {
    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?type=signup&next=/account"
    );

    const response = await GET(request);

    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/sign-in?message=confirm_continue"
    );
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
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account/profile"
    );
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

    const request1 = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash&type=signup&next=//evil.com"
    );
    const response1 = await GET(request1);
    expect(response1.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );

    const request2 = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?token_hash=valid_hash&type=signup&next=https://evil.com"
    );
    const response2 = await GET(request2);
    expect(response2.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );
  });

  it("rejects malicious open redirect in OAuth next parameter and falls back to /account", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "user-google" } },
      error: null,
    });

    const request = new NextRequest(
      "https://fair-swap-git-phase1-fairswap.vercel.app/auth/callback?code=oauth_code_123&next=//evil.com"
    );

    const response = await GET(request);
    expect(response.headers.get("location")).toBe(
      "https://fair-swap-git-phase1-fairswap.vercel.app/account"
    );
  });
});
