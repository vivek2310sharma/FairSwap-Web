import { logger } from "@/lib/logger";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { mediaApiError, mapRpcErrorToMediaError } from "@/lib/media/api-contract";

const mockAuthUser = vi.fn();
const mockRpc = vi.fn();
const mockDbFrom = vi.fn();
let newSubmissionFamily=false;
let failSubmissionFamilyRead=false;
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
          from: (...args: unknown[]) => ['listing_vehicle_contexts','listing_car_contexts','listing_property_contexts'].includes(String(args[0]))
            ? {select:()=>({eq:()=>({maybeSingle:async()=>({data:newSubmissionFamily&&args[0]==='listing_car_contexts'?{listing_id:'11111111-1111-1111-1111-111111111111'}:null,error:failSubmissionFamilyRead?{message:'Context read failed'}:null})})})}
            : mockDbFrom(...args),
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
    from: (...args: unknown[]) => mockDbFrom(...args),
  })),
}));

import { GET as getMediaSnapshot, POST as postUploadMedia } from "@/app/api/listings/[id]/media/route";
import { DELETE as deleteMedia } from "@/app/api/listings/[id]/media/[mediaId]/route";
import { POST as postReorderMedia } from "@/app/api/listings/[id]/media/reorder/route";
import { PUT as putCoverPhoto } from "@/app/api/listings/[id]/media/cover/route";
import { reorderMediaAction, setCoverPhotoAction } from "@/app/account/listings/actions";

describe("Seller Media API Route Contracts & Mutation Guards (#103)", () => {
  const listingId = "11111111-1111-1111-1111-111111111111";
  const mediaId1 = "22222222-2222-2222-2222-222222222221";
  const mediaId2 = "22222222-2222-2222-2222-222222222222";
  const ownerId = "owner-user-uuid";
let failSnapshotDb = false;
let orderCalled = false;

  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    // This suite models the installed family schema, independently of submission.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://wpppxlnbzqynvhpeuavd.supabase.co');
    vi.stubEnv('STAGING_SUPABASE_URL','');
    vi.stubEnv('SUPABASE_URL','');
    newSubmissionFamily=false;failSubmissionFamilyRead=false;
    failSnapshotDb = false;
    orderCalled = false;
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
          order: vi.fn(() => {
            orderCalled = true;
            return queryChain;
          }),
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
          then: (resolve: any) => {
            if (failSnapshotDb && orderCalled) {
              return resolve({
                data: null,
                error: { code: "50000", message: "snapshot db error" },
              });
            }
            return resolve({
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
            });
          },
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

  it('new-family pending mutations are rejected before upload/storage or mutation RPC; family read failures fail closed',async()=>{
    newSubmissionFamily=true;
    const original=mockDbFrom.getMockImplementation()!;
    mockDbFrom.mockImplementation((table:string)=>table==='listings'?{select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:listingId,seller_id:ownerId,status:'pending_review',revision:9,cover_photo_id:mediaId1},error:null})})})}:original(table));
    const req=new NextRequest(`http://localhost/api/listings/${listingId}/media`,{method:'POST'});
    const response=await postUploadMedia(req,{params:Promise.resolve({id:listingId})});expect(response.status).toBe(409);expect((await response.json()).code).toBe('LISTING_MEDIA_NOT_EDITABLE');expect(mockServiceStorage.from).not.toHaveBeenCalled();expect(mockServiceRpc).not.toHaveBeenCalled();
    failSubmissionFamilyRead=true;
    const unavailable=await postUploadMedia(new NextRequest(`http://localhost/api/listings/${listingId}/media`,{method:'POST'}),{params:Promise.resolve({id:listingId})});expect(unavailable.status).toBe(503);expect(mockServiceStorage.from).not.toHaveBeenCalled();
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

    it("owner + valid empty media -> 200, media=[]", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft", revision: 1, cover_photo_id: null },
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft", revision: 1, cover_photo_id: null },
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
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
          return { select: vi.fn(() => queryChain) };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`);
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.listing.id).toBe(listingId);
      expect(json.media).toEqual([]);
    });

    it("owner + media query DB failure -> 503 MEDIA_SERVICE_UNAVAILABLE", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft", revision: 1, cover_photo_id: null },
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: ownerId, status: "draft", revision: 1, cover_photo_id: null },
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
            then: (resolve: any) => resolve({ data: null, error: { message: "query timeout", code: "57P01" } }),
          };
          return { select: vi.fn(() => queryChain) };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`);
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("MEDIA_SERVICE_UNAVAILABLE");
    });

    it("listing lookup DB failure -> 503 MEDIA_SERVICE_UNAVAILABLE", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "connection refused", code: "08006" },
                }),
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "connection refused", code: "08006" },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`);
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("MEDIA_SERVICE_UNAVAILABLE");
    });

    it("missing listing -> 404 LISTING_NOT_FOUND", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`);
      const res = await getMediaSnapshot(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("LISTING_NOT_FOUND");
    });

    it("non-owner -> 404 LISTING_NOT_FOUND", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "listings") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: "other-user-uuid", status: "draft" },
                  error: null,
                }),
                single: vi.fn().mockResolvedValue({
                  data: { id: listingId, seller_id: "other-user-uuid", status: "draft" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

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

    it("rejects mutations with 503 MEDIA_SERVICE_UNAVAILABLE when account lookup suffers database outage", async () => {
      mockDbFrom.mockImplementation((table: string) => {
        if (table === "user_accounts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "connection timeout" },
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

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("MEDIA_SERVICE_UNAVAILABLE");
    });

    it("rejects mutations with 503 MEDIA_SERVICE_UNAVAILABLE when policy status lookup suffers infrastructure outage", async () => {
      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") {
          return { data: null, error: { message: "RPC timeout" } };
        }
        return { data: null, error: null };
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
        method: "PUT",
        body: JSON.stringify({ mediaId: mediaId1 }),
      });
      const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("MEDIA_SERVICE_UNAVAILABLE");
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

  describe("E. Delete Operations & Idempotent RPC Response (Sections 5 & 7)", () => {
    it("B2b: skips privileged Storage deletion when DB row references a sealed object", async () => {
      const priorFrom = mockDbFrom.getMockImplementation();
      expect(priorFrom).toBeDefined();
      mockDbFrom.mockImplementation((table: string) => {
        const normal = priorFrom!(table);
        if (table !== "listing_media") return normal;
        return {
          ...normal,
          select: (projection: string) => {
            if (projection.startsWith("id, original_storage_path")) {
              const row = {
                id: mediaId1,
                original_storage_path: `${listingId}/${mediaId1}/v2/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/original.jpg`,
                thumbnail_storage_path: `${listingId}/${mediaId1}/thumb.webp`,
                medium_storage_path: `${listingId}/${mediaId1}/medium.webp`,
                large_storage_path: `${listingId}/${mediaId1}/large.webp`,
                processing_status: "ready",
              };
              return {
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: row, error: null }),
                  }),
                }),
              };
            }
            return normal.select(projection);
          },
        };
      });

      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: true, error: null };
        if (name === "seller_delete_listing_media") {
          return {
            data: {
              success: true,
              deleted: true,
              deleted_media_id: mediaId1,
              new_cover_id: mediaId2,
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      const warn = vi.spyOn(logger, "warn");
      const response = await deleteMedia(
        new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) },
      );

      expect(response.status).toBe(200);
      expect((await response.json()).committed).toBe(true);
      expect(mockServiceStorage.from).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        "media.storage_cleanup_deferred",
        expect.objectContaining({ stage: "sealed_or_unrecognized_path" }),
      );
      warn.mockRestore();
    });

    it("deleted=true: returns exact successful deletion shape with deleted_media_id", async () => {
      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: true, error: null };
        if (name === "seller_delete_listing_media") {
          return {
            data: {
              success: true,
              deleted: true,
              deleted_media_id: mediaId1,
              new_cover_id: mediaId2,
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
        method: "DELETE",
      });
      const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(true);
      expect(json.deleted_media_id).toBe(mediaId1);
      expect(json.new_cover_id).toBe(mediaId2);
      expect(json.snapshot).toBeDefined();
      expect(json.snapshot.listing.id).toBe(listingId);
    });

    it("deleted=false: returns exact idempotent response with deleted_media_id=null", async () => {
      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: true, error: null };
        if (name === "seller_delete_listing_media") {
          return {
            data: {
              success: true,
              deleted: false,
              deleted_media_id: null,
              new_cover_id: mediaId2,
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
        method: "DELETE",
      });
      const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(false);
      expect(json.deleted_media_id).toBeNull();
      expect(json.new_cover_id).toBe(mediaId2);
      expect(json.snapshot).toBeDefined();
    });

    it("Storage cleanup returned error: preserves DB deletion, returns 200, logs sanitized warning", async () => {
      const warnSpy = vi.spyOn(logger, "warn");

      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: true, error: null };
        if (name === "seller_delete_listing_media") {
          return {
            data: {
              success: true,
              deleted: true,
              deleted_media_id: mediaId1,
              new_cover_id: null,
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      mockServiceStorage.from.mockReturnValueOnce({
        remove: vi.fn().mockResolvedValue({ data: null, error: { message: "Storage remove failure" } }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
        method: "DELETE",
      });
      const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(true);
      expect(json.deleted_media_id).toBe(mediaId1);

      // Verify sanitized logger call
      expect(warnSpy).toHaveBeenCalledWith(
        "media.storage_cleanup_failed",
        expect.objectContaining({
          operation: "delete_media_storage_cleanup",
          listing_id: listingId,
          media_id: mediaId1,
          stage: "storage_remove_error",
        })
      );

      // Ensure no private storage paths leaked to client response
      const responseStr = JSON.stringify(json);
      expect(responseStr).not.toContain("listing-originals");
      expect(responseStr).not.toContain("listing-derivatives");
      expect(responseStr).not.toContain(".webp");
      expect(responseStr).not.toContain(".jpg");

      warnSpy.mockRestore();
    });

    it("Storage cleanup thrown exception: preserves DB deletion, returns 200, logs sanitized warning", async () => {
      const warnSpy = vi.spyOn(logger, "warn");

      mockRpc.mockImplementation(async (name: string) => {
        if (name === "has_current_policy_acceptance") return { data: true, error: null };
        if (name === "seller_delete_listing_media") {
          return {
            data: {
              success: true,
              deleted: true,
              deleted_media_id: mediaId1,
              new_cover_id: null,
            },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      });

      mockServiceStorage.from.mockReturnValueOnce({
        remove: vi.fn().mockRejectedValue(new Error("Network timeout")),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
        method: "DELETE",
      });
      const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(true);

      expect(warnSpy).toHaveBeenCalledWith(
        "media.storage_cleanup_failed",
        expect.objectContaining({
          operation: "delete_media_storage_cleanup",
          listing_id: listingId,
          media_id: mediaId1,
        })
      );

      warnSpy.mockRestore();
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

  describe("G. Explicit RPC Sentinel Mapping & Error Contract Alignment", () => {
    it("maps known sentinels to canonical codes and never exposes raw SQL prose", () => {
      // using top-level import

      const photoLimitRes = mapRpcErrorToMediaError({ message: "PHOTO_LIMIT_REACHED: max 8 reached" }, "MEDIA_UPLOAD_FAILED");
      expect(photoLimitRes.status).toBe(409);

      const unauthRes = mapRpcErrorToMediaError({ message: "UNAUTHENTICATED: no token" }, "MEDIA_REORDER_FAILED");
      expect(unauthRes.status).toBe(401);

      const unknownRes = mapRpcErrorToMediaError({ message: "ERROR: 23505: duplicate key value violates unique constraint" }, "MEDIA_REORDER_FAILED");
      expect(unknownRes.status).toBe(422);
    });

    it("emits canonical error shape { code, message } with deprecated error alias", async () => {
      // using top-level import
      const res = mediaApiError("MEDIA_DELETE_FAILED");
      const json = await res.json();
      expect(json).toHaveProperty("code", "MEDIA_DELETE_FAILED");
      expect(json).toHaveProperty("message");
      expect(json).toHaveProperty("error"); // Deprecated backward-compatible alias
      expect(json.error).toBe(json.message);
    });
  });


  describe("H. Post-Commit Mutation Acknowledgement & Reconciliation Contract (Section 11)", () => {
    async function createTestImageFile(): Promise<File> {
      const imageBuf = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 200, g: 100, b: 50 } },
      })
        .jpeg()
        .toBuffer();
      const file = new File([new Uint8Array(imageBuf)], "test.jpg", { type: "image/jpeg" });
      file.arrayBuffer = async () => Uint8Array.from(imageBuf).buffer;
      return file;
    }

    describe("UPLOAD", () => {
      it("ready commit + snapshot success -> 201 committed=true refreshRequired=false with snapshot", async () => {
        failSnapshotDb = false;
        orderCalled = false;
        const file = await createTestImageFile();
        const formData = new FormData();
        formData.append("file", file);

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
          method: "POST",
          headers: { Authorization: "Bearer token" },
        });
        req.formData = async () => formData;

        const res = await postUploadMedia(req, { params: Promise.resolve({ id: listingId }) });
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.refreshRequired).toBe(false);
        expect(json.uploadedMediaId).toBe(mediaId2);
        expect(json.processingStatus).toBe("ready");
        expect(json.snapshot).not.toBeNull();
        expect(json.snapshot.listing.id).toBe(listingId);
      });

      it("ready commit + snapshot DB error -> 201 committed=true refreshRequired=true, uploadedMediaId retained, NOT 503", async () => {
        failSnapshotDb = true;
        orderCalled = false;
        const file = await createTestImageFile();
        const formData = new FormData();
        formData.append("file", file);

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
          method: "POST",
          headers: { Authorization: "Bearer token" },
        });
        req.formData = async () => formData;

        const res = await postUploadMedia(req, { params: Promise.resolve({ id: listingId }) });
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.refreshRequired).toBe(true);
        expect(json.uploadedMediaId).toBe(mediaId2);
        expect(json.processingStatus).toBe("ready");
        expect(json.snapshot).toBeNull();
        expect(json.code).toBeUndefined(); // DOES NOT return MEDIA_SERVICE_UNAVAILABLE
      });
    });

    describe("DELETE", () => {
      it("RPC success + snapshot error -> 200 committed=true refreshRequired=true, deleted authoritative", async () => {
        failSnapshotDb = true;
        orderCalled = false;
        mockRpc.mockImplementation(async (name: string) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          if (name === "seller_delete_listing_media") {
            return {
              data: {
                success: true,
                deleted: true,
                deleted_media_id: mediaId1,
                new_cover_id: mediaId2,
              },
              error: null,
            };
          }
          return { data: { success: true }, error: null };
        });

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/${mediaId1}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer token" },
        });
        const res = await deleteMedia(req, { params: Promise.resolve({ id: listingId, mediaId: mediaId1 }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.deleted).toBe(true);
        expect(json.deleted_media_id).toBe(mediaId1);
        expect(json.new_cover_id).toBe(mediaId2);
        expect(json.refreshRequired).toBe(true);
        expect(json.snapshot).toBeNull();
      });
    });

    describe("REORDER", () => {
      it("RPC changed=true + snapshot error -> 200 committed=true refreshRequired=true", async () => {
        failSnapshotDb = true;
        orderCalled = false;
        mockRpc.mockImplementation(async (name: string) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          if (name === "seller_reorder_listing_media") {
            return {
              data: {
                success: true,
                changed: true,
                count: 2,
              },
              error: null,
            };
          }
          return { data: { success: true }, error: null };
        });

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
          method: "POST",
          headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
          body: JSON.stringify({ mediaIds: [mediaId2, mediaId1] }),
        });
        const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.changed).toBe(true);
        expect(json.refreshRequired).toBe(true);
        expect(json.snapshot).toBeNull();
      });

      it("no-op changed=false + snapshot error -> 200 committed=true refreshRequired=true", async () => {
        failSnapshotDb = true;
        orderCalled = false;
        mockRpc.mockImplementation(async (name: string) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          if (name === "seller_reorder_listing_media") {
            return {
              data: {
                success: true,
                changed: false,
                count: 2,
              },
              error: null,
            };
          }
          return { data: { success: true }, error: null };
        });

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
          method: "POST",
          headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
          body: JSON.stringify({ mediaIds: [mediaId1, mediaId2] }),
        });
        const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.changed).toBe(false);
        expect(json.refreshRequired).toBe(true);
        expect(json.snapshot).toBeNull();
      });
    });

    describe("COVER", () => {
      it("RPC success + snapshot error -> 200 committed=true refreshRequired=true", async () => {
        failSnapshotDb = true;
        orderCalled = false;
        mockRpc.mockImplementation(async (name: string) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          if (name === "seller_set_listing_cover_photo") {
            return {
              data: {
                success: true,
                cover_photo_id: mediaId2,
              },
              error: null,
            };
          }
          return { data: { success: true }, error: null };
        });

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/cover`, {
          method: "PUT",
          headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId: mediaId2 }),
        });
        const res = await putCoverPhoto(req, { params: Promise.resolve({ id: listingId }) });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.committed).toBe(true);
        expect(json.coverPhotoId).toBe(mediaId2);
        expect(json.refreshRequired).toBe(true);
        expect(json.snapshot).toBeNull();
      });
    });

    describe("PRE-COMMIT", () => {
      it("RPC failure continues returning canonical non-2xx error", async () => {
        mockRpc.mockImplementation(async (name: string) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          if (name === "seller_reorder_listing_media") {
            return {
              data: null,
              error: { message: "INVALID_MEDIA_REQUEST: Photos can only be reordered after all uploads are ready." },
            };
          }
          return { data: null, error: null };
        });

        const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media/reorder`, {
          method: "POST",
          headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
          body: JSON.stringify({ mediaIds: [mediaId2, mediaId1] }),
        });
        const res = await postReorderMedia(req, { params: Promise.resolve({ id: listingId }) });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe("INVALID_MEDIA_REQUEST");
        expect(json.message).toBe("Photos can only be reordered after all uploads are ready.");
      });
    });
  });

});
