import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ModerationStatusBadge } from "../app/account/listings/ModerationStatusBadge";

// Mock Supabase client
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

describe("ModerationStatusBadge Backward Compatibility & Safety Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_ENHANCED_MODERATION_STATUS;
  });

  it("renders standard Under Review badge and does NOT call RPC when enhanced moderation is disabled (default)", () => {
    render(<ModerationStatusBadge listingId="listing-123" initialStatus="pending_review" />);

    expect(screen.getByText("Under Review")).toBeDefined();
    expect(screen.queryByText("Checking...")).toBeNull();
    expect(screen.queryByText(/being checked automatically/i)).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("gracefully falls back to Under Review when enhanced moderation is enabled but database RPC is missing (PGRST202)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function get_seller_moderation_workflow_status" },
    });

    render(
      <ModerationStatusBadge
        listingId="listing-456"
        initialStatus="pending_review"
        enhancedModerationEnabled={true}
      />
    );

    // Initial render while in flight
    expect(screen.getByText("Checking...")).toBeDefined();

    // After RPC rejection resolves
    const fallbackBadge = await screen.findByText("Under Review");
    expect(fallbackBadge).toBeDefined();
    expect(screen.queryByText(/Status temporarily unavailable/i)).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith("get_seller_moderation_workflow_status", { listing_id: "listing-456" });
  });

  it("does not render badge for non-pending_review states when idle", () => {
    const { container } = render(
      <ModerationStatusBadge listingId="listing-789" initialStatus="active" />
    );
    expect(container.firstChild).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
