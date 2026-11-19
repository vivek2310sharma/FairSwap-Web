import React from "react";
import { existsSync } from "node:fs";
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

describe("assurance failure mapping", () => {
  it("maps unproven assurance and invalid tokens to a no-badge result", () => {
    expect(resultForBackend(false, "ASSURANCE_NOT_PROVEN")).toBe("assurance_failed");
    expect(resultForBackend(false, "ID_TOKEN_INVALID")).toBe("assurance_failed");
    expect(Object.keys(digiLockerCopy.en.results)).toContain("assurance_failed");
    expect(Object.keys(digiLockerCopy.hi.results)).toContain("assurance_failed");
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
