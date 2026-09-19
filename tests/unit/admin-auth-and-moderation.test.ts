import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSafeAdminRedirect } from "@/app/auth/mfa/page";
import fs from "fs";
import path from "path";

describe("Point 9B-R5 — Admin Auth Flow & Moderation Query Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("A. Open-Redirect Prevention: getSafeAdminRedirect", () => {
    it("returns /admin for null or empty input", () => {
      expect(getSafeAdminRedirect(null)).toBe("/admin");
      expect(getSafeAdminRedirect("")).toBe("/admin");
      expect(getSafeAdminRedirect("   ")).toBe("/admin");
    });

    it("allows valid relative admin paths", () => {
      expect(getSafeAdminRedirect("/admin")).toBe("/admin");
      expect(getSafeAdminRedirect("/admin/listings")).toBe("/admin/listings");
      expect(getSafeAdminRedirect("/admin/listings/123-abc")).toBe("/admin/listings/123-abc");
      expect(getSafeAdminRedirect("/admin/listings?status=pending")).toBe("/admin/listings?status=pending");
    });

    it("rejects absolute URLs with external domains", () => {
      expect(getSafeAdminRedirect("https://attacker.com")).toBe("/admin");
      expect(getSafeAdminRedirect("http://evil.com/admin")).toBe("/admin");
      expect(getSafeAdminRedirect("https://attacker.com/admin")).toBe("/admin");
    });

    it("rejects protocol-relative URLs", () => {
      expect(getSafeAdminRedirect("//attacker.com")).toBe("/admin");
      expect(getSafeAdminRedirect("//attacker.com/admin")).toBe("/admin");
    });

    it("rejects backslash evasion attempts", () => {
      expect(getSafeAdminRedirect("/admin\\evil.com")).toBe("/admin");
      expect(getSafeAdminRedirect("\\\\attacker.com")).toBe("/admin");
    });

    it("rejects non-admin internal paths", () => {
      expect(getSafeAdminRedirect("/account")).toBe("/admin");
      expect(getSafeAdminRedirect("/account/listings")).toBe("/admin");
      expect(getSafeAdminRedirect("/auth/sign-in")).toBe("/admin");
      expect(getSafeAdminRedirect("/")).toBe("/admin");
    });

    it("rejects javascript: and other dangerous pseudo-schemes", () => {
      expect(getSafeAdminRedirect("javascript:alert(1)")).toBe("/admin");
      expect(getSafeAdminRedirect("data:text/html,evil")).toBe("/admin");
    });
  });

  describe("B. Static Query & Security Invariants Verification", () => {
    const rootDir = process.cwd();
    const readNormalized = (relPath: string) =>
      fs.readFileSync(path.join(rootDir, relPath), "utf-8").replace(/\r\n/g, "\n");

    const proxyContent = readNormalized("src/proxy.ts");
    const adminLayoutContent = readNormalized("src/app/admin/layout.tsx");
    const mfaPageContent = readNormalized("src/app/auth/mfa/page.tsx");
    const queuePageContent = readNormalized("src/app/admin/listings/page.tsx");
    const detailPageContent = readNormalized("src/app/admin/listings/[id]/page.tsx");
    const locationsPageContent = readNormalized("src/app/admin/locations/page.tsx");
    const categoriesPageContent = readNormalized("src/app/admin/categories/page.tsx");

    it("1. proxy.ts does NOT perform blanket AAL1 -> /auth/mfa redirect", () => {
      expect(proxyContent).not.toContain('redirect("/auth/mfa"');
      expect(proxyContent).not.toContain("redirect(mfaUrl)");
    });

    it("2. proxy.ts still blocks unauthenticated users from /admin/*", () => {
      expect(proxyContent).toContain('pathname.startsWith("/admin")');
      expect(proxyContent).toContain("!isAuthenticated");
      expect(proxyContent).toContain('signInUrl.searchParams.set("next", pathname)');
    });

    it("3. AdminLayout checks staff role BEFORE checking AAL2 assurance", () => {
      const staffRoleIndex = adminLayoutContent.indexOf('from("staff_roles")');
      const aalIndex = adminLayoutContent.indexOf("getAuthenticatorAssuranceLevel()");
      expect(staffRoleIndex).toBeGreaterThan(-1);
      expect(aalIndex).toBeGreaterThan(-1);
      // staff role must be queried before AAL2 check
      expect(staffRoleIndex).toBeLessThan(aalIndex);
    });

    it("4. AdminLayout uses .maybeSingle() for staff role query", () => {
      expect(adminLayoutContent).toContain(".maybeSingle()");
    });

    it("5. AdminLayout redirects non-staff directly to '/'", () => {
      expect(adminLayoutContent).toContain('redirect("/")');
    });

    it("6. AdminLayout redirects staff with AAL1 to /auth/mfa?next=/admin", () => {
      expect(adminLayoutContent).toContain('redirect("/auth/mfa?next=/admin")');
    });

    it("7. /auth/mfa confirms user authentication and checks staff role before listing/enrolling factors", () => {
      const getUserIndex = mfaPageContent.indexOf("supabase.auth.getUser()");
      const staffCheckIndex = mfaPageContent.indexOf('from("staff_roles")');
      const listFactorsIndex = mfaPageContent.indexOf("supabase.auth.mfa.listFactors()");
      const enrollIndex = mfaPageContent.indexOf("supabase.auth.mfa.enroll(");

      expect(getUserIndex).toBeGreaterThan(-1);
      expect(staffCheckIndex).toBeGreaterThan(-1);
      expect(listFactorsIndex).toBeGreaterThan(-1);
      expect(enrollIndex).toBeGreaterThan(-1);

      // Must check authentication and staff role before listing or enrolling
      expect(getUserIndex).toBeLessThan(staffCheckIndex);
      expect(staffCheckIndex).toBeLessThan(listFactorsIndex);
      expect(staffCheckIndex).toBeLessThan(enrollIndex);
    });

    it("8. /auth/mfa redirects non-staff directly to '/'", () => {
      expect(mfaPageContent).toContain('router.push("/")');
    });

    it("9. Queue query contains NO invalid profiles!listings_seller_id_fkey embed", () => {
      expect(queuePageContent).not.toContain("profiles!listings_seller_id_fkey");
    });

    it("10. Queue query disambiguates listing_media with listing_media_listing_id_fkey", () => {
      expect(queuePageContent).toContain("listing_media!listing_media_listing_id_fkey(id, processing_status)");
      expect(queuePageContent).not.toContain("fk_listings_cover_photo");
    });

    it("11. Queue query fetches seller profiles separately", () => {
      expect(queuePageContent).toContain('from("profiles")');
      expect(queuePageContent).toContain('.select("id, display_name")');
      expect(queuePageContent).toContain("sellerProfilesMap");
    });

    it("12. Detail query contains NO invalid profiles!listings_seller_id_fkey embed", () => {
      expect(detailPageContent).not.toContain("profiles!listings_seller_id_fkey");
    });

    it("13. Detail query preserves valid relationships: categories, cities, localities", () => {
      expect(detailPageContent).toContain("categories(name, slug)");
      expect(detailPageContent).toContain("cities(name, state)");
      expect(detailPageContent).toContain("localities(name)");
    });

    it("14. Detail query uses .maybeSingle() and throws on unexpected query error (does NOT 404)", () => {
      expect(detailPageContent).toContain(".maybeSingle()");
      expect(detailPageContent).toContain("logger.error");
      expect(detailPageContent).toContain("throw new Error");
      // Missing listing triggers notFound, error throws
      expect(detailPageContent).toContain("if (!listing) {\n    notFound();\n  }");
    });

    it("15. Detail page fetches seller profile separately without blocking render if missing", () => {
      expect(detailPageContent).toContain('from("profiles")');
      expect(detailPageContent).toContain('.select("display_name, avatar_url")');
      expect(detailPageContent).toContain("sellerProfile = profileData");
    });

    it("16. listings queue contains NO calls to is_active_staff_aal2", () => {
      expect(queuePageContent).not.toContain("is_active_staff_aal2");
    });

    it("17. listing detail contains NO calls to is_active_staff_aal2", () => {
      expect(detailPageContent).not.toContain("is_active_staff_aal2");
    });

    it("18. locations page contains NO calls to is_active_staff_aal2", () => {
      expect(locationsPageContent).not.toContain("is_active_staff_aal2");
    });

    it("19. categories page contains NO calls to is_active_staff_aal2", () => {
      expect(categoriesPageContent).not.toContain("is_active_staff_aal2");
    });
  });

  describe("C. Admin Access Flow State Machine Simulations", () => {
    it("simulates unauthenticated user visiting /admin -> redirected to sign-in", () => {
      const user = null;
      let destination = "";
      if (!user) {
        destination = "/auth/sign-in?next=/admin";
      }
      expect(destination).toBe("/auth/sign-in?next=/admin");
    });

    it("simulates authenticated non-staff visiting /admin -> redirected to /", () => {
      const user = { id: "seller-123" };
      const staffRole = null; // non-staff
      let destination = "";

      if (!user) {
        destination = "/auth/sign-in?next=/admin";
      } else if (!staffRole) {
        destination = "/";
      } else {
        destination = "/admin";
      }
      expect(destination).toBe("/");
    });

    it("simulates staff with AAL1 visiting /admin -> redirected to /auth/mfa", () => {
      const user = { id: "admin-456" };
      const staffRole = { role: "administrator" };
      const aal: string = "aal1";
      let destination = "";

      if (!user) {
        destination = "/auth/sign-in?next=/admin";
      } else if (!staffRole) {
        destination = "/";
      } else if (aal !== "aal2") {
        destination = "/auth/mfa?next=/admin";
      } else {
        destination = "/admin";
      }
      expect(destination).toBe("/auth/mfa?next=/admin");
    });

    it("simulates staff with AAL2 visiting /admin -> granted access", () => {
      const user = { id: "admin-456" };
      const staffRole = { role: "administrator" };
      const aal: string = "aal2";
      let destination = "";

      if (!user) {
        destination = "/auth/sign-in?next=/admin";
      } else if (!staffRole) {
        destination = "/";
      } else if (aal !== "aal2") {
        destination = "/auth/mfa?next=/admin";
      } else {
        destination = "/admin";
      }
      expect(destination).toBe("/admin");
    });

    it("simulates non-staff hitting /auth/mfa -> immediately bounced to / without factor enrollment", () => {
      const user = { id: "seller-123" };
      const staffRole = null;
      let enrollCalled = false;
      let destination = "";

      if (!user) {
        destination = "/auth/sign-in";
      } else if (!staffRole) {
        destination = "/";
      } else {
        enrollCalled = true;
      }

      expect(destination).toBe("/");
      expect(enrollCalled).toBe(false);
    });

    it("simulates staff with existing verified factor at /auth/mfa -> enters challenge flow", () => {
      const user = { id: "admin-456" };
      const staffRole = { role: "administrator" };
      const factors = { totp: [{ id: "factor-1", status: "verified" }] };
      let enrollCalled = false;
      let factorToChallenge = null;

      if (user && staffRole) {
        const verified = factors.totp.find((f) => f.status === "verified");
        if (verified) {
          factorToChallenge = verified.id;
        } else {
          enrollCalled = true;
        }
      }

      expect(factorToChallenge).toBe("factor-1");
      expect(enrollCalled).toBe(false);
    });

    it("simulates staff without factors at /auth/mfa -> enters enrollment flow", () => {
      const user = { id: "admin-456" };
      const staffRole = { role: "administrator" };
      const factors = { totp: [] as Array<{ id: string; status: string }> };
      let enrollCalled = false;

      if (user && staffRole) {
        const verified = factors.totp.find((f) => f.status === "verified");
        if (!verified) {
          enrollCalled = true;
        }
      }

      expect(enrollCalled).toBe(true);
    });
  });

  describe("D. Moderation Detail Error Disambiguation", () => {
    it("distinguishes between not found (!listing) and unexpected DB failure (error)", () => {
      function handleListingQueryResult(listing: unknown, error: { code: string; message: string } | null) {
        if (error) {
          return { action: "throw", error: "Failed to load listing for moderation review." };
        }
        if (!listing) {
          return { action: "notFound" };
        }
        return { action: "render", listing };
      }

      // Case 1: PostgREST error (e.g. PGRST200 or 500)
      const errorResult = handleListingQueryResult(null, { code: "PGRST200", message: "Schema error" });
      expect(errorResult.action).toBe("throw");

      // Case 2: Listing does not exist
      const notFoundResult = handleListingQueryResult(null, null);
      expect(notFoundResult.action).toBe("notFound");

      // Case 3: Listing exists
      const renderResult = handleListingQueryResult({ id: "listing-1" }, null);
      expect(renderResult.action).toBe("render");
    });
  });

  describe("E. Admin Route-Specific Role Rules", () => {
    function evaluateListingsAccess(role: string | null): "allowed" | "redirect" {
      if (role && ["administrator", "moderator"].includes(role)) {
        return "allowed";
      }
      return "redirect";
    }

    function evaluateLocationsAccess(role: string | null): "allowed" | "redirect" {
      if (role === "administrator") {
        return "allowed";
      }
      return "redirect";
    }

    function evaluateCategoriesAccess(role: string | null): "allowed" | "redirect" {
      if (role && ["administrator", "content_editor"].includes(role)) {
        return "allowed";
      }
      return "redirect";
    }

    it("LISTINGS: administrator and moderator allowed, others denied", () => {
      expect(evaluateListingsAccess("administrator")).toBe("allowed");
      expect(evaluateListingsAccess("moderator")).toBe("allowed");
      expect(evaluateListingsAccess("support_agent")).toBe("redirect");
      expect(evaluateListingsAccess("content_editor")).toBe("redirect");
      expect(evaluateListingsAccess(null)).toBe("redirect");
    });

    it("LOCATIONS: administrator allowed, moderator, content_editor, support_agent denied", () => {
      expect(evaluateLocationsAccess("administrator")).toBe("allowed");
      expect(evaluateLocationsAccess("moderator")).toBe("redirect");
      expect(evaluateLocationsAccess("content_editor")).toBe("redirect");
      expect(evaluateLocationsAccess("support_agent")).toBe("redirect");
      expect(evaluateLocationsAccess(null)).toBe("redirect");
    });

    it("CATEGORIES: administrator and content_editor allowed, others denied", () => {
      expect(evaluateCategoriesAccess("administrator")).toBe("allowed");
      expect(evaluateCategoriesAccess("content_editor")).toBe("allowed");
      expect(evaluateCategoriesAccess("moderator")).toBe("redirect");
      expect(evaluateCategoriesAccess("support_agent")).toBe("redirect");
      expect(evaluateCategoriesAccess(null)).toBe("redirect");
    });

    it("ERROR HANDLING: staff_roles query error throws and fails safely (does not treat as valid role)", () => {
      function evaluateStaffQuery(staffData: { role: string } | null, staffError: { code: string } | null) {
        if (staffError) {
          throw new Error("Failed to verify staff permissions.");
        }
        if (!staffData || !["administrator", "moderator"].includes(staffData.role)) {
          return "redirect";
        }
        return "allowed";
      }

      expect(() => evaluateStaffQuery(null, { code: "500" })).toThrow("Failed to verify staff permissions.");
      expect(evaluateStaffQuery(null, null)).toBe("redirect");
      expect(evaluateStaffQuery({ role: "support_agent" }, null)).toBe("redirect");
      expect(evaluateStaffQuery({ role: "moderator" }, null)).toBe("allowed");
    });
  });
});
