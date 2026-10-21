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

  it("handles keyboard navigation (Arrow keys and Escape) in overflow menu", () => {
    const actions = resolveListingActions({
      id: "active-1",
      slug: "active-item",
      status: "active",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="active-1" actions={actions} />);

    const menuButton = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(menuButton);

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(3);

    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("restores focus to persistent overflow trigger button when confirmation modal closes from secondary action", async () => {
    const actions = resolveListingActions({
      id: "paused-1",
      slug: "paused-item",
      status: "paused",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="paused-1" actions={actions} />);

    const menuButton = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(menuButton);

    const markSoldMenuItem = screen.getByRole("menuitem", { name: "Mark as sold" });
    fireEvent.click(markSoldMenuItem);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(menuButton);
  });

  it("displays action-specific mutation progress feedback when secondary action is in flight", async () => {
    let resolvePromise: (value: { success: boolean }) => void;
    const promise = new Promise<{ success: boolean }>((resolve) => {
      resolvePromise = resolve;
    });
    mockTransition.mockReturnValueOnce(promise);

    const actions = resolveListingActions({
      id: "active-1",
      slug: "active-item",
      status: "active",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="active-1" actions={actions} />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const pauseMenuItem = screen.getByRole("menuitem", { name: "Pause" });

    await act(async () => {
      fireEvent.click(pauseMenuItem);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Processing: Pause...");

    await act(async () => {
      resolvePromise!({ success: true });
    });
  });

  it("prevents duplicate submissions while an action is pending", async () => {
    let resolvePromise: (value: { success: boolean }) => void;
    const promise = new Promise<{ success: boolean }>((resolve) => {
      resolvePromise = resolve;
    });
    mockTransition.mockReturnValueOnce(promise);

    const actions = resolveListingActions({
      id: "paused-1",
      slug: "paused-item",
      status: "paused",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="paused-1" actions={actions} />);

    const resumeBtn = screen.getByRole("button", { name: "Resume" });

    await act(async () => {
      fireEvent.click(resumeBtn);
    });

    expect(resumeBtn).toBeDisabled();

    // Attempt duplicate click while pending
    fireEvent.click(resumeBtn);
    expect(mockTransition).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise!({ success: true });
    });
  });

  it("displays actionable error message when server action fails", async () => {
    mockTransition.mockResolvedValueOnce({ error: "Failed to transition listing." });

    const actions = resolveListingActions({
      id: "paused-1",
      slug: "paused-item",
      status: "paused",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="paused-1" actions={actions} />);

    const resumeBtn = screen.getByRole("button", { name: "Resume" });
    await act(async () => {
      fireEvent.click(resumeBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to transition listing.");
    });
  });

  it("handles policy reacceptance redirect when returned from server action", async () => {
    mockTransition.mockResolvedValueOnce({
      error: "Policy reacceptance required.",
      redirectTo: "/account/listings?policy_review=1",
    });

    const actions = resolveListingActions({
      id: "paused-1",
      slug: "paused-item",
      status: "paused",
      renewal_count: 0,
    });

    render(<ListingActionsContainer listingId="paused-1" actions={actions} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/account/listings?policy_review=1");
    });
  });
});
