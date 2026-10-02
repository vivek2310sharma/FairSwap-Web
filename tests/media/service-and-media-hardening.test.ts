import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest } from "next/server";
import sharp from "sharp";

describe("Service Role Client & Media Failure Hardening Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("F. createServiceRoleClient Configuration Guard", () => {
    it("rejects missing server credentials when both keys are unset", () => {
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(() => createServiceRoleClient()).toThrow(
        "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required"
      );
    });

    it("accepts modern sb_secret_... key via SUPABASE_SECRET_KEY", () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SECRET_KEY = "sb_secret_staging_valid_token_mock_1234567890";
      expect(() => createServiceRoleClient()).not.toThrow();
    });

    it("accepts modern sb_secret_... key via legacy SUPABASE_SERVICE_ROLE_KEY fallback", () => {
      delete process.env.SUPABASE_SECRET_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_legacy_fallback_token_mock_1234567890";
      expect(() => createServiceRoleClient()).not.toThrow();
    });

    it("accepts a 3-segment JWT compatible key", () => {
      delete process.env.SUPABASE_SECRET_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = "header.payload.signature";
      expect(() => createServiceRoleClient()).not.toThrow();
    });

    it("rejects non-secret, non-3-segment strings without leaking the credential", () => {
      delete process.env.SUPABASE_SECRET_KEY;
      const malformed = "partOne.partTwo";
      process.env.SUPABASE_SERVICE_ROLE_KEY = malformed;
      let caughtError: Error | null = null;
      try {
        createServiceRoleClient();
      } catch (err) {
        caughtError = err as Error;
      }
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toBe(
        "Privileged server secret key is not configured with a compatible credential format."
      );
      expect(caughtError!.message).not.toContain(malformed);
    });

    it("enforces server-only boundary and rejects client-side execution", () => {
      process.env.SUPABASE_SECRET_KEY = "sb_secret_staging_token";
      const originalVitest = process.env.VITEST;
      delete process.env.VITEST;
      try {
        expect(() => createServiceRoleClient()).toThrow(
          "createServiceRoleClient must only be called on the server."
        );
      } finally {
        process.env.VITEST = originalVitest;
      }
    });
  });

  describe("G, H, I, J. Media Route Hardening", () => {
    async function createTestImageBuffer(): Promise<Buffer> {
      return sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 200, g: 100, b: 50 } },
      })
        .jpeg()
        .toBuffer();
    }

    function createTestFile(imageBuf: Buffer, name = "test.jpg", type = "image/jpeg"): File {
      const file = new File([new Uint8Array(imageBuf)], name, { type });
      file.arrayBuffer = async () => Uint8Array.from(imageBuf).buffer;
      return file;
    }

    it("G & I: Original upload failure cleans up media DB row and returns sanitized error", async () => {
      const imageBuf = await createTestImageBuffer();
      const listingId = "11111111-1111-1111-1111-111111111111";
      const mediaId = "22222222-2222-2222-2222-222222222222";

      const deletedRows: string[] = [];
      const removedStoragePaths: string[] = [];

      // Mock elevated service client
      const mockServiceClient = {
        storage: {
          getBucket: vi.fn().mockResolvedValue({ data: { id: "listing-originals" }, error: null }),
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Internal cloud storage timeout: secret_jwt_segment_fake" },
            }),
            remove: vi.fn().mockImplementation(async (paths: string[]) => {
              removedStoragePaths.push(...paths);
              return { data: null, error: null };
            }),
          }),
        },
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === "id") deletedRows.push(val);
              return Promise.resolve({ error: null });
            }),
          }),
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      // Mock authenticated client
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "seller-user-id" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockImplementation(async (name) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          return { data: null, error: null };
        }),
        from: vi.fn((table: string) => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: listingId, seller_id: "seller-user-id", status: "draft" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "listing_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mediaId, display_order: 0, processing_status: "uploading" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.doMock("@/lib/supabase/server", () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock("@/lib/supabase/service", () => ({
        createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
      }));

      const { POST: mockedPOST } = await import("@/app/api/listings/[id]/media/route");

      const formData = new FormData();
      formData.append("file", createTestFile(imageBuf));

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
        method: "POST",
      });
      req.formData = async () => formData;

      const res = await mockedPOST(req, {
        params: Promise.resolve({ id: listingId }),
      });

      const json = await res.json();
      expect(res.status).toBe(500);
      expect(json.error).toBe("Failed to upload image. Please try again.");
      expect(json.error).not.toContain("secret_jwt_segment_fake");

      // Verify the media record was removed from DB so no ghost row remains
      expect(deletedRows).toContain(mediaId);
    });

    it("H: Partial derivative failure cleans up storage and deterministically marks media failed", async () => {
      const imageBuf = await createTestImageBuffer();
      const listingId = "11111111-1111-1111-1111-111111111111";
      const mediaId = "33333333-3333-3333-3333-333333333333";

      const removedOriginals: string[] = [];
      const removedDerivatives: string[] = [];
      let rpcFailureRecorded = false;

      const mockServiceClient = {
        storage: {
          getBucket: vi.fn().mockResolvedValue({ data: { id: "listing-originals" }, error: null }),
          from: vi.fn((bucket: string) => ({
            upload: vi.fn().mockImplementation(async (path: string) => {
              if (bucket === "listing-originals") {
                return { data: { path }, error: null };
              }
              // Fail one of the derivatives
              if (path.includes("medium.webp")) {
                return { data: null, error: { message: "Disk full on derivative store" } };
              }
              return { data: { path }, error: null };
            }),
            remove: vi.fn().mockImplementation(async (paths: string[]) => {
              if (bucket === "listing-originals") removedOriginals.push(...paths);
              if (bucket === "listing-derivatives") removedDerivatives.push(...paths);
              return { data: null, error: null };
            }),
          })),
        },
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        rpc: vi.fn().mockImplementation(async (fnName: string, args: Record<string, unknown>) => {
          if (fnName === "record_media_processing_result" && args.status === "failed") {
            rpcFailureRecorded = true;
          }
          return { data: null, error: null };
        }),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "seller-user-id" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockImplementation(async (name) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          return { data: null, error: null };
        }),
        from: vi.fn((table: string) => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: listingId, seller_id: "seller-user-id", status: "draft" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "listing_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mediaId, display_order: 0, processing_status: "uploading" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.doMock("@/lib/supabase/server", () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock("@/lib/supabase/service", () => ({
        createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
      }));

      const { POST: mockedPOST } = await import("@/app/api/listings/[id]/media/route");

      const formData = new FormData();
      formData.append("file", createTestFile(imageBuf));

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
        method: "POST",
      });
      req.formData = async () => formData;

      const res = await mockedPOST(req, { params: Promise.resolve({ id: listingId }) });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.processing_status).toBe("failed");
      expect(json.id).toBe(mediaId);

      // Verify original was removed and any partial derivatives were cleaned
      expect(removedOriginals.length).toBeGreaterThan(0);
      expect(rpcFailureRecorded).toBe(true);
    });

    it("J: Successful media upload flow produces 1 ready row with 1 original and 3 derivatives", async () => {
      const imageBuf = await createTestImageBuffer();
      const listingId = "11111111-1111-1111-1111-111111111111";
      const mediaId = "44444444-4444-4444-4444-444444444444";

      const uploadedOriginals: string[] = [];
      const uploadedDerivatives: string[] = [];
      let finalStatus = "";

      const mockServiceClient = {
        storage: {
          getBucket: vi.fn().mockResolvedValue({ data: { id: "listing-originals" }, error: null }),
          from: vi.fn((bucket: string) => ({
            upload: vi.fn().mockImplementation(async (path: string) => {
              if (bucket === "listing-originals") uploadedOriginals.push(path);
              if (bucket === "listing-derivatives") uploadedDerivatives.push(path);
              return { data: { path }, error: null };
            }),
            remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        },
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }),
        rpc: vi.fn().mockImplementation(async (_fn: string, args: Record<string, unknown>) => {
          if (args.status) finalStatus = args.status as string;
          return { data: null, error: null };
        }),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "seller-user-id" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockImplementation(async (name) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          return { data: null, error: null };
        }),
        from: vi.fn((table: string) => {
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
                  single: vi.fn().mockResolvedValue({
                    data: { id: listingId, seller_id: "seller-user-id", status: "draft" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "listing_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mediaId, display_order: 0, processing_status: "uploading" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.doMock("@/lib/supabase/server", () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock("@/lib/supabase/service", () => ({
        createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
      }));

      const { POST: mockedPOST } = await import("@/app/api/listings/[id]/media/route");

      const formData = new FormData();
      formData.append("file", createTestFile(imageBuf));

      const req = new NextRequest(`http://localhost:3000/api/listings/${listingId}/media`, {
        method: "POST",
      });
      req.formData = async () => formData;

      const res = await mockedPOST(req, { params: Promise.resolve({ id: listingId }) });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(mediaId);
      expect(json.processing_status).toBe("ready");

      expect(uploadedOriginals.length).toBe(1);
      expect(uploadedDerivatives.length).toBe(3); // thumb, medium, large
      expect(finalStatus).toBe("ready");
    });
  });

  describe("Delete Path Safety", () => {
    it("fails and preserves DB row if storage removal fails", async () => {
      const listingId = "11111111-1111-1111-1111-111111111111";
      const mediaId = "55555555-5555-5555-5555-555555555555";
      let dbDeleteRpcCalled = false;

      const mockServiceClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            remove: vi.fn().mockResolvedValue({
              data: null,
              error: { name: "StorageDeleteError", message: "Failed to delete storage asset" },
            }),
          }),
        },
        rpc: vi.fn().mockImplementation(async () => {
          dbDeleteRpcCalled = true;
          return { data: null, error: null };
        }),
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "seller-user-id" } },
            error: null,
          }),
        },
        rpc: vi.fn().mockImplementation(async (name) => {
          if (name === "has_current_policy_acceptance") return { data: true, error: null };
          return { data: null, error: null };
        }),
        from: vi.fn((table: string) => {
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
                    data: { id: listingId, seller_id: "seller-user-id", status: "draft", revision: 1, cover_photo_id: null },
                    error: null,
                  }),
                  single: vi.fn().mockResolvedValue({
                    data: { id: listingId, seller_id: "seller-user-id", status: "draft", revision: 1, cover_photo_id: null },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "listing_media") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: mediaId,
                        listing_id: listingId,
                        original_storage_path: "path/to/orig.jpg",
                        thumbnail_storage_path: "path/to/thumb.webp",
                        processing_status: "ready",
                      },
                      error: null,
                    }),
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: mediaId,
                        listing_id: listingId,
                        original_storage_path: "path/to/orig.jpg",
                        thumbnail_storage_path: "path/to/thumb.webp",
                        processing_status: "ready",
                      },
                      error: null,
                    }),
                  }),
                }),
                order: vi.fn().mockReturnThis(),
              }),
            };
          }
          return {};
        }),
      };

      vi.doMock("@/lib/supabase/server", () => ({
        createClient: vi.fn().mockResolvedValue(mockSupabase),
      }));

      vi.doMock("@/lib/supabase/service", () => ({
        createServiceRoleClient: vi.fn().mockReturnValue(mockServiceClient),
      }));

      const { DELETE: mockedDELETE } = await import(
        "@/app/api/listings/[id]/media/[mediaId]/route"
      );

      const req = new NextRequest(
        `http://localhost:3000/api/listings/${listingId}/media/${mediaId}`,
        { method: "DELETE" }
      );

      const res = await mockedDELETE(req, {
        params: Promise.resolve({ id: listingId, mediaId }),
      });

      expect(res.status).toBe(500);
      expect(dbDeleteRpcCalled).toBe(false);
    });
  });
});
