import { describe, it, expect, vi } from "vitest";
import { orchestrateAccountDeletion } from "@/lib/privacy/deletion-orchestrator";
import * as serviceModule from "@/lib/supabase/service";

describe("Point 12 Privacy Defect Regression Tests", () => {
  it("P12-J regression: deletion orchestrator halts and reports failure when storage removal fails", async () => {
    const mockStorageRemove = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "StorageApiError", message: "Simulated S3 storage failure" },
    });

    const mockRpc = vi.fn().mockImplementation((fnName: string) => {
      if (fnName === "admin_begin_account_deletion") {
        return Promise.resolve({ data: { user_id: "test-user-123" }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: "req-123", status: "pending", user_id: "test-user-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "listing_media") {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [
                {
                  original_storage_path: "test-user-123/orig.jpg",
                  thumbnail_storage_path: "test-user-123/thumb.webp",
                  medium_storage_path: null,
                  large_storage_path: null,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const mockDeleteUser = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockServiceClient = {
      from: mockFrom,
      rpc: mockRpc,
      storage: {
        from: () => ({
          remove: mockStorageRemove,
        }),
      },
      auth: {
        admin: {
          deleteUser: mockDeleteUser,
        },
      },
    };

    vi.spyOn(serviceModule, "createServiceRoleClient").mockReturnValue(mockServiceClient as unknown as ReturnType<typeof serviceModule.createServiceRoleClient>);

    const result = await orchestrateAccountDeletion("req-123");

    // Must report failure truthfully
    expect(result.success).toBe(false);
    expect(result.error).toContain("Storage cleanup failed");
    expect(result.error).toContain("Simulated S3 storage failure");

    // Must NOT have called Auth admin deleteUser!
    expect(mockDeleteUser).not.toHaveBeenCalled();

    // Must NOT have called admin_finalize_account_deletion!
    expect(mockRpc).not.toHaveBeenCalledWith("admin_finalize_account_deletion", expect.anything());
  });

  it("P12-L regression: deletion orchestrator is safely idempotent when request is already resolved", async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "privacy_requests") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { id: "req-already-done", status: "resolved", user_id: null },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const mockServiceClient = {
      from: mockFrom,
    };

    vi.spyOn(serviceModule, "createServiceRoleClient").mockReturnValue(mockServiceClient as unknown as ReturnType<typeof serviceModule.createServiceRoleClient>);

    const result = await orchestrateAccountDeletion("req-already-done");
    expect(result.success).toBe(true);
    expect(result.requestId).toBe("req-already-done");
  });
});
