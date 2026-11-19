import React from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...r}>{children}</a> }));

import { DigiLockerBadge, DIGILOCKER_BADGE_LABEL, DIGILOCKER_ICON_SRC } from "@/components/idv/DigiLockerBadge";
import { GateAwareError } from "@/components/idv/IdentityRequiredCta";
import { DigiLockerVerification } from "@/components/account/DigiLockerVerification";
import { digiLockerCopy } from "@/lib/idv/digilocker-copy";
import { resultForBackend } from "@/lib/idv/digilocker";
import {
  DIGILOCKER_BADGE_MAX_IDS,
  getDigiLockerBadgeUserIds,
  hasDigiLockerBadge,
  isMyDigiLockerVerified,
} from "@/lib/idv/digilocker-badge-server";
import { IDENTITY_REQUIRED_MESSAGE, IDENTITY_VERIFY_URL } from "@/lib/idv/gate";

afterEach(cleanup);

describe("DigiLocker badge", () => {
  it("uses the exact wording with the DigiLocker logo and no subtitle", () => {
    const { container } = render(<DigiLockerBadge />);
    expect(DIGILOCKER_BADGE_LABEL).toBe("Verified with DigiLocker");
    expect(container.textContent).toBe("Verified with DigiLocker");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(DIGILOCKER_ICON_SRC);
    expect(DIGILOCKER_ICON_SRC).toBe("/brand/digilocker-icon.png");
    expect(existsSync(join(process.cwd(), "public", DIGILOCKER_ICON_SRC))).toBe(true);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.textContent).not.toMatch(/your documents|anytime/i);
    expect(container.textContent).not.toMatch(/aadhaar/i);
  });
  it("account page shows only the badge when the database says verified, in both locales", () => {
    for (const locale of ["en", "hi"] as const) {
      const { container, unmount } = render(<DigiLockerVerification verified locale={locale} />);
      expect(container.textContent).toBe("Verified with DigiLocker");
      expect(digiLockerCopy[locale].verified).toBe("Verified with DigiLocker");
      unmount();
    }
  });
  it("never uses the label 'Aadhaar Verified' anywhere in the copy", () => {
    expect(JSON.stringify(digiLockerCopy)).not.toMatch(/aadhaar verified/i);
  });
});

describe("not-confirmed result mapping", () => {
  it("maps invalid tokens, provider rejection and the legacy assurance code to a no-badge result", () => {
    for (const code of ["ID_TOKEN_INVALID", "PROVIDER_REJECTED", "ASSURANCE_NOT_PROVEN"]) {
      expect(resultForBackend(false, code)).toBe("not_confirmed");
    }
    for (const locale of ["en", "hi"] as const) {
      const keys = Object.keys(digiLockerCopy[locale].results);
      expect(keys).toContain("not_confirmed");
      expect(keys).not.toContain("assurance_failed");
    }
    expect(digiLockerCopy.en.results.not_confirmed).toBe(
      "We could not confirm your DigiLocker sign-in, so nothing was verified and no badge was added. Please try again.",
    );
    expect(digiLockerCopy.hi.results.not_confirmed).toBe(
      "हम आपके DigiLocker साइन-इन की पुष्टि नहीं कर सके, इसलिए कुछ भी सत्यापित नहीं हुआ और कोई बैज नहीं जोड़ा गया। कृपया फिर से प्रयास करें।",
    );
    const all = JSON.stringify(digiLockerCopy.en.results) + JSON.stringify(digiLockerCopy.hi.results);
    expect(all).not.toMatch(/required checks|आवश्यक जाँच|kyc/i);
  });
  it("renders the not-confirmed copy without a badge", () => {
    const { container } = render(<DigiLockerVerification verified={false} result="not_confirmed" locale="en" />);
    expect(container.textContent).toContain(digiLockerCopy.en.results.not_confirmed);
    expect(container.textContent).not.toContain("Verified with DigiLocker");
  });
});

describe("dl query parameter is never proof", () => {
  it("?dl=verified alone never renders the badge, in both locales", () => {
    for (const locale of ["en", "hi"] as const) {
      const { container, unmount } = render(<DigiLockerVerification verified={false} result="verified" locale={locale} />);
      expect(container.querySelector('img[src="/brand/digilocker-icon.png"]')).toBeNull();
      expect(container.textContent).not.toContain("Verified with DigiLocker");
      expect(container.textContent).toContain(digiLockerCopy[locale].pending);
      unmount();
    }
  });
});

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const rpcClient = (impl: (fn: string, args?: Record<string, unknown>) => unknown) => {
  const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => impl(fn, args) as { data: unknown; error: unknown });
  return { rpc };
};
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

describe("server-authoritative DigiLocker badge helper", () => {
  it("returns only ids the RPC confirms and that were requested", async () => {
    const c = rpcClient(() => ({ data: [A, C, "44444444-4444-4444-8444-444444444444"], error: null }));
    const ids = await getDigiLockerBadgeUserIds(c, [A, B, C]);
    expect([...ids].sort()).toEqual([A, C]);
    expect(c.rpc).toHaveBeenCalledWith("get_digilocker_badges", { p_user_ids: [A, B, C] });
  });
  it("accepts object rows keyed by the function name", async () => {
    const c = rpcClient(() => ({ data: [{ get_digilocker_badges: B }], error: null }));
    expect([...(await getDigiLockerBadgeUserIds(c, [A, B]))]).toEqual([B]);
  });
  it("fails closed on rpc error, malformed data or a thrown error", async () => {
    const cases = [
      rpcClient(() => ({ data: [A], error: { message: "boom" } })),
      rpcClient(() => ({ data: null, error: null })),
      rpcClient(() => ({ data: { [A]: true }, error: null })),
      rpcClient(() => ({ data: A, error: null })),
      rpcClient(() => ({ data: [A, 42], error: null })),
      rpcClient(() => ({ data: [{ user_id: A }], error: null })),
      rpcClient(() => { throw new Error("network"); }),
    ];
    for (const c of cases) {
      expect((await getDigiLockerBadgeUserIds(c, [A])).size).toBe(0);
      expect(await hasDigiLockerBadge(c, A)).toBe(false);
    }
    expect((await getDigiLockerBadgeUserIds({}, [A])).size).toBe(0);
    expect((await getDigiLockerBadgeUserIds(null, [A])).size).toBe(0);
  });
  it("makes no call for empty or all-invalid input and drops non-UUID ids", async () => {
    const c = rpcClient(() => ({ data: [A], error: null }));
    expect((await getDigiLockerBadgeUserIds(c, [])).size).toBe(0);
    expect((await getDigiLockerBadgeUserIds(c, ["not-a-uuid", "", "1 OR 1=1"])).size).toBe(0);
    expect(c.rpc).not.toHaveBeenCalled();
    await getDigiLockerBadgeUserIds(c, ["x", A, A, "' or 1=1 --"]);
    expect(c.rpc).toHaveBeenCalledWith("get_digilocker_badges", { p_user_ids: [A] });
    expect(await hasDigiLockerBadge(c, null)).toBe(false);
  });
  it("caps a request at 100 ids", async () => {
    const c = rpcClient(() => ({ data: [], error: null }));
    const many = Array.from({ length: 150 }, (_, i) => uuid(i + 1));
    await getDigiLockerBadgeUserIds(c, many);
    const sent = (c.rpc.mock.calls[0][1] as { p_user_ids: string[] }).p_user_ids;
    expect(DIGILOCKER_BADGE_MAX_IDS).toBe(100);
    expect(sent).toHaveLength(100);
    expect(sent).toEqual(many.slice(0, 100));
  });
  it("own verification comes only from get_my_marketplace_access().digilocker_verified === true", async () => {
    const ok = rpcClient(() => ({ data: { digilocker_verified: true, identity_verified: true }, error: null }));
    expect(await isMyDigiLockerVerified(ok)).toBe(true);
    expect(ok.rpc).toHaveBeenCalledWith("get_my_marketplace_access");
    for (const c of [
      rpcClient(() => ({ data: { identity_verified: true }, error: null })),
      rpcClient(() => ({ data: { digilocker_verified: "true" }, error: null })),
      rpcClient(() => ({ data: { digilocker_verified: true }, error: { message: "x" } })),
      rpcClient(() => ({ data: null, error: null })),
      rpcClient(() => { throw new Error("x"); }),
    ]) expect(await isMyDigiLockerVerified(c)).toBe(false);
  });
});

describe("badge is never derived from user_identity_verifications", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("public pages and the account DigiLocker branch use the server-authoritative helper", () => {
    for (const p of ["src/app/listings/[slug]/page.tsx", "src/app/seller/[id]/page.tsx", "src/lib/idv/digilocker-badge-server.ts"]) {
      const code = src(p);
      expect(code).not.toMatch(/\.from\(\s*["']user_identity_verifications["']/);
      expect(code).not.toMatch(/isBadgeValid/);
    }
    expect(src("src/app/listings/[slug]/page.tsx")).toMatch(/hasDigiLockerBadge\(supabase, listing\.seller_id\)/);
    expect(src("src/app/seller/[id]/page.tsx")).toMatch(/hasDigiLockerBadge\(supabase, id\)/);
    const account = src("src/app/account/verification/page.tsx");
    const dlBranch = account.slice(account.indexOf("if (isDigiLockerEnabled())"), account.indexOf("FAIRSWAP_IDV_ENABLED"));
    expect(dlBranch).toMatch(/isMyDigiLockerVerified\(supabase\)/);
    expect(dlBranch).not.toMatch(/get_my_identity_verification|\bdl\b\s*===/);
  });
});

describe("gate CTA", () => {
  it("replaces the gate error with a Verify with DigiLocker link; other errors stay plain", () => {
    const { container } = render(<GateAwareError message={IDENTITY_REQUIRED_MESSAGE} />);
    expect(screen.getByRole("link", { name: "Verify with DigiLocker" }).getAttribute("href")).toBe(IDENTITY_VERIFY_URL);
    cleanup();
    const plain = render(<GateAwareError message="Something else" />);
    expect(plain.container.textContent).toBe("Something else");
    expect(plain.container.querySelector("a")).toBeNull();
    expect(container).toBeTruthy();
  });
});
