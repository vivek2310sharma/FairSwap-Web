import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCookieGetUser = vi.fn();
const mockBearerGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockCookieGetUser,
    },
  })),
}));

vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      auth: {
        getUser: mockBearerGetUser,
      },
      from: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    })),
  };
});

import { authenticateRequest } from "@/lib/supabase/request-auth";

describe("Seller Media Request Authentication & Precedence Security Tests (#103)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No cookie session" } });
    mockBearerGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No bearer user" } });
  });

  describe("A. Cookie Authentication", () => {
    it("accepts valid cookie-authenticated session when no Authorization header is present", async () => {
      const mockUser = { id: "cookie-user-uuid", email: "user@example.com" };
      mockCookieGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media");
      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.authType).toBe("cookie");
        expect(result.context.user.id).toBe("cookie-user-uuid");
      }
    });

    it("returns UNAUTHENTICATED (401) when cookie session is missing or invalid", async () => {
      mockCookieGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid session" },
      });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media");
      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
    });
  });

  describe("B. Bearer Authentication", () => {
    it("accepts valid Bearer token and resolves user identity", async () => {
      const mockUser = { id: "bearer-user-uuid", email: "bearer@example.com" };
      mockBearerGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer valid_supabase_access_token_mock_12345",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.authType).toBe("bearer");
        expect(result.context.user.id).toBe("bearer-user-uuid");
      }
    });

    it("treats token as opaque and supports case-insensitive bearer scheme", async () => {
      const mockUser = { id: "bearer-user-uuid", email: "bearer@example.com" };
      mockBearerGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "bearer opaque_non_jwt_token_string",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.authType).toBe("bearer");
      }
    });

    it("rejects malformed Bearer header with 401 UNAUTHENTICATED", async () => {
      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
    });

    it("rejects empty Bearer token with 401 UNAUTHENTICATED", async () => {
      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer   ",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
    });

    it("rejects invalid Bearer token with 401 UNAUTHENTICATED", async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer invalid_token",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
    });

    it("rejects expired Bearer token with 401 UNAUTHENTICATED", async () => {
      mockBearerGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "JWT expired" },
      });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer expired_token",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
    });
  });

  describe("C. Strict Bearer Precedence & Non-Fallback", () => {
    it("fails closed when Authorization header is invalid, even if valid cookie exists", async () => {
      const cookieUser = { id: "cookie-user-id" };
      mockCookieGetUser.mockResolvedValue({ data: { user: cookieUser }, error: null });

      mockBearerGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Token is invalid" },
      });

      // Request carrying BOTH valid cookie environment AND invalid Authorization header
      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer bad_or_expired_token",
        },
      });

      const result = await authenticateRequest(req);

      // Must fail closed with 401 UNAUTHENTICATED; MUST NOT fall back to cookie!
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.error).toBe("UNAUTHENTICATED");
        expect(result.failure.status).toBe(401);
      }
      expect(mockCookieGetUser).not.toHaveBeenCalled();
    });

    it("resolves Bearer identity when both valid Bearer and unrelated cookie are present", async () => {
      const cookieUser = { id: "cookie-user-id" };
      const bearerUser = { id: "bearer-user-id" };

      mockCookieGetUser.mockResolvedValue({ data: { user: cookieUser }, error: null });
      mockBearerGetUser.mockResolvedValue({ data: { user: bearerUser }, error: null });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: "Bearer valid_bearer_token",
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.authType).toBe("bearer");
        expect(result.context.user.id).toBe("bearer-user-id");
      }
      expect(mockCookieGetUser).not.toHaveBeenCalled();
    });
  });

  describe("D. Token Confidentiality Safeguards", () => {
    it("never includes the raw token in error response or sanitized failure body", async () => {
      const secretTokenMarker = "sensitive_secret_token_123456789";

      mockBearerGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: `Verification failed for ${secretTokenMarker}` },
      });

      const req = new NextRequest("http://localhost:3000/api/listings/123/media", {
        headers: {
          Authorization: `Bearer ${secretTokenMarker}`,
        },
      });

      const result = await authenticateRequest(req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.failure.message).not.toContain(secretTokenMarker);
        expect(result.failure.error).toBe("UNAUTHENTICATED");
      }
    });
  });
});
