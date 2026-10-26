import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ListingActionsContainer } from "@/app/account/listings/ListingActionsContainer";
import { resolveListingActions } from "@/lib/listings/action-matrix";
import { ids } from "./ratings-fixtures";
const m = vi.hoisted(() => ({ push: vi.fn(), transition: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: vi.fn() }) }));
vi.mock("@/app/account/listings/actions", () => ({ submitListingAction: vi.fn(), transitionListingAction: m.transition }));
afterEach(cleanup);
it("enabled sold menu opens selection before any mutation", () => {
  render(<ListingActionsContainer listingId={ids.listing} ratingsAvailable actions={resolveListingActions({ id: ids.listing, status: "active", renewal_count: 0 })} />);
  fireEvent.click(screen.getByRole("button", { name: "Mark as sold" }));
  expect(m.push).toHaveBeenCalledWith(`/account/ratings/sell?listing_id=${ids.listing}`);
  expect(m.transition).not.toHaveBeenCalled(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
