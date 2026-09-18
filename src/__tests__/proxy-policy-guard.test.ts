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

  it("redirects authenticated stale pilot user accessing /admin to /account/policy-review with next parameter", async () => {
    mockGetClaims.mockResolvedValue({
      data: { claims: { sub: "pilot-admin-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: false, // Stale policy acceptance
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/admin/users?sort=created_at");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/account/policy-review");
    expect(location).toContain("next=%2Fadmin%2Fusers%3Fsort%3Dcreated_at");
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
