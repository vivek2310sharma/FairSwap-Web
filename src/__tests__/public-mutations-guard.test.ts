import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleFavouriteAction } from "@/app/account/favourites/actions";
import { startConversationAction } from "@/app/account/messages/actions";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Public Mutation Guardrails (Favourites & Contact Seller)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleFavouriteAction", () => {
    it("redirects unauthenticated user to sign in", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const result = await toggleFavouriteAction("listing-123");
      expect(result.success).toBe(false);
      expect(result.requiresPolicyReview).toBe(false);
      expect(result.redirectTo).toContain("/auth/sign-in");
    });

    it("requires policy review for stale pilot user and prevents favourite mutation", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "pilot-user-1" } }, error: null });
      // Stale policy acceptance
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await toggleFavouriteAction("listing-123");
      expect(result.success).toBe(false);
      expect(result.requiresPolicyReview).toBe(true);
      expect(result.redirectTo).toBe("/account/policy-review?next=%2Flistings%2Flisting-123");
      // Must not query or mutate favourites table
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("allows favourite mutation when user has current policy acceptance", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "current-user-1" } }, error: null });
      // Current policy acceptance
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      // Mock existing check returning null (not favourited yet)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock listing visibility check
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      // Mock insert
      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const result = await toggleFavouriteAction("listing-123");
      expect(result.success).toBe(true);
      expect(result.isFavourited).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("startConversationAction", () => {
    it("requires policy review for stale pilot user and prevents conversation creation", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "pilot-user-1" } }, error: null });
      // Stale policy acceptance
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await startConversationAction(
        "listing-456",
        "Hi, is this still available?",
        "req-uuid-1"
      );
      expect(result.requiresPolicyReview).toBe(true);
      expect(result.redirectTo).toBe("/account/policy-review?next=%2Flistings%2Flisting-456");
      // Must not call start_conversation RPC
      expect(mockRpc).not.toHaveBeenCalledWith("start_conversation", expect.anything());
    });

    it("allows conversation creation when user has current policy acceptance", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "current-user-1" } }, error: null });
      // Current policy acceptance
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      // start_conversation RPC succeeds
      mockRpc.mockResolvedValueOnce({
        data: { conversation_id: "conv-789" },
        error: null,
      });

      const result = await startConversationAction(
        "listing-456",
        "Hi, is this still available?",
        "req-uuid-1"
      );
      expect(result.success).toBe(true);
      expect(result.conversationId).toBe("conv-789");
    });
  });

  describe("Additional Authenticated Mutation Guards", () => {
    it("removeFavouriteAction requires policy review for stale pilot user", async () => {
      const { removeFavouriteAction } = await import("@/app/account/favourites/actions");
      mockGetUser.mockResolvedValue({ data: { user: { id: "pilot-user-1" } }, error: null });
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await removeFavouriteAction("listing-123");
      expect(result.success).toBe(false);
      expect(result.requiresPolicyReview).toBe(true);
      expect(result.redirectTo).toBe("/account/policy-review?next=%2Faccount%2Ffavourites");
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("markConversationReadAction requires policy review for stale pilot user", async () => {
      const { markConversationReadAction } = await import("@/app/account/messages/actions");
      mockGetUser.mockResolvedValue({ data: { user: { id: "pilot-user-1" } }, error: null });
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await markConversationReadAction("conv-123", "msg-123");
      expect(result.requiresPolicyReview).toBe(true);
      expect(result.redirectTo).toBe("/account/policy-review?next=%2Faccount%2Fmessages%2Fconv-123");
      expect(mockRpc).not.toHaveBeenCalledWith("mark_conversation_read", expect.anything());
    });

    it("unblockUserAction requires policy review for stale pilot user", async () => {
      const { unblockUserAction } = await import("@/app/account/messages/actions");
      mockGetUser.mockResolvedValue({ data: { user: { id: "pilot-user-1" } }, error: null });
      mockRpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await unblockUserAction("blocked-user-id");
      expect(result.requiresPolicyReview).toBe(true);
      expect(result.redirectTo).toBe("/account/policy-review?next=%2Faccount%2Fmessages");
      expect(mockRpc).not.toHaveBeenCalledWith("unblock_user", expect.anything());
    });
  });
});
