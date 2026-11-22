import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const rpcState = { access: { data: { digilocker_verified: false } as unknown, error: null as unknown }, throws: false, calls: [] as string[] };
const cookie = { value: undefined as string | undefined };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-1", email: "a@example.com" } }, error: null }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            table === "user_accounts" ? { data: { user_id: "u-1", account_status: "active" }, error: null } : { data: null, error: null },
        }),
      }),
    }),
    rpc: async (fn: string) => {
      rpcState.calls.push(fn);
      if (fn === "get_my_marketplace_access") {
        if (rpcState.throws) throw new Error("boom");
        return rpcState.access;
      }
      return { data: { exists: true, onboarding_completed: true }, error: null };
    },
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (n === "NEXT_LOCALE" && cookie.value ? { value: cookie.value } : undefined) }) }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

import AccountPage from "@/app/account/page";
import VerificationPage from "@/app/account/verification/page";
import { VerificationBanner } from "@/components/account/VerificationBanner";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";

const en = digiLockerCopy.en;
const hi = digiLockerCopy.hi;

beforeEach(() => {
  process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true";
  rpcState.access = { data: { digilocker_verified: false }, error: null };
  rpcState.throws = false;
  rpcState.calls = [];
  cookie.value = undefined;
});
afterEach(() => {
  cleanup();
  delete process.env.FAIRSWAP_DIGILOCKER_ENABLED;
});

async function renderAccount() {
  render(await AccountPage());
  return screen.getByRole("region", { name: /DigiLocker/ });
}

describe("Account DigiLocker banner is server-derived", () => {
  it("enabled + unverified: CTA links to /account/verification, no badge", async () => {
    const banner = await renderAccount();
    const link = within(banner).getByRole("link", { name: en.button });
    expect(link).toHaveAttribute("href", "/account/verification");
    expect(within(banner).queryByText(en.verified)).toBeNull();
    expect(banner.querySelectorAll("p")).toHaveLength(0);
    expect(banner.textContent).not.toMatch(/coming soon/i);
  });

  it("enabled + verified: exact badge label with icon, no subtitle and no CTA", async () => {
    rpcState.access = { data: { digilocker_verified: true }, error: null };
    const banner = await renderAccount();
    expect(within(banner).getByText("Verified with DigiLocker")).toBeInTheDocument();
    expect(banner.querySelector('img[src="/brand/digilocker-icon.png"]')).not.toBeNull();
    expect(banner.querySelectorAll("p")).toHaveLength(0);
    expect(within(banner).queryByRole("link")).toBeNull();
  });

  it("disabled: honest wording, no CTA, no badge and the Backend badge RPC is not consulted", async () => {
    delete process.env.FAIRSWAP_DIGILOCKER_ENABLED;
    rpcState.access = { data: { digilocker_verified: true }, error: null };
    const banner = await renderAccount();
    expect(within(banner).getByText(en.bannerUnavailable)).toBeInTheDocument();
    expect(within(banner).queryByRole("link")).toBeNull();
    expect(within(banner).queryByText(en.verified)).toBeNull();
    expect(rpcState.calls).not.toContain("get_my_marketplace_access");
  });

  it("RPC failure (error, throw, malformed) fails closed: no badge, no CTA, neutral message", async () => {
    const failures: Array<() => void> = [
      () => { rpcState.access = { data: null, error: { message: "db down" } }; },
      () => { rpcState.throws = true; },
      () => { rpcState.access = { data: [true], error: null }; },
    ];
    for (const arrange of failures) {
      rpcState.access = { data: { digilocker_verified: false }, error: null };
      rpcState.throws = false;
      arrange();
      const banner = await renderAccount();
      expect(within(banner).getByText(en.bannerUnknown)).toBeInTheDocument();
      expect(within(banner).queryByText(en.verified)).toBeNull();
      expect(within(banner).queryByRole("link")).toBeNull();
      cleanup();
    }
  });

  it("only a strict boolean true shows the badge", async () => {
    for (const value of [{ digilocker_verified: "true" }, { digilocker_verified: 1 }, { identity_verified: true }]) {
      rpcState.access = { data: value, error: null };
      const banner = await renderAccount();
      expect(within(banner).queryByText(en.verified)).toBeNull();
      cleanup();
    }
  });

  it("callback spoofing: ?dl=verified never grants the badge on the verification page or the banner", async () => {
    render(await VerificationPage({ searchParams: Promise.resolve({ dl: "verified" }) }));
    expect(screen.queryByText(en.verified)).toBeNull();
    cleanup();
    const banner = await renderAccount();
    expect(within(banner).queryByText(en.verified)).toBeNull();
  });

  it("verification page with the flag off shows unavailable, never the legacy document hub", async () => {
    delete process.env.FAIRSWAP_DIGILOCKER_ENABLED;
    render(await VerificationPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(en.unavailable)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.body.textContent).not.toMatch(/aadhaar|passport/i);
  });

  it("Hindi cookie renders Hindi banner copy", async () => {
    cookie.value = "hi";
    const banner = await renderAccount();
    expect(within(banner).getByRole("link", { name: hi.button })).toHaveAttribute("href", "/account/verification");
  });
});

describe("Banner copy and rendering", () => {
  it("active copy makes no mandatory-posting or document-check claims", () => {
    for (const locale of ["en", "hi"] as const) {
      const c = digiLockerCopy[locale];
      const text = [c.required, c.bannerBody, c.bannerUnavailable, c.bannerUnknown].join(" ");
      expect(text).not.toMatch(/post ads|make offers|message other|विज्ञापन डालने/i);
    }
  });

  it("mobile-friendly: CTA is full width with a 44px touch target and the layout stacks", () => {
    render(<VerificationBanner state="unverified" />);
    const link = screen.getByRole("link", { name: en.button });
    expect(link.className).toContain("min-h-[44px]");
    expect(link.className).toContain("max-sm:w-full");
    expect(screen.getByRole("region").className).toContain("flex-col");
  });
});
