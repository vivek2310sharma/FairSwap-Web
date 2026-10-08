import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const mockGetClaims = vi.fn();
const mockRpc = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: mockGetClaims,
    },
    rpc: mockRpc,
  })),
}));

describe("Proxy Policy Re-acceptance Route Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user accessing /account to /auth/sign-in with next parameter", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null }, error: null });

    const req = new NextRequest("http://localhost:3000/account/profile");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/sign-in");
    expect(location).toContain("next=%2Faccount%2Fprofile");
  });

  it("redirects authenticated stale pilot user accessing /account to /account/policy-review with next parameter", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: false, // Stale policy acceptance
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/listings");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/account/policy-review");
    expect(location).toContain("next=%2Faccount%2Flistings");
  });

  it.each(["/admin", "/admin/users", "/admin/users/123?sort=created_at"])(
    "returns 404 for retired Web Admin path %s before authentication",
    async (path) => {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = await proxy(req);

      expect(res.status).toBe(404);
      expect(res.headers.get("location")).toBeNull();
      expect(await res.text()).toContain("404 - Page not found");
      expect(mockGetClaims).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    }
  );

  it("does not treat similarly prefixed public paths as the retired Admin", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null }, error: null });

    const req = new NextRequest("http://localhost:3000/administrator");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows authenticated current user accessing /account through without redirect", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "current-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: true, // Current policy acceptance
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/listings");
    const res = await proxy(req);

    // 200/next response (not redirected)
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows user to access /account/policy-review without being redirected away by proxy", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/policy-review?next=%2Faccount");
    const res = await proxy(req);

    // Proxy lets the policy review request reach the Server Component
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    // RPC is not even called by proxy on policy-review path
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does NOT redirect on public routes regardless of acceptance status", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });

    const publicPaths = [
      "http://localhost:3000/",
      "http://localhost:3000/listings/camera-123",
      "http://localhost:3000/terms",
      "http://localhost:3000/privacy",
      "http://localhost:3000/acceptable-use",
      "http://localhost:3000/safety",
      "http://localhost:3000/grievance",
    ];

    for (const url of publicPaths) {
      const req = new NextRequest(url);
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("allows stale authenticated user to reach /account/privacy without redirect", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/privacy");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("allows stale authenticated user to reach /account/support without redirect", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/support");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("allows stale authenticated user to reach /account/support/<ticket-id> without redirect", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/support/ticket-12345");
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("redirects stale authenticated user from /account/profile to /account/policy-review", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: false, // Stale policy acceptance
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/profile");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/account/policy-review");
    expect(location).toContain("next=%2Faccount%2Fprofile");
  });

  it("redirects stale authenticated user from /account/messages to /account/policy-review", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: false, // Stale policy acceptance
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/account/messages");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/account/policy-review");
    expect(location).toContain("next=%2Faccount%2Fmessages");
  });

  it("handles RPC check error safely without creating a redirect loop", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST_CONNECTION_ERROR", message: "Database unreachable" },
    });

    const req = new NextRequest("http://localhost:3000/account/listings");
    const res = await proxy(req);

    // Must NOT redirect to /account/policy-review when RPC check fails with an error
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
