/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mediaApiError } from "@/lib/media/api-contract";

const mockAuthUser = vi.fn();
const mockRpc = vi.fn();
const mockDbFrom = vi.fn();
const mockServiceStorage = {
  getBucket: vi.fn().mockResolvedValue({ data: { id: "listing-originals" }, error: null }),
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: "path" }, error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
};
const mockServiceRpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

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
          from: (...args: unknown[]) => mockDbFrom(...args),
          rpc: (...args: unknown[]) => mockRpc(...args),
        },
        authType: req.headers.get("authorization") ? "bearer" : "cookie",
      },
    };
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({
    storage: mockServiceStorage,
    rpc: mockServiceRpc,
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  })),
}));

import { GET as getMediaSnapshot } from "@/app/api/listings/[id]/media/route";
import { DELETE as deleteMedia } from "@/app/api/listings/[id]/media/[mediaId]/route";
import { POST as postReorderMedia } from "@/app/api/listings/[id]/media/reorder/route";
import { PUT as putCoverPhoto } from "@/app/api/listings/[id]/media/cover/route";
import { reorderMediaAction, setCoverPhotoAction } from "@/app/account/listings/actions";

describe("Seller Media API Route Contracts & Mutation Guards (#103)", () => {
  const listingId = "11111111-1111-1111-1111-111111111111";
  const mediaId1 = "22222222-2222-2222-2222-222222222221";
  const mediaId2 = "22222222-2222-2222-2222-222222222222";
  const ownerId = "owner-user-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MAINTENANCE_SELLER_WRITES;
    mockAuthUser.mockResolvedValue({ id: ownerId, email: "owner@example.com" });
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "has_current_policy_acceptance") return { data: true, error: null };
      return { data: { success: true }, error: null };
    });

    mockDbFrom.mockImplementation((table: string) => {
      if (table === "user_accounts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { account_status: "active" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "listings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: listingId,
                  seller_id: ownerId,
                  status: "draft",
                  revision: 1,
                  cover_photo_id: mediaId1,
                },
                error: null,
              }),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: listingId,
                  seller_id: ownerId,
                  status: "draft",
                  revision: 1,
                  cover_photo_id: mediaId1,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "listing_media") {
        const queryChain: any = {
          eq: vi.fn(() => queryChain),
          order: vi.fn(() => queryChain),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: mediaId1,
              listing_id: listingId,
              original_storage_path: `${listingId}/${mediaId1}/original.jpg`,
              thumbnail_storage_path: `${listingId}/${mediaId1}/thumb.webp`,
              medium_storage_path: `${listingId}/${mediaId1}/medium.webp`,
              large_storage_path: `${listingId}/${mediaId1}/large.webp`,
              processing_status: "ready",
            },
            error: null,
          }),
          then: (resolve: any) =>
            resolve({
              data: [
                {
                  id: mediaId1,
                  listing_id: listingId,
                  width: 1200,
                  height: 800,
                  display_order: 0,
                  processing_status: "ready",
                  created_at: "2026-10-02T12:00:00Z",
                },
                {
                  id: mediaId2,
                  listing_id: listingId,
                  width: 1000,
                  height: 1000,
                  display_order: 1,
                  processing_status: "ready",
                  created_at: "2026-10-02T12:01:00Z",
                },
              ],
              count: 2,
              error: null,
            }),
        };
        return {
          select: vi.fn(() => queryChain),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mediaId2, display_order: 1, processing_status: "uploading" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });
  });

  describe("A. Owner Media Snapshot GET (/api/listings/[id]/media)", () => {
    it("returns safe snapshot for authenticated listing owner", async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
        headers: { Authorization: "Bearer token" },
      });
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.listing.id).toBe(listingId);
      expect(json.listing.status).toBe("draft");
      expect(json.listing.coverPhotoId).toBe(mediaId1);
      expect(json.media.length).toBe(2);

      // Verify exact safe fields on media item
      const item = json.media[0];
      expect(item.id).toBe(mediaId1);
      expect(item.listingId).toBe(listingId);
      expect(item.displayOrder).toBe(0);
      expect(item.processingStatus).toBe("ready");
      expect(item.isCover).toBe(true);

      // Verify STRICT absence of private/sensitive data
      expect(item.original_storage_path).toBeUndefined();
      expect(item.thumbnail_storage_path).toBeUndefined();
      expect(item.medium_storage_path).toBeUndefined();
      expect(item.large_storage_path).toBeUndefined();
      expect(item.uploader_id).toBeUndefined();
      expect(item.processing_error).toBeUndefined();
      expect(json.pin_code).toBeUndefined();
      expect(json.landmark).toBeUndefined();
    });

    it("conceals non-owner or missing listings with 404 LISTING_NOT_FOUND", async () => {
      mockAuthUser.mockResolvedValue({ id: "intruder-id" }); // not owner

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`);
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("LISTING_NOT_FOUND");
    });

    it("allows reading media snapshot even when seller-write maintenance is enabled", async () => {
      process.env.MAINTENANCE_SELLER_WRITES = "true";

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
        headers: { Authorization: "Bearer token" },
      });
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.media.length).toBe(2);
    });
  });

  describe("B. Preflight Mutation Guards across Write Routes", () => {
    it("rejects mutations with 503 SELLER_WRITES_DISABLED when maintenance is active", async () => {
      process.env.MAINTENANCE_SELLER_WRITES = "true";

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
        method: "POST",
        body: JSON.stringify({ mediaIds: [mediaId1, mediaId2] }),
      });
      const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("SELLER_WRITES_DISABLED");
    });

    it("rejects mutations with 403 ACCOUNT_RESTRICTED when account status is not active", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "user_accounts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { account_status: "suspended" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: mediaId1 }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("ACCOUNT_RESTRICTED");
    });

    it("rejects mutations with 403 POLICY_ACCEPTANCE_REQUIRED when policy is stale", async () => {
      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: false, error: null };
        return { data: null, error: null };
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: mediaId1 }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("POLICY_ACCEPTANCE_REQUIRED");
    });

    it("rejects mutations with 409 LISTING_MEDIA_NOT_EDITABLE on terminal status (expired, sold, removed)", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "user_accounts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { account_status: "active" }, error: null }),
              }),
            }),
          };
        }
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "sold" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: mediaId1 }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.code).toBe("LISTING_MEDIA_NOT_EDITABLE");
    });
  });

  describe("C. Reorder Route & Web Parity", () => {
    it("validates request JSON with Zod (rejects invalid UUIDs or empty arrays)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
        method: "POST",
        body: JSON.stringify({ mediaIds: ["not-a-uuid"] }),
      });
      const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_MEDIA_REQUEST");
    });

    it("successfully calls seller_reorder_listing_media RPC and returns updated safe snapshot", async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
        method: "POST",
        body: JSON.stringify({ mediaIds: [mediaId2, mediaId1] }),
      });
      const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith("seller_reorder_listing_media", {
        listing_id: listingId,
        media_ids: [mediaId2, mediaId1],
      });
      const json = await res.json();
      expect(json.listing.id).toBe(listingId);
    });

    it("Web reorderMediaAction enforces maintenance guard", async () => {
      process.env.MAINTENANCE_SELLER_WRITES = "true";

      const result = await reorderMediaAction(listingId, [{ id: mediaId1, display_order: 0 }]);
      expect(result.error).toContain("temporarily paused");
    });
  });

  describe("D. Cover Photo Route & Web Parity", () => {
    it("validates request JSON with Zod", async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: "bad-id" }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_MEDIA_REQUEST");
    });

    it("successfully calls seller_set_listing_cover_photo RPC and returns updated safe snapshot", async () => {
      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: mediaId2 }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(200);
      expect(mockRpc).toHaveBeenCalledWith("seller_set_listing_cover_photo", {
        listing_id: listingId,
        media_id: mediaId2,
      });
    });

    it("Web setCoverPhotoAction enforces maintenance guard", async () => {
      process.env.MAINTENANCE_SELLER_WRITES = "true";

      const result = await setCoverPhotoAction(listingId, mediaId1);
      expect(result.error).toContain("temporarily paused");
    });
  });

  describe("E. Delete Idempotency", () => {
    it("returns 200 OK with snapshot when deleting already absent media row (retry-safe)", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "user_accounts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { account_status: "active" }, error: null }),
              }),
            }),
          };
        }
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft" },
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "listing_media") {
          const queryChain: any = {
            eq: vi.fn(() => queryChain),
            order: vi.fn(() => queryChain),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // Already absent
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
          return {
            select: vi.fn(() => queryChain),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
        method: "DELETE",
      });
      const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.snapshot).toBeDefined();
    });
  });

  describe("F. Adversarial Error Sanitization (Section 34)", () => {
    it("sanitizes Postgres SQLSTATE and internal storage markers", async () => {
      const res = mediaApiError(
        "MEDIA_UPLOAD_FAILED",
        "ERROR 42P01: relation INTERNAL_POSTGREST_SECRET_TABLE_MESSAGE does not exist at listing-originals/internal/path.jpg with service_role_secret_marker"
      );
      const json = await res.json();

      expect(json.message).not.toContain("INTERNAL_POSTGREST_SECRET_TABLE_MESSAGE");
      expect(json.message).not.toContain("listing-originals");
      expect(json.message).not.toContain("service_role_secret_marker");
      expect(json.message).toBe("Failed to upload image. Please try again.");
    });
  });
});
