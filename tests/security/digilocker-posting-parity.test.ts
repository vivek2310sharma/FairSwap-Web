import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { friendlyIdentityError, IDENTITY_REQUIRED_MESSAGE } from "@/lib/idv/gate";

const src = (p: string) => readFileSync(join(process.cwd(),p),"utf8");

describe("Production DigiLocker posting UX parity", () => {
  it("maps only the backend identity gate failure to the verification guidance", () => {
    expect(friendlyIdentityError("IDENTITY_VERIFICATION_REQUIRED")).toBe(IDENTITY_REQUIRED_MESSAGE);
    expect(friendlyIdentityError("PHOTO_LIMIT_REACHED")).toBeNull();
  });
  it("guards posting on the server before mutations while keeping database enforcement", () => {
    expect(src("src/lib/listings/posting-base-guard.ts")).toContain("await assertIdentityVerified(client)");
    for (const path of ["src/lib/listings/property/server.ts","src/lib/listings/two-wheeler/server.ts","src/app/account/listings/actions.ts"]) {
      expect(src(path)).toContain("friendlyIdentityError");
    }
  });
  it("media upload returns the specific 403 identity error, not a generic failure", () => {
    const s = src("src/app/api/listings/[id]/media/route.ts");
    expect(s).toContain('mediaApiError("IDENTITY_VERIFICATION_REQUIRED")');
    expect(src("src/lib/media/api-contract.ts")).toContain('"IDENTITY_VERIFICATION_REQUIRED"');
  });
  it("preserves the selected posting route through DigiLocker and handles stale contact-gate refusal", () => {
    expect(src("src/app/account/listings/new/page.tsx")).toContain("returnTo={returnTo}");
    expect(src("src/components/listings/ContactSellerButton.tsx")).toContain('result.redirectTo?.startsWith("/account/verification")');
  });
  it("both user-facing posting forms offer a DigiLocker action after backend refusal", () => {
    for(const p of ["src/components/listings/ListingForm.tsx","src/components/listings/MediaUploader.tsx"]) {
      expect(src(p)).toContain("<GateAwareError message=");
    }
  });
});
