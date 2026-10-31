/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAccount = vi.fn();
const mockStaff = vi.fn();
const mockAal = vi.fn();
const mockMediaEq = vi.fn();
const mockAuthUser = vi.fn();
const mockIsPublicVisible = vi.fn();
const mockGetListing = vi.fn();
const mockGetMedia = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/request-auth", () => ({
  authenticateRequest: vi.fn(async (req: NextRequest) => {
    const user = await mockAuthUser(req);
    if (!user) {
      return {
        success: false,
        failure: {
          error: "UNAUTHENTICATED",
          status: 401,
          message: "Authentication required.",
        },
      };
    }
    return {
      success: true,
      context: {
        user,
        client: {
          from: vi.fn((table: string) => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() => table === "user_accounts" ? mockAccount() : mockStaff()),
          })),
          auth: { mfa: { getAuthenticatorAssuranceLevel: mockAal } },
        },
        authType: req.headers.get("authorization") ? "bearer" : "cookie",
      },
    };
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({
    rpc: vi.fn(async (name: string) => {
      if (name === "is_listing_publicly_visible") {
        return mockIsPublicVisible();
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => {
      if (table === "listings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn(async () => mockGetListing()),
              single: vi.fn(async () => mockGetListing()),
            }),
          }),
        };
      }
      if (table === "listing_media") {
        const queryChain: any = {
          eq: vi.fn((...args) => { mockMediaEq(...args); return queryChain; }),
          maybeSingle: vi.fn(async () => mockGetMedia()),
          single: vi.fn(async () => mockGetMedia()),
        };
        return {
          select: vi.fn().mockReturnValue(queryChain),
        };
      }
      return {};
    }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async (path: string, expiresIn: number) =>
          mockCreateSignedUrl(path, expiresIn)
        ),
      })),
    },
  })),
}));

import { GET } from "@/app/api/listings/[id]/media/[mediaId]/[size]/route";

describe("Seller Media Derivative Delivery & Signed URL Tests (#103)", () => {
  const listingId = "11111111-1111-1111-1111-111111111111";
  const mediaId = "22222222-2222-2222-2222-222222222222";
  const ownerId = "owner-user-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccount.mockResolvedValue({ data: { account_status: "active" }, error: null });
    mockStaff.mockResolvedValue({ data: null, error: null });
    mockAal.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    mockAuthUser.mockResolvedValue(null);
    mockIsPublicVisible.mockResolvedValue({ data: false, error: null });
    mockGetListing.mockResolvedValue({
      data: { id: listingId, seller_id: ownerId, status: "draft" },
      error: null,
    });
    mockGetMedia.mockResolvedValue({
      data: {
        id: mediaId,
        listing_id: listingId,
        original_storage_path: `${listingId}/${mediaId}/original.jpg`,
        thumbnail_storage_path: `${listingId}/${mediaId}/thumb.webp`,
        medium_storage_path: `${listingId}/${mediaId}/medium.webp`,
        large_storage_path: `${listingId}/${mediaId}/large.webp`,
        processing_status: "ready",
      },
      error: null,
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: `https://storage.example.com/object?token=signed_sig_123` },
      error: null,
    });
  });

  const deliver = (size = "original", json = false) => GET(
    new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/${size}`, {
      headers: json ? { Accept: "application/json", Authorization: "Bearer test_token" } : {},
    }),
    { params: Promise.resolve({ id: listingId, mediaId, size }) },
  );

  it.each([true, false])("original authorization matrix (public=%s)", async (publicVisible) => {
    mockIsPublicVisible.mockResolvedValue({ data: publicVisible, error: null });
    for (const actor of [null, "buyer", "another-seller", "support", "moderator-aal1", "suspended-owner", "suspended-staff", "role-error", "aal-error", "account-error", "missing-account", "owner", "administrator", "moderator"]) {
      mockCreateSignedUrl.mockClear();
      mockAuthUser.mockResolvedValue(actor === null ? null : { id: actor?.includes("owner") ? ownerId : actor });
      const staff = ["support", "moderator-aal1", "suspended-staff", "role-error", "aal-error", "administrator", "moderator"].includes(actor ?? "");
      mockStaff.mockResolvedValue({ data: staff ? { role: actor === "support" ? "support" : actor === "administrator" ? "administrator" : "moderator" } : null, error: actor === "role-error" ? {} : null });
      mockAal.mockResolvedValue({ data: { currentLevel: actor === "moderator-aal1" ? "aal1" : "aal2" }, error: actor === "aal-error" ? {} : null });
      mockAccount.mockResolvedValue({ data: actor === "missing-account" ? null : { account_status: actor?.startsWith("suspended") ? "suspended" : "active" }, error: actor === "account-error" ? {} : null });
      // Exercise account failure on an otherwise authorized owner.
      if (["account-error", "missing-account"].includes(actor ?? "")) mockAuthUser.mockResolvedValue({ id: ownerId });
      const res = await deliver();
      const allowed = ["owner", "administrator", "moderator"].includes(actor ?? "");
      expect(res.status, String(actor)).toBe(allowed ? 302 : 404);
      expect(res.headers.get("cache-control")).toContain("no-store");
      if (allowed) expect(mockCreateSignedUrl).toHaveBeenCalledWith(`${listingId}/${mediaId}/original.jpg`, actor === "owner" ? 60 : 300);
      else {
        expect((await res.json()).code).toBe("LISTING_NOT_FOUND");
        expect(mockCreateSignedUrl).not.toHaveBeenCalled();
        expect(res.headers.get("location")).toBeNull();
      }
    }
  });

  it.each(["thumb", "medium", "large"])("public %s preserves browser cache and native JSON contract", async (size) => {
    mockIsPublicVisible.mockResolvedValue({ data: true, error: null });
    expect((await deliver(size)).headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    expect(mockAuthUser).not.toHaveBeenCalled();
    expect(mockGetListing).not.toHaveBeenCalled();
    expect(mockAccount).not.toHaveBeenCalled();
    expect(mockMediaEq).toHaveBeenCalledWith("processing_status", "ready");
    mockAuthUser.mockResolvedValue({ id: "buyer" });
    const res = await deliver(size, true);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://storage.example.com/object?token=signed_sig_123", expiresIn: 60 });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mockAccount).not.toHaveBeenCalled();
  });

  it.each([null, "buyer", ownerId, "staff"])("JSON originals never sign for %s", async (id) => {
    mockAuthUser.mockResolvedValue(id ? { id } : null);
    expect((await deliver("original", true)).status).toBe(400);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it.each(["thumb", "medium", "large"])("private %s denies unrelated users in both response modes", async (size) => {
    for (const json of [false, true]) {
      mockAuthUser.mockResolvedValue({ id: "another-seller" });
      const res = await deliver(size, json);
      expect(res.status).toBe(404);
      expect((await res.json()).code).toBe("LISTING_NOT_FOUND");
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    }
  });

  it("owner original fails closed for sealed storage paths", async () => {
    mockAuthUser.mockResolvedValue({ id: ownerId });
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({ data: { ...current.data, original_storage_path: `${listingId}/${mediaId}/v2/version/hash/original.jpg` }, error: null });
    expect((await deliver()).status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("binds media lookup to both IDs and denies a missing pair", async () => {
    mockAuthUser.mockResolvedValue({ id: ownerId });
    mockGetMedia.mockResolvedValue({ data: null, error: null });
    expect((await deliver()).status).toBe(404);
    expect(mockMediaEq).toHaveBeenCalledWith("id", mediaId);
    expect(mockMediaEq).toHaveBeenCalledWith("listing_id", listingId);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("public JSON buyer cannot sign processing media", async () => {
    mockIsPublicVisible.mockResolvedValue({ data: true, error: null });
    mockAuthUser.mockResolvedValue({ id: "buyer" });
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({ data: { ...current.data, processing_status: "processing" }, error: null });
    expect((await deliver("medium", true)).status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("public active derivative redirects normally with public Cache-Control", async () => {
    mockIsPublicVisible.mockResolvedValue({ data: true, error: null });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/medium`);
    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "medium" }) });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example.com/object?token=signed_sig_123");
    expect(res.headers.get("cache-control")).toContain("public");
  });

  it("unauthenticated private draft returns 404 LISTING_NOT_FOUND to conceal existence", async () => {
    mockIsPublicVisible.mockResolvedValue({ data: false, error: null });
    mockAuthUser.mockResolvedValue(null); // unauthenticated

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/thumb`);
    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "thumb" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("LISTING_NOT_FOUND");
  });

  it("authenticated owner cookie gets 302 redirect with private, no-store Cache-Control", async () => {
    mockIsPublicVisible.mockResolvedValue({ data: false, error: null });
    mockAuthUser.mockResolvedValue({ id: ownerId }); // owner authenticated via cookie

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/thumb`);
    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "thumb" }) });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.example.com/object?token=signed_sig_123");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("authenticated owner Bearer with Accept: application/json returns JSON signed URL", async () => {
    const bearerToken = "secret_native_bearer_token_xyz";
    mockIsPublicVisible.mockResolvedValue({ data: false, error: null });
    mockAuthUser.mockResolvedValue({ id: ownerId });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/medium`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "medium" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.url).toBe("https://storage.example.com/object?token=signed_sig_123");
    expect(json.expiresIn).toBe(60);

    // Crucial security invariant: token never appears in signed URL or response body
    expect(json.url).not.toContain(bearerToken);
    expect(JSON.stringify(json)).not.toContain(bearerToken);
  });

  it("non-owner cannot obtain private signed URL (returns 404 LISTING_NOT_FOUND)", async () => {
    mockIsPublicVisible.mockResolvedValue({ data: false, error: null });
    mockAuthUser.mockResolvedValue({ id: "different-user-uuid" }); // not owner

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/thumb`, {
      headers: {
        Authorization: "Bearer other_user_token",
        Accept: "application/json",
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "thumb" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("LISTING_NOT_FOUND");
    expect(json.url).toBeUndefined();
  });

  it("rejects original size request in native JSON mode (returns 400 INVALID_MEDIA_REQUEST)", async () => {
    mockAuthUser.mockResolvedValue({ id: ownerId });

    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/original`, {
      headers: {
        Authorization: "Bearer valid_token",
        Accept: "application/json",
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "original" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_MEDIA_REQUEST");
  });

  it("B2 sealed derivative: public delivery fails closed without issuing a signed URL", async () => {
    const bundleKey = `${listingId}/${mediaId}/v2/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}/medium.webp`;
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({
      ...current,
      data: { ...current.data, medium_storage_path: bundleKey },
    });
    mockIsPublicVisible.mockResolvedValue({ data: true, error: null });

    const res = await GET(
      new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/medium`),
      { params: Promise.resolve({ id: listingId, mediaId, size: "medium" }) },
    );

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("MEDIA_NOT_FOUND");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("B2 sealed derivative: native JSON mode returns 404 and never leaks Bearer or URL", async () => {
    const bearer = "do_not_forward_native_access_token";
    const bundleKey = `${listingId}/${mediaId}/v2/33333333-3333-4333-8333-333333333333/${"b".repeat(64)}/thumb.webp`;
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({
      ...current,
      data: { ...current.data, thumbnail_storage_path: bundleKey },
    });
    mockAuthUser.mockResolvedValue({ id: ownerId });

    const res = await GET(
      new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/thumb`, {
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      }),
      { params: Promise.resolve({ id: listingId, mediaId, size: "thumb" }) },
    );

    expect(res.status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.code).toBe("MEDIA_NOT_FOUND");
    expect(body.url).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(bearer);
  });

  it("B2 mixed original sealed / derivative V1 keys fail closed for public URLs", async () => {
    const originalSealedPath = `${listingId}/${mediaId}/v2/33333333-3333-4333-8333-333333333333/${"c".repeat(64)}/original.jpg`;
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({
      ...current,
      data: { ...current.data, original_storage_path: originalSealedPath },
    });
    mockIsPublicVisible.mockResolvedValue({ data: true, error: null });

    const res = await GET(
      new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/large`),
      { params: Promise.resolve({ id: listingId, mediaId, size: "large" }) }
    );
    expect(res.status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("B2 cross-listing Storage paths fail closed even when source is ordinary V1", async () => {
    const current = await mockGetMedia();
    mockGetMedia.mockResolvedValue({
      ...current,
      data: {
        ...current.data,
        medium_storage_path: `another-listing/${mediaId}/medium.webp`,
      },
    });
    mockAuthUser.mockResolvedValue({ id: ownerId });
    const res = await GET(
      new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/thumb`),
      { params: Promise.resolve({ id: listingId, mediaId, size: "thumb" }) }
    );
    expect(res.status).toBe(404);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects unsupported size parameter with 400 INVALID_MEDIA_REQUEST", async () => {
    const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId}/huge`);
    const res = await GET(req, { params: Promise.resolve({ id: listingId, mediaId, size: "huge" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_MEDIA_REQUEST");
  });
});
