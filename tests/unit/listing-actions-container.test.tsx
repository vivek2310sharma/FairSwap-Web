import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/react";
import { ListingActionsContainer } from "@/app/account/listings/ListingActionsContainer";
import { resolveListingActions } from "@/lib/listings/action-matrix";

const mockTransition = vi.fn();
const mockSubmit = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/app/account/listings/actions", () => ({
  transitionListingAction: (...args: unknown[]) => mockTransition(...args),
  submitListingAction: (...args: unknown[]) => mockSubmit(...args),
}));

describe("ListingActionsContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders primary link action for DRAFT listing", () => {
    const actions = resolveListingActions({
      id: "draft-1",
      slug: "draft-item",
      status: "draft",
      renewal_count: 0,
      propertyDraft: false,
    });

    render(<ListingActionsContainer listingId="draft-1" actions={actions} />);

    const primaryLink = screen.getByRole("link", { name: "Continue editing" });
    expect(primaryLink).toBeInTheDocument();
    expect(primaryLink).toHaveAttribute("href", "/account/listings/draft-1/edit");
  });

  it("opens overflow menu and lists secondary actions", () => {
    const actions = resolveListingActions({
      id: "active-1",
      slug: "active-item",
      status: "active",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="active-1" actions={actions} />);

    const menuButton = screen.getByRole("button", { name: "More actions" });
    expect(menuButton).toBeInTheDocument();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mark reserved" })).toBeInTheDocument();
  });

  it("does not render overflow menu button when secondary actions array is empty", () => {
    const actions = resolveListingActions({
      id: "rejected-1",
      slug: "rejected-item",
      status: "rejected",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="rejected-1" actions={actions} />);

    expect(screen.getByRole("link", { name: "Fix listing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("opens confirmation modal for Mark as Sold and invokes transition on Confirm", async () => {
    mockTransition.mockResolvedValueOnce({ success: true });

    const actions = resolveListingActions({
      id: "active-1",
      slug: "active-item",
      status: "active",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="active-1" actions={actions} />);

    const markSoldButton = screen.getByRole("button", { name: "Mark as sold" });
    fireEvent.click(markSoldButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Mark Listing as Sold?")).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockTransition).toHaveBeenCalledWith("active-1", "mark_sold");
    });
  });

  it("cancels confirmation modal on Cancel button click", () => {
    const actions = resolveListingActions({
      id: "active-1",
      slug: "active-item",
      status: "active",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="active-1" actions={actions} />);

    fireEvent.click(screen.getByRole("button", { name: "Mark as sold" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockTransition).not.toHaveBeenCalled();
  });
});
