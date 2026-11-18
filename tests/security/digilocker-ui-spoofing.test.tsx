import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const idv = { value: { status: "not_started", badge_issued: false } as Record<string, unknown> };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u-unverified" } }, error: null }) },
    rpc: async (fn: string) => (fn === "get_my_identity_verification" ? { data: idv.value, error: null } : { data: null, error: null }),
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); } }));

import { DigiLockerVerification } from "@/components/account/DigiLockerVerification";
import VerificationPage from "@/app/account/verification/page";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";

const en = digiLockerCopy.en;

beforeEach(() => { process.env.FAIRSWAP_DIGILOCKER_ENABLED = "true"; idv.value = { status: "not_started", badge_issued: false }; });
afterEach(() => { cleanup(); delete process.env.FAIRSWAP_DIGILOCKER_ENABLED; });

describe("Verified UI cannot be spoofed by the callback query", () => {
  it("component: dl=verified on an unverified account shows a neutral notice, never the Verified state", () => {
    render(<DigiLockerVerification verified={false} result="verified" />);
    expect(screen.queryByText(en.verified)).toBeNull();
    expect(screen.getByRole("button", { name: en.button })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(en.pending);
  });

  it("page: /account/verification?dl=verified for an unverified account renders unverified", async () => {
    const ui = await VerificationPage({ searchParams: Promise.resolve({ dl: "verified" }) });
    render(ui);
    expect(screen.queryByText(en.verified)).toBeNull();
    expect(screen.getByRole("button", { name: en.button })).toBeTruthy();
  });

  it("page: forged dl values and a revoked/expired backend record never show Verified", async () => {
    for (const record of [
      { status: "revoked", badge_issued: false },
      { status: "verified", badge_issued: false },
      { status: "verified", badge_issued: true, valid_until: "2000-01-01T00:00:00Z" },
    ]) {
      idv.value = record;
      const ui = await VerificationPage({ searchParams: Promise.resolve({ dl: "verified" }) });
      render(ui);
      expect(screen.queryByText(en.verified)).toBeNull();
      cleanup();
    }
  });

  it("page: only the authenticated backend status shows Verified", async () => {
    idv.value = { status: "verified", badge_issued: true, valid_until: null };
    render(await VerificationPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(en.verified)).toBeTruthy();
  });
});

describe("privacy copy", () => {
  it("states FairSwap uses only the identifier and keeps no other details, without claiming the provider sends only the ID", () => {
    expect(en.body).toMatch(/uses only your DigiLocker account identifier/);
    expect(en.body).toMatch(/does not keep the other details/);
    expect(en.body).not.toMatch(/only receive/i);
    expect(digiLockerCopy.hi.body).toContain("केवल आपके DigiLocker खाता पहचानकर्ता");
    expect(digiLockerCopy.hi.body).toContain("बाकी जानकारी नहीं रखता");
    expect(digiLockerCopy.hi.body).not.toContain("हमें केवल");
    expect(digiLockerCopy.hi.pending.length).toBeGreaterThan(10);
  });
});
