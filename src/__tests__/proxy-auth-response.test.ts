import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { CookieMethodsServer, SetAllCookies } from "@supabase/ssr";
import { proxy } from "@/proxy";

const sdk = vi.hoisted(() => ({
  cookies: undefined as CookieMethodsServer | undefined,
  getClaims: vi.fn(),
  getUser: vi.fn(async () => ({ data: { user: { id: "fixture-owner" } }, error: null })),
  rpc: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options: { cookies: CookieMethodsServer }) => {
    sdk.cookies = options.cookies;
    return { auth: { getClaims: sdk.getClaims, getUser: sdk.getUser }, rpc: sdk.rpc };
  }),
}));

type CookieBatch = Parameters<SetAllCookies>[0];
const cacheHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};
const refreshCookies: CookieBatch = [
  {
    name: "fixture-auth.0", value: "inert-refreshed-chunk-zero",
    options: { path: "/", domain: "fixture.test", maxAge: 600, sameSite: "lax", secure: true, httpOnly: true, priority: "high" },
  },
  {
    name: "fixture-auth.1", value: "inert-refreshed-chunk-one",
    options: { path: "/", expires: new Date("2040-01-01T00:00:00Z"), sameSite: "none", secure: true, httpOnly: true, partitioned: true },
  },
  {
    name: "fixture-auth.2", value: "",
    options: { path: "/auth", domain: "fixture.test", expires: new Date(0), maxAge: 0, sameSite: "strict", secure: true, httpOnly: true },
  },
];

function simulateAuth(cookies = refreshCookies, authenticated = true, throws = false) {
  sdk.getClaims.mockImplementation(async () => {
    // Simulate SDK writes during the actual mocked auth call, not client creation.
    await sdk.cookies!.setAll!(cookies, cacheHeaders);
    if (throws) throw new Error("Inert fixture auth failure");
    return { data: { claims: authenticated ? { sub: "fixture-owner" } : null } };
  });
}

function makeRequest(path: string) {
  return new NextRequest(`https://fixture.test${path}`, {
    headers: {
      cookie: "fixture-auth.0=inert-old-chunk; untouched=inert-other-cookie",
      authorization: "Bearer inert-not-a-token",
      "x-request-id": "untrusted-inert-request-id",
      "x-fixture-private": "inert-private-request-header",
    },
  });
}

function serializedCookies(cookies: CookieBatch) {
  return cookies.flatMap(({ name, value, options }) => {
    const response = new NextResponse();
    response.cookies.set(name, value, options);
    return response.headers.getSetCookie();
  });
}

function expectMutations(response: NextResponse, cookies = refreshCookies) {
  expect(response).toBeInstanceOf(NextResponse);
  expect(response.headers.getSetCookie()).toEqual(serializedCookies(cookies));
  for (const [key, value] of Object.entries(cacheHeaders)) expect(response.headers.get(key)).toBe(value);
  expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);
  expect(response.headers.get("x-request-id")).not.toBe("untrusted-inert-request-id");
  expect(response.headers.get("cookie")).toBeNull();
  expect(response.headers.get("authorization")).toBeNull();
  expect(response.headers.get("x-fixture-private")).toBeNull();
  if (response.status === 307) {
    expect(response.headers.get("x-middleware-next")).toBeNull();
    expect(response.headers.get("x-middleware-override-headers")).toBeNull();
    expect(response.headers.get("x-middleware-set-cookie")).toBeNull();
    expect([...response.headers.keys()].some((key) => key.startsWith("x-middleware-request-"))).toBe(false);
  }
}

describe("A0.1 real NextResponse auth propagation (isolated SDK)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T20:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in isolated auth-response test"); }));
    sdk.cookies = undefined;
    sdk.getClaims.mockResolvedValue({ data: { claims: { sub: "fixture-owner" } } });
    sdk.rpc.mockResolvedValue({ data: true, error: null });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it.each([
    ["/account/listings/new?macro=goods&macro=vehicles", true, 200, null],
    ["/account/listings/new?macro=goods&macro=vehicles", false, 307, "/account/policy-review"],
    ["/account/listings?sort=created_at", false, 307, "/account/policy-review"],
    ["/auth/sign-in?next=%2Faccount%2Flistings%2Fnew", true, 307, "/account"],
    ["/auth/sign-up", true, 307, "/account"],
  ] as const)("retains refresh cookies/cache for %s policy=%s", async (path, policy, status, destination) => {
    simulateAuth();
    sdk.rpc.mockResolvedValue({ data: policy, error: null });
    const response = await proxy(makeRequest(path));
    expect(response.status).toBe(status);
    expectMutations(response);
    if (destination) {
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe(destination);
      if (destination === "/account/policy-review") expect(location.searchParams.get("next")).toBe(path);
    } else expect(response.headers.get("location")).toBeNull();
    expect(sdk.getClaims).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["/account/listings/new?macro=goods&macro=goods", false],
    ["/account/listings/new?macro=goods&macro=vehicles", true],
    ["/account/listings?sort=created_at", false],
    ["/account/listings?sort=created_at", true],
  ] as const)("preserves clearing on %s auth-throws=%s", async (path, throws) => {
    const clearing = refreshCookies.map((cookie) => ({ ...cookie, value: "", options: { ...cookie.options, maxAge: 0, expires: new Date(0) } }));
    simulateAuth(clearing, false, throws);
    const response = await proxy(makeRequest(path));
    expect(response.status).toBe(307);
    expectMutations(response, clearing);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/sign-in");
    expect(location.searchParams.get("next")).toBe(path);
    expect(sdk.rpc).not.toHaveBeenCalled();
  });

  it("forwards refreshed Cookie in actual NextResponse request-header overrides", async () => {
    simulateAuth();
    const response = await proxy(makeRequest("/account/listings/new?macro=goods"));
    // Real NextResponse.next serializes downstream request overrides here.
    expect(response.headers.get("x-middleware-override-headers")?.split(",")).toContain("cookie");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("fixture-auth.0=inert-refreshed-chunk-zero");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("untouched=inert-other-cookie");
    expect(response.headers.get("x-middleware-request-cookie")).not.toContain("inert-old-chunk");
    expect(response.headers.get("x-middleware-request-x-request-id")).toBe(response.headers.get("x-request-id"));
  });

  it("retains all callback batches and first-write SDK cache headers", async () => {
    sdk.getClaims.mockImplementation(async () => {
      await sdk.cookies!.setAll!([refreshCookies[0]], cacheHeaders);
      await sdk.cookies!.setAll!(refreshCookies.slice(1), {});
      return { data: { claims: { sub: "fixture-owner" } } };
    });
    sdk.rpc.mockResolvedValue({ data: false, error: null });
    expectMutations(await proxy(makeRequest("/account/listings/new?macro=property")));
  });

  it("preserves same-name clearing mutations at host-only and domain scopes", async () => {
    const scopes: CookieBatch = [
      { name: "fixture-old", value: "", options: { path: "/", expires: new Date(0), maxAge: 0 } },
      { name: "fixture-old", value: "", options: { path: "/", domain: "fixture.test", expires: new Date(0), maxAge: 0 } },
    ];
    simulateAuth(scopes, false);
    expectMutations(await proxy(makeRequest("/account/listings/new")), scopes);
  });

  it.each([
    ["/account/listings/new?macro=goods", true, true, 200, null],
    ["/account/listings/new?macro=goods&macro=goods", true, false, 307, "/account/policy-review"],
    ["/account/profile", false, true, 307, "/auth/sign-in"],
    ["/auth/sign-in?next=%2Fsearch", true, true, 307, "/account"],
    ["/account/support/fixture-ticket", true, false, 200, null],
  ] as const)("does not fabricate cookies/cache without SDK writes for %s", async (path, auth, policy, status, destination) => {
    sdk.getClaims.mockResolvedValue({ data: { claims: auth ? { sub: "fixture-owner" } : null } });
    sdk.rpc.mockResolvedValue({ data: policy, error: null });
    const response = await proxy(makeRequest(path));
    expect(response.status).toBe(status);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("expires")).toBeNull();
    expect(response.headers.get("pragma")).toBeNull();
    if (destination) expect(new URL(response.headers.get("location")!).pathname).toBe(destination);
    else expect(response.headers.get("location")).toBeNull();
  });
});

describe("A0.1 cache header allowlist and empty callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T20:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden"); }));
    sdk.rpc.mockResolvedValue({ data: false, error: null });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("copies only documented SDK cache headers, not auth or routing controls", async () => {
    sdk.getClaims.mockImplementation(async () => {
      await sdk.cookies!.setAll!(refreshCookies, {
        ...cacheHeaders,
        Authorization: "inert-sdk-extra", Cookie: "inert-sdk-extra",
        Location: "https://unrelated.fixture.test/",
        "x-middleware-next": "inert-sdk-extra",
        "x-middleware-override-headers": "inert-sdk-extra",
        "x-middleware-request-cookie": "inert-sdk-extra",
        "x-request-id": "inert-sdk-extra",
      });
      return { data: { claims: { sub: "fixture-owner" } } };
    });
    const response = await proxy(makeRequest("/account/listings/new?macro=goods&macro=goods"));
    expectMutations(response);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/account/policy-review");
    expect(new URL(response.headers.get("location")!).searchParams.get("next"))
      .toBe("/account/listings/new?macro=goods&macro=goods");
  });

  it("does not fabricate cookie/cache changes for an empty SDK callback", async () => {
    sdk.getClaims.mockImplementation(async () => {
      await sdk.cookies!.setAll!([], {});
      return { data: { claims: { sub: "fixture-owner" } } };
    });
    const response = await proxy(makeRequest("/account/listings/new"));
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("expires")).toBeNull();
    expect(response.headers.get("pragma")).toBeNull();
  });
});
