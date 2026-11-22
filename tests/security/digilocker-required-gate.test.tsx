import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const m = vi.hoisted(() => ({
  access: { value: { verification_required: true, digilocker_verified: false, identity_verified: true } as unknown },
  user: { id: "u1" } as { id: string } | null,
  loadTaxonomy: vi.fn(), start: vi.fn(), push: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: m.user }, error: null }) },
    rpc: async (fn: string) => (fn === "get_my_marketplace_access" ? { data: m.access.value, error: null } : { data: null, error: null }),
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
  useRouter: () => ({ push: m.push }),
}));
vi.mock("@/lib/listings/taxonomy-v2-server", () => ({ loadTaxonomy: m.loadTaxonomy }));
vi.mock("@/lib/listings/ordinary-goods/server", () => ({ loadGoodsBindings: vi.fn(), loadGoodsDefinition: vi.fn() }));
vi.mock("@/lib/listings/posting-capabilities-server", () => ({ loadSpecialistBindings: vi.fn() }));
vi.mock("@/lib/listings/post-ad-locations", () => ({ loadPostAdLocations: vi.fn() }));
vi.mock("@/app/account/messages/actions", () => ({ startConversationAction: m.start }));

import NewListingPage from "@/app/account/listings/new/page";
import VerificationPage from "@/app/account/verification/page";
import { ContactSellerButton } from "@/components/listings/ContactSellerButton";
import { IdentityRequiredScreen } from "@/components/idv/IdentityRequiredScreen";
import { safeVerificationReturnPath, identityVerifyHref } from "@/lib/idv/return-path";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";

const en = digiLockerCopy.en;
beforeEach(() => {
  process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true";
  m.user = { id: "u1" };
  m.access.value = { verification_required: true, digilocker_verified: false, identity_verified: true };
  vi.clearAllMocks();
});
afterEach(() => { cleanup(); delete process.env.FAIRSWAP_DIGILOCKER_ENABLED; });

describe("IdentityRequiredScreen", () => {
  it.each([
    ["post", "Verify to post an ad", "Verify your FairSwap account with DigiLocker before posting an ad. This helps reduce fake listings and impersonation."],
    ["messages", "Verify to send messages", "Verify your FairSwap account with DigiLocker before contacting a seller or sending messages. This helps reduce fake accounts and fraud."],
  ] as const)("%s: exact title, text, official icon and fixed CTA", (context, title, body) => {
    const { container } = render(<IdentityRequiredScreen context={context} />);
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    expect(screen.getByText(body)).toBeTruthy();
    const link = screen.getByRole("link", { name: "Verify with DigiLocker" });
    expect(link.getAttribute("href")).toBe(`/account/verification?required=1&context=${context}`);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/brand/digilocker-icon.png");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.textContent).not.toMatch(/aadhaar|pan |escrow|kyc|payment protection|mitid/i);
  });

  it("carries only a validated same-origin return destination", () => {
    render(<IdentityRequiredScreen context="messages" returnTo="/account/messages/abc" />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/account/verification?required=1&context=messages&next=%2Faccount%2Fmessages%2Fabc");
  });

  it("Hindi reuses the app's locale and keeps the fixed button label", () => {
    render(<IdentityRequiredScreen context="post" locale="hi" />);
    expect(screen.getByRole("heading").textContent).toBe(digiLockerCopy.hi.gate.post.title);
    expect(screen.getByRole("link", { name: "Verify with DigiLocker" })).toBeTruthy();
  });
});

describe("return destination safety", () => {
  it.each([
    "https://evil.example/account/listings/new", "//evil.example", "/\\evil.example", "/account/listings/new/../../admin",
    "/admin", "/account/messages/", "/auth/sign-in", "javascript:alert(1)", "/account/listings/newer", "%2F%2Fevil.example", "",
  ])("rejects %j", (value) => expect(safeVerificationReturnPath(value)).toBeNull());
  it.each(["/account/listings/new", "/account/listings/new?macro=goods", "/account/messages/11111111-1111-4111-8111-111111111111", "/listings/blue-bike"])("accepts %s", (value) => expect(safeVerificationReturnPath(value)).toBe(value));
  it("drops an unsafe next from the CTA", () => expect(identityVerifyHref("post", "https://evil.example")).toBe("/account/verification?required=1&context=post"));
});

describe("Post Ad entry", () => {
  it("unverified signed-in user (even with generic identity_verified) sees the screen before any ad data loads", async () => {
    render(await NewListingPage({ searchParams: Promise.resolve({ macro: "goods" }) }));
    expect(screen.getByTestId("identity-required-screen")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Verify with DigiLocker" }).getAttribute("href")).toContain("next=%2Faccount%2Flistings%2Fnew%3Fmacro%3Dgoods");
    expect(m.loadTaxonomy).not.toHaveBeenCalled();
  });

  it("verified user and gate-off user proceed to the existing flow", async () => {
    for (const value of [{ verification_required: true, digilocker_verified: true }, { verification_required: false, digilocker_verified: false }]) {
      m.access.value = value;
      m.loadTaxonomy.mockClear();
      m.loadTaxonomy.mockResolvedValue(null);
      await NewListingPage({ searchParams: Promise.resolve({}) }).catch(() => undefined);
      expect(m.loadTaxonomy).toHaveBeenCalled();
    }
  });

  it("RPC failure does not show the screen or a badge (DB still refuses writes)", async () => {
    m.access.value = null;
    m.loadTaxonomy.mockResolvedValue(null);
    await NewListingPage({ searchParams: Promise.resolve({}) }).catch(() => undefined);
    expect(m.loadTaxonomy).toHaveBeenCalled();
  });
});

describe("Contact Seller", () => {
  it("unverified buyer sees the branded screen instead of the composer and no message is sent", () => {
    render(<ContactSellerButton sellerName="Asha" listingId="l1" identityRequired returnTo="/listings/bike" />);
    fireEvent.click(screen.getByRole("button", { name: /contact seller/i }));
    expect(screen.getByTestId("identity-required-screen")).toBeTruthy();
    expect(screen.queryByLabelText(/your message/i)).toBeNull();
    expect(m.start).not.toHaveBeenCalled();
  });

  it("verified buyer still gets the composer", () => {
    render(<ContactSellerButton sellerName="Asha" listingId="l1" />);
    fireEvent.click(screen.getByRole("button", { name: /contact seller/i }));
    expect(screen.getByLabelText(/your message/i)).toBeTruthy();
  });

  it("a Backend identity refusal after a stale page swaps in the screen", async () => {
    m.start.mockResolvedValue({ error: "x", redirectTo: "/account/verification?required=1" });
    render(<ContactSellerButton sellerName="Asha" listingId="l1" />);
    fireEvent.click(screen.getByRole("button", { name: /contact seller/i }));
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByTestId("identity-required-screen")).toBeTruthy());
    expect(m.push).not.toHaveBeenCalled();
  });

  it("an unrelated redirect (policy review) still navigates", async () => {
    m.start.mockResolvedValue({ redirectTo: "/account/policy-review" });
    render(<ContactSellerButton sellerName="Asha" listingId="l1" />);
    fireEvent.click(screen.getByRole("button", { name: /contact seller/i }));
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/account/policy-review"));
  });
});

describe("Verification page return", () => {
  it("verified account with a safe next shows Continue; forged dl or unsafe next never does", async () => {
    m.access.value = { digilocker_verified: true };
    render(await VerificationPage({ searchParams: Promise.resolve({ next: "/account/listings/new?macro=goods" }) }));
    await waitFor(() => expect(screen.getByRole("link", { name: en.continue }).getAttribute("href")).toBe("/account/listings/new?macro=goods"));
    cleanup();
    window.sessionStorage.clear();
    render(await VerificationPage({ searchParams: Promise.resolve({ next: "https://evil.example" }) }));
    expect(screen.queryByRole("link", { name: en.continue })).toBeNull();
    cleanup();
    // After the provider round trip the query is gone; only a validated stored destination is used.
    window.sessionStorage.setItem("fairswap.idv.returnTo", "https://evil.example");
    render(await VerificationPage({ searchParams: Promise.resolve({ dl: "verified" }) }));
    expect(screen.queryByRole("link", { name: en.continue })).toBeNull();
    cleanup();
    window.sessionStorage.setItem("fairswap.idv.returnTo", "/account/messages/abc");
    render(await VerificationPage({ searchParams: Promise.resolve({ dl: "verified" }) }));
    expect(screen.getByRole("link", { name: en.continue }).getAttribute("href")).toBe("/account/messages/abc");
    cleanup();
    window.sessionStorage.clear();
    m.access.value = { digilocker_verified: false, identity_verified: true };
    render(await VerificationPage({ searchParams: Promise.resolve({ dl: "verified", next: "/account/listings/new" }) }));
    expect(screen.queryByText(en.verified)).toBeNull();
    expect(screen.queryByRole("link", { name: en.continue })).toBeNull();
  });
});
