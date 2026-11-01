import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_FAVOURITES_KEY, addGuestFavourite, clearGuestFavourites, getGuestFavourites, parseStoredIds,
  removeGuestFavourite, removeGuestFavourites, resetGuestFavouritesForTests, isGuestStoragePersistent,
} from "@/lib/favourites/guest";
import { FavouriteButton } from "@/components/listings/FavouriteButton";
import { GuestSaveNotice } from "@/components/favourites/GuestSaveNotice";

const authState = vi.hoisted(() => ({ value: { user: null as null | { id: string }, isLoading: false } }));
const toggle = vi.hoisted(() => vi.fn());
vi.mock("@/components/providers/AuthProvider", () => ({ useOptionalAuth: () => authState.value }));
vi.mock("@/app/account/favourites/actions", () => ({ toggleFavouriteAction: toggle }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeEach(() => {
  window.localStorage.clear();
  resetGuestFavouritesForTests();
  authState.value = { user: null, isLoading: false };
  toggle.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("guest favourites store", () => {
  it("saves, persists across a simulated refresh and removes", () => {
    expect(addGuestFavourite(id(1))).toEqual({ ok: true });
    expect(JSON.parse(window.localStorage.getItem(GUEST_FAVOURITES_KEY)!)).toEqual([id(1)]);
    resetGuestFavouritesForTests(); // new page load: nothing in memory
    expect(getGuestFavourites()).toEqual([id(1)]);
    removeGuestFavourite(id(1));
    expect(getGuestFavourites()).toEqual([]);
    expect(window.localStorage.getItem(GUEST_FAVOURITES_KEY)).toBeNull();
  });

  it("returns a referentially stable snapshot until something changes", () => {
    addGuestFavourite(id(1));
    expect(getGuestFavourites()).toBe(getGuestFavourites());
    const before = getGuestFavourites();
    addGuestFavourite(id(2));
    expect(getGuestFavourites()).not.toBe(before);
  });

  it("stores only ids and rejects anything that is not a uuid", () => {
    expect(addGuestFavourite("javascript:alert(1)")).toEqual({ ok: false, reason: "invalid" });
    addGuestFavourite(id(1));
    expect(window.localStorage.getItem(GUEST_FAVOURITES_KEY)).toBe(JSON.stringify([id(1)]));
  });

  it("caps at 50 and reports the limit instead of dropping a save silently", () => {
    for (let i = 1; i <= 50; i++) expect(addGuestFavourite(id(i)).ok).toBe(true);
    expect(addGuestFavourite(id(51))).toEqual({ ok: false, reason: "limit" });
    expect(getGuestFavourites()).toHaveLength(50);
  });

  it("de-duplicates", () => {
    addGuestFavourite(id(1));
    addGuestFavourite(id(1).toUpperCase());
    expect(getGuestFavourites()).toEqual([id(1)]);
  });

  it("survives malformed storage", () => {
    for (const raw of ["{not json", "42", "{\"a\":1}", JSON.stringify([1, null, "x", id(1), id(1)]), "[]"]) {
      expect(() => parseStoredIds(raw)).not.toThrow();
    }
    expect(parseStoredIds(JSON.stringify([1, null, "x", id(1), id(1)]))).toEqual([id(1)]);
    window.localStorage.setItem(GUEST_FAVOURITES_KEY, "{not json");
    expect(getGuestFavourites()).toEqual([]);
    expect(parseStoredIds(JSON.stringify(Array.from({ length: 80 }, (_, i) => id(i + 1))))).toHaveLength(50);
  });

  it("falls back to memory when storage is blocked and says saves are not persistent", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(addGuestFavourite(id(1))).toEqual({ ok: true });
    expect(getGuestFavourites()).toEqual([id(1)]);
    expect(isGuestStoragePersistent()).toBe(false);
  });

  it("falls back to memory when only writing fails (quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    addGuestFavourite(id(1));
    expect(getGuestFavourites()).toEqual([id(1)]);
    expect(isGuestStoragePersistent()).toBe(false);
  });

  it("removes several ids and clears", () => {
    addGuestFavourite(id(1)); addGuestFavourite(id(2)); addGuestFavourite(id(3));
    removeGuestFavourites([id(1), id(3)]);
    expect(getGuestFavourites()).toEqual([id(2)]);
    clearGuestFavourites();
    expect(getGuestFavourites()).toEqual([]);
  });
});

describe("FavouriteButton", () => {
  it("saves on this device for a guest without calling the account action or redirecting", () => {
    render(<FavouriteButton listingId={id(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Save on this device" }));
    expect(toggle).not.toHaveBeenCalled();
    expect(getGuestFavourites()).toEqual([id(1)]);
    expect(screen.getByRole("button", { name: "Remove from saved on this device" })).toHaveAttribute("aria-pressed", "true");
  });

  it("does nothing while auth is still loading (not treated as a guest)", () => {
    authState.value = { user: null, isLoading: true };
    render(<FavouriteButton listingId={id(1)} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(getGuestFavourites()).toEqual([]);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("uses the account action for a signed-in user and never writes device storage", async () => {
    authState.value = { user: { id: "u1" }, isLoading: false };
    toggle.mockResolvedValue({ success: true, isFavourited: true });
    render(<FavouriteButton listingId={id(1)} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save to favourites" })); });
    expect(toggle).toHaveBeenCalledWith(id(1));
    expect(getGuestFavourites()).toEqual([]);
  });

  it("device mode stays on the device even when signed in (the /saved page)", () => {
    authState.value = { user: { id: "u1" }, isLoading: false };
    render(<FavouriteButton listingId={id(1)} store="device" />);
    fireEvent.click(screen.getByRole("button", { name: "Save on this device" }));
    expect(toggle).not.toHaveBeenCalled();
    expect(getGuestFavourites()).toEqual([id(1)]);
  });

  it("does not leak device saves into a later signed-in session's account state", () => {
    addGuestFavourite(id(1));
    authState.value = { user: { id: "u2" }, isLoading: false };
    render(<FavouriteButton listingId={id(1)} />);
    expect(screen.getByRole("button", { name: "Save to favourites" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("GuestSaveNotice", () => {
  it("announces a save with a link to /saved only after the guest acts, and explains the cap", () => {
    render(<><GuestSaveNotice /><FavouriteButton listingId={id(1)} /></>);
    expect(screen.queryByRole("link", { name: "View saved" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save on this device" }));
    expect(screen.getByTestId("guest-save-notice").textContent).toMatch(/Saved on this device/);
    expect(screen.getByRole("link", { name: "View saved" })).toHaveAttribute("href", "/saved");
  });

  it("explains the limit when the 50 cap is hit", () => {
    for (let i = 2; i <= 51; i++) addGuestFavourite(id(i));
    render(<><GuestSaveNotice /><FavouriteButton listingId={id(1)} /></>);
    fireEvent.click(screen.getByRole("button", { name: "Save on this device" }));
    expect(screen.getByTestId("guest-save-notice").textContent).toMatch(/up to 50/);
  });
});
