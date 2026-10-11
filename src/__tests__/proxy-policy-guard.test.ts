import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const mockGetClaims = vi.fn();
const mockRpc = vi.fn();
const mockRefreshCookies = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    mockRefreshCookies(options);
    return {
      auth: {
        getClaims: mockGetClaims,
      },
      rpc: mockRpc,
    };
  }),
}));

describe("Proxy Policy Re-acceptance Route Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshCookies.mockReset();
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

  describe.each([false, true])("retired Admin with authenticated=%s", (authenticated) => {
    it.each(["/admin", "/admin/", "/admin/users", "/admin/users/123/?sort=created_at", "/admin/logo.png"])(
      "passes %s to the standard unmatched-route 404 before authentication",
      async (path) => {
        mockGetClaims.mockResolvedValue({
          data: { claims: authenticated ? { sub: "current-user-id" } : null },
        });
        const req = new NextRequest(`http://localhost:3000${path}`);
        const res = await proxy(req);

        expect(res.headers.get("x-middleware-next")).toBe("1");
        expect(res.headers.get("location")).toBeNull();
        expect(await res.text()).toBe("");
        expect(mockGetClaims).not.toHaveBeenCalled();
        expect(mockRpc).not.toHaveBeenCalled();
      }
    );
  });

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

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

describe("A0 safe account auth return and session regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshCookies.mockReset();
  });

  it.each([
    "macro=goods", "macro=vehicles", "macro=property", "macro=",
    "macro=goods&macro=goods", "macro=goods&macro=vehicles",
    "macro=Goods", "macro=unknown", "macro=goods&filter=a%26b",
  ])("preserves the original safe query %s through one next encoding", async (query) => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } });
    const res = await proxy(new NextRequest(`http://localhost:3000/account/listings/new?${query}`));
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("http://localhost:3000");
    expect(location.pathname).toBe("/auth/sign-in");
    expect(location.searchParams.get("next")).toBe(`/account/listings/new?${query}`);
    expect(location.searchParams.getAll("next")).toHaveLength(1);
    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(["macro=%5Cevil.example", "macro=bad%0Avalue", "macro=bad%0Dvalue", "macro=bad%00value"])(
    "drops unsafe return-query input %s using the existing sanitizer", async (query) => {
      mockGetClaims.mockResolvedValue({ data: { claims: null } });
      const res = await proxy(new NextRequest(`http://localhost:3000/account/listings/new?${query}`));
      expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/account/listings/new");
    }
  );

  it("retains repeated macro values through existing policy-review handling", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: "fixture-owner" } } });
    mockRpc.mockResolvedValue({ data: false, error: null });
    const res = await proxy(new NextRequest("http://localhost:3000/account/listings/new?macro=goods&macro=vehicles"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/account/policy-review");
    expect(location.searchParams.get("next")).toBe("/account/listings/new?macro=goods&macro=vehicles");
    expect(mockRpc).toHaveBeenCalledWith("has_current_policy_acceptance");
  });

  it("keeps current session cookie refresh/cache/correlation behavior", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: "fixture-owner" } } });
    mockRpc.mockResolvedValue({ data: true, error: null });
    mockRefreshCookies.mockImplementationOnce((options) => {
      options.cookies.setAll([{ name: "fixture-session", value: "refreshed", options: { path: "/" } }]);
    });
    const req = new NextRequest("http://localhost:3000/account/listings/new?macro=goods");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(req.cookies.get("fixture-session")?.value).toBe("refreshed");
    expect(res.cookies.get("fixture-session")?.value).toBe("refreshed");
    expect(res.headers.get("cache-control")).toBe("private, no-store, must-revalidate");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("keeps claim-retrieval failure unauthenticated without querying policy", async () => {
    mockGetClaims.mockRejectedValueOnce(new Error("Fixture auth error"));
    const res = await proxy(new NextRequest("http://localhost:3000/account/listings/new?macro=goods"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/account/listings/new?macro=goods");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("retains the owner unauthenticated route behavior", async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } });
    const res = await proxy(new NextRequest("http://localhost:3000/account/listings?sort=created_at"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/auth/sign-in");
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/account/listings?sort=created_at");
    expect(mockGetClaims).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("A0 proxy fallback pathname safety", () => {
  it.each(["/account/%5Cevil.example", "/account/%0D%0Aevil"])(
    "does not reuse an unsafe fallback pathname %s", async (pathname) => {
      mockRefreshCookies.mockReset();
      mockGetClaims.mockResolvedValue({ data: { claims: null } });
      const res = await proxy(new NextRequest(`http://localhost:3000${pathname}?macro=goods`));
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/auth/sign-in");
      expect(location.searchParams.get("next")).toBe("/account");
    }
  );
});
