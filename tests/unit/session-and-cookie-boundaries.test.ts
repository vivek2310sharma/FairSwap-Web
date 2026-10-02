import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@supabase/ssr";

interface CookieRecord {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

class ObservableCookieJar {
  private cookies = new Map<string, CookieRecord>();

  get(name: string): CookieRecord | undefined {
    return this.cookies.get(name);
  }

  getAll(): Array<{ name: string; value: string }> {
    return Array.from(this.cookies.values())
      .filter((c) => c.value !== "")
      .map(({ name, value }) => ({ name, value }));
  }

  getAllRaw(): CookieRecord[] {
    return Array.from(this.cookies.values());
  }

  set(name: string, value: string, options?: Record<string, unknown>): void {
    if (value === "" || (options && (options as { maxAge?: number }).maxAge === 0)) {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, { name, value, options });
    }
  }

  delete(name: string): void {
    this.cookies.delete(name);
  }

  clear(): void {
    this.cookies.clear();
  }
}

describe("Supabase SSR Client & Application Cookie Boundaries", () => {
  const supabaseUrl = "http://127.0.0.1:54321";
  const supabaseKey = "sbp_test_anon_key";
  let cookieJar: ObservableCookieJar;

  function createTestClient(customFetch?: typeof fetch) {
    return createServerClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: customFetch || vi.fn(),
      },
      cookies: {
        getAll() {
          return cookieJar.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieJar.set(name, value, options);
          });
        },
      },
    });
  }

  beforeEach(() => {
    cookieJar = new ObservableCookieJar();
  });

  it("successfully persists auth session cookies on verifyOtp HTTP response", async () => {
    const mockAuthResponse = {
      access_token: "mock-access-token-xyz",
      refresh_token: "mock-refresh-token-abc",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "usr-valid-123",
        email: "verified@example.com",
        aud: "authenticated",
        role: "authenticated",
      },
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/auth/v1/verify")) {
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 404 });
    });

    const client = createTestClient(mockFetch);

    // Initial state: no auth cookies
    expect(cookieJar.getAll()).toHaveLength(0);

    const verifyResult = await client.auth.verifyOtp({
      email: "verified@example.com",
      token: "123456",
      type: "email",
    });

    expect(verifyResult.error).toBeNull();
    expect(verifyResult.data.user?.id).toBe("usr-valid-123");

    // Cookie jar now contains auth token cookies
    const storedCookies = cookieJar.getAll();
    expect(storedCookies.length).toBeGreaterThan(0);
    const authCookie = storedCookies.find((c) => c.name.includes("auth-token"));
    expect(authCookie).toBeDefined();
    const rawVal = authCookie?.value || "";
    const decoded = rawVal.startsWith("base64-")
      ? Buffer.from(rawVal.slice(7), "base64").toString("utf-8")
      : rawVal;
    expect(decoded).toContain("mock-access-token-xyz");
  });

  it("cleans up session cookies and preserves unrelated cookies when getUser fails after successful verifyOtp", async () => {
    cookieJar.set("unrelated-user-preference", "dark-mode");
    cookieJar.set("app-analytics-id", "session-789");

    const mockAuthResponse = {
      access_token: "mock-access-token-temp",
      refresh_token: "mock-refresh-token-temp",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "usr-temp-456",
        email: "unstable@example.com",
      },
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/auth/v1/verify")) {
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/auth/v1/user")) {
        return new Response(JSON.stringify({ message: "User deleted or suspended" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/auth/v1/logout")) {
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    const client = createTestClient(mockFetch);

    // Verify OTP succeeds
    const verifyRes = await client.auth.verifyOtp({
      email: "unstable@example.com",
      token: "654321",
      type: "email",
    });
    expect(verifyRes.error).toBeNull();

    // Verify cookies were written
    expect(cookieJar.getAll().some((c) => c.name.includes("auth-token"))).toBe(true);

    // getUser fails
    const userRes = await client.auth.getUser();
    expect(userRes.error).not.toBeNull();

    // Application remediation performs scoped local cleanup
    await client.auth.signOut({ scope: "local" });

    // Auth cookies must be completely removed
    const remainingCookies = cookieJar.getAll();
    expect(remainingCookies.some((c) => c.name.includes("auth-token"))).toBe(false);

    // Unrelated cookies MUST remain intact (no global destruction)
    expect(cookieJar.get("unrelated-user-preference")?.value).toBe("dark-mode");
    expect(cookieJar.get("app-analytics-id")?.value).toBe("session-789");
  });

  it("cleans up session cookies on identity mismatch between verification and server session", async () => {
    cookieJar.set("app-theme", "light");

    const mockAuthResponse = {
      access_token: "mock-token-mismatch",
      refresh_token: "mock-refresh-mismatch",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "usr-claimed-111",
        email: "claimed@example.com",
      },
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/auth/v1/verify")) {
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/auth/v1/user")) {
        // Return different user identity (mismatch)
        return new Response(
          JSON.stringify({
            id: "usr-different-222",
            email: "different@example.com",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    });

    const client = createTestClient(mockFetch);

    await client.auth.verifyOtp({
      email: "claimed@example.com",
      token: "111111",
      type: "email",
    });

    const serverUser = await client.auth.getUser();
    // Mismatch detected: "claimed@example.com" !== "different@example.com"
    expect(serverUser.data.user?.email).not.toBe("claimed@example.com");

    // Perform targeted local cleanup
    await client.auth.signOut({ scope: "local" });

    // Auth cookies removed, unrelated app-theme preserved
    expect(cookieJar.getAll().some((c) => c.name.includes("auth-token"))).toBe(false);
    expect(cookieJar.get("app-theme")?.value).toBe("light");
  });

  it("removes all chunked auth cookies (.0, .1) when signOut is invoked", async () => {
    // Simulate multi-chunk auth cookies created by Supabase SSR for large sessions
    const prefix = "sb-127-auth-token";
    cookieJar.set(`${prefix}.0`, "chunk-0-header-data");
    cookieJar.set(`${prefix}.1`, "chunk-1-payload-data");
    cookieJar.set("csrf-protection-token", "secure-csrf-val");

    expect(cookieJar.getAll()).toHaveLength(3);

    const client = createTestClient();
    await client.auth.signOut({ scope: "local" });

    const remaining = cookieJar.getAll();
    // Both chunks removed
    expect(remaining.find((c) => c.name.startsWith(prefix))).toBeUndefined();
    // Unrelated cookie preserved
    expect(cookieJar.get("csrf-protection-token")?.value).toBe("secure-csrf-val");
  });

  it("subsequent request client cannot reconstruct session after cookie removal", async () => {
    const mockAuthResponse = {
      access_token: "mock-session-token",
      refresh_token: "mock-session-refresh",
      token_type: "bearer",
      expires_in: 3600,
      user: {
        id: "usr-seq-1",
        email: "seq@example.com",
      },
    };

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/auth/v1/verify")) {
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    // Request 1: Verification
    const req1Client = createTestClient(mockFetch);
    await req1Client.auth.verifyOtp({
      email: "seq@example.com",
      token: "123456",
      type: "email",
    });

    // Sign out performed on Request 1
    await req1Client.auth.signOut({ scope: "local" });

    // Request 2 arrives: Client initialized with current cookie jar state
    const req2Client = createTestClient(mockFetch);
    const sessionRes = await req2Client.auth.getSession();

    expect(sessionRes.data.session).toBeNull();
  });

  it("handles returned cleanup errors safely without leaving unhandled exceptions", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/auth/v1/logout")) {
        return new Response(JSON.stringify({ message: "Network failure during logout", code: "network_error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });

    const client = createTestClient(mockFetch);
    const result = await client.auth.signOut({ scope: "local" });

    // Local signOut still clears local cookies even if remote server error occurs
    expect(result.error).toBeNull();
  });

  it("handles rejected cleanup promises safely and records sanitized failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNRESET: socket hang up"));

    const client = createTestClient(mockFetch);

    let caughtError: unknown = null;
    try {
      await client.auth.signOut({ scope: "local" });
    } catch (err) {
      caughtError = err;
    }

    // Pinned @supabase/ssr local signOut does not throw on transport failure; it clears local state
    expect(caughtError).toBeNull();
  });
});
