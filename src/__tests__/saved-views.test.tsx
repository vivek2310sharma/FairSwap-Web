import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuestFavouritesView } from "@/components/favourites/GuestFavouritesView";
import { SyncGuestFavourites } from "@/components/favourites/SyncGuestFavourites";
import { addGuestFavourite, getGuestFavourites, resetGuestFavouritesForTests } from "@/lib/favourites/guest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const auth = vi.hoisted(() => ({ value: { user: null as null | { id: string }, isLoading: false } }));
const lookup = vi.hoisted(() => vi.fn());
const sync = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
vi.mock("@/components/providers/AuthProvider", () => ({ useOptionalAuth: () => auth.value }));
vi.mock("@/app/saved/actions", () => ({ getSavedListingsAction: lookup }));
vi.mock("@/app/account/favourites/actions", () => ({ toggleFavouriteAction: vi.fn(), syncGuestFavouritesAction: sync }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const card = (n: number) => ({ id: id(n), slug: `item-${n}`, title: `Item ${n}`, condition: "good", price_type: "fixed", price_paise: 100000, category: { name: "Furniture", slug: "furniture" }, city: { name: "Pune" }, locality: null, cover_photo: null });

beforeEach(() => {
  window.localStorage.clear();
  resetGuestFavouritesForTests();
  auth.value = { user: null, isLoading: false };
  lookup.mockReset(); sync.mockReset(); refresh.mockReset();
});

describe("GuestFavouritesView (/saved)", () => {
  it("shows an empty state without calling the server", () => {
    render(<GuestFavouritesView />);
    expect(screen.getByRole("heading", { name: "Nothing saved yet" })).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("labels the page as this device, renders returned cards and reports unavailable ones", async () => {
    addGuestFavourite(id(1)); addGuestFavourite(id(2));
    lookup.mockResolvedValue({ ok: true, listings: [card(1)], unavailableIds: [id(2)] });
    render(<GuestFavouritesView />);
    expect(screen.getByRole("heading", { name: "Saved on this device" })).toBeInTheDocument();
    expect(await screen.findByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText(/1 saved ad is no longer available/)).toBeInTheDocument();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup.mock.calls[0][0].sort()).toEqual([id(1), id(2)].sort());
    fireEvent.click(screen.getByRole("button", { name: "Remove from this device" }));
    expect(getGuestFavourites()).toEqual([id(1)]);
  });

  it("removing a card un-saves it on the device without refetching", async () => {
    addGuestFavourite(id(1));
    lookup.mockResolvedValue({ ok: true, listings: [card(1)], unavailableIds: [] });
    render(<GuestFavouritesView />);
    await screen.findByText("Item 1");
    fireEvent.click(screen.getByRole("button", { name: "Remove from saved on this device" }));
    await waitFor(() => expect(screen.queryByText("Item 1")).toBeNull());
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("shows an error and keeps the saves when the lookup fails", async () => {
    addGuestFavourite(id(1));
    lookup.mockResolvedValue({ ok: false, error: "Saved ads could not be loaded right now." });
    render(<GuestFavouritesView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(getGuestFavourites()).toEqual([id(1)]);
  });

  it("offers sign-in but never syncs by itself", async () => {
    addGuestFavourite(id(1));
    lookup.mockResolvedValue({ ok: true, listings: [card(1)], unavailableIds: [] });
    render(<GuestFavouritesView />);
    await screen.findByText("Item 1");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in?next=/account/favourites");
    expect(sync).not.toHaveBeenCalled();
  });
});

describe("SyncGuestFavourites (account page)", () => {
  it("renders nothing when the device has no saves", () => {
    const { container } = render(<SyncGuestFavourites />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not sync on render, only when the user presses the button, then clears just the synced ids", async () => {
    addGuestFavourite(id(1)); addGuestFavourite(id(2));
    sync.mockResolvedValue({ success: true, added: 1, alreadySaved: 0, skipped: 1, syncedIds: [id(1)], skippedIds: [id(2)] });
    render(<SyncGuestFavourites />);
    expect(sync).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Add to my account" })); });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync.mock.calls[0][0].sort()).toEqual([id(1), id(2)].sort());
    expect(getGuestFavourites()).toEqual([id(2)]);
    expect(screen.getByRole("status")).toHaveTextContent("1 added to your account");
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps every device save when the sync fails", async () => {
    addGuestFavourite(id(1));
    sync.mockResolvedValue({ success: false, error: "Could not sync saved ads" });
    render(<SyncGuestFavourites />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Add to my account" })); });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not sync");
    expect(getGuestFavourites()).toEqual([id(1)]);
  });

  it("lets a shared-device user discard the device saves instead of merging them", () => {
    addGuestFavourite(id(1));
    render(<SyncGuestFavourites />);
    fireEvent.click(screen.getByRole("button", { name: "Clear device saves" }));
    expect(getGuestFavourites()).toEqual([]);
    expect(sync).not.toHaveBeenCalled();
  });
});
