import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import NewListingPage from "@/app/account/listings/new/page";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(),
  createClient: vi.fn(), form: vi.fn(), maintenance: vi.fn(),
  redirect: vi.fn((target: string): never => { throw new Error(`REDIRECT:${target}`); }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/maintenance/seller-writes", () => ({
  isSellerWriteMaintenanceEnabled: mocks.maintenance,
  SELLER_WRITE_MAINTENANCE_MESSAGE: "Fixture maintenance pause",
}));
vi.mock("@/components/listings/ListingForm", () => ({
  default: (props: unknown) => { mocks.form(props); return <div data-testid="existing-form" />; },
}));

// Server component/auth/query doubles only; no listing action or real SDK imported.
describe("New-listing page auth return only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Network forbidden in page test"); }));
    mocks.maintenance.mockReturnValue(false);
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it.each([
    [{}, "/account/listings/new"],
    [{ macro: "goods" }, "/account/listings/new?macro=goods"],
    [{ macro: "vehicles" }, "/account/listings/new?macro=vehicles"],
    [{ macro: "property" }, "/account/listings/new?macro=property"],
    [{ macro: "" }, "/account/listings/new?macro="],
    [{ macro: "Goods" }, "/account/listings/new?macro=Goods"],
    [{ macro: ["goods", "goods"] }, "/account/listings/new?macro=goods&macro=goods"],
    [{ macro: ["goods", "vehicles"] }, "/account/listings/new?macro=goods&macro=vehicles"],
    [{ macro: "goods", filter: "a&b", absent: undefined }, "/account/listings/new?macro=goods&filter=a%26b"],
  ] satisfies Array<[Record<string, string | string[] | undefined>, string]>)(
    "serializes unauthenticated input %j without collapsing arrays", async (query, expected) => {
      await expect(NewListingPage({ searchParams: Promise.resolve(query) })).rejects.toThrow("REDIRECT:");
      const target = mocks.redirect.mock.calls[0][0];
      const redirectUrl = new URL(target, "https://fairswap.example");
      expect(redirectUrl.pathname).toBe("/auth/sign-in");
      expect(redirectUrl.searchParams.get("next")).toBe(expected);
      expect(redirectUrl.searchParams.getAll("next")).toHaveLength(1);
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.form).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it.each(["/\\evil.example", "bad\nvalue", "bad\rvalue", "bad\u0000value"])(
    "sanitizes unsafe return-query value %j", async (macro) => {
      await expect(NewListingPage({ searchParams: Promise.resolve({ macro }) })).rejects.toThrow("REDIRECT:");
      expect(new URL(mocks.redirect.mock.calls[0][0], "https://fairswap.example").searchParams.get("next"))
        .toBe("/account/listings/new");
    }
  );

  it.each([false, true])("redirects old signed-in creation routes with maintenance=%s", async (maintenance) => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-owner" } } });
    mocks.maintenance.mockReturnValue(maintenance);
    await expect(NewListingPage({ searchParams: Promise.resolve({ macro: ["goods", "vehicles"] }) })).rejects.toThrow("REDIRECT:/account/listings/new");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.form).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
