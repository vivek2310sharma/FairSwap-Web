import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import sitemap from "@/app/sitemap";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock service client
const mockCategoriesSelect = vi.fn();
const mockListingsSelect = vi.fn();
const mockAccountsSelect = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "categories") {
        return {
          select: () => ({
            eq: () => ({
              limit: mockCategoriesSelect,
            }),
          }),
        };
      }
      if (table === "listings") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: mockListingsSelect,
              }),
            }),
          }),
        };
      }
      if (table === "user_accounts") {
        return {
          select: () => ({
            in: mockAccountsSelect,
          }),
        };
      }
      return {};
    },
  }),
}));

describe("Point 9B-R7 — Sitemap Active-Listing Remediation Tests", () => {
  it("does not index the legacy /help redirect as a duplicate FAQ", async () => {
    const routes = await sitemap();
    expect(routes.some((route) => new URL(route.url).pathname === "/help")).toBe(false);
    expect(routes.some((route) => new URL(route.url).pathname === "/safety")).toBe(true);
    expect(routes.some((route) => new URL(route.url).pathname === "/grievance")).toBe(true);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoriesSelect.mockResolvedValue({
      data: [{ slug: "electronics", updated_at: "2026-09-15T12:00:00.000Z" }],
      error: null,
    });
  });

  describe("1. Static Code Invariants", () => {
    const sitemapContent = fs.readFileSync(
      path.join(process.cwd(), "src/app/sitemap.ts"),
      "utf-8"
    );

    it("does NOT contain user_accounts!listings_seller_id_fkey embed", () => {
      expect(sitemapContent).not.toContain("user_accounts!listings_seller_id_fkey");
    });

    it("queries user_accounts separately", () => {
      expect(sitemapContent).toContain('.from("user_accounts")');
      expect(sitemapContent).toContain('.from("listings")');
    });
  });

  describe("2. Inclusion & Exclusion Rules", () => {
    it("includes active listing with active seller and future expiry", async () => {
      mockListingsSelect.mockResolvedValue({
        data: [
          {
            slug: "bike-123",
            updated_at: "2026-09-15T10:00:00.000Z",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            seller_id: "seller-1",
          },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: [{ user_id: "seller-1", account_status: "active" }],
        error: null,
      });

      const routes = await sitemap();
      const listingRoute = routes.find((r) => r.url.includes("/listings/bike-123"));

      expect(listingRoute).toBeDefined();
      expect(listingRoute?.url).toBe("http://localhost:3000/listings/bike-123");
      expect(listingRoute?.priority).toBe(0.7);
    });

    it("excludes expired listing (expires_at in past)", async () => {
      mockListingsSelect.mockResolvedValue({
        data: [
          {
            slug: "expired-item",
            updated_at: "2026-08-01T10:00:00.000Z",
            expires_at: "2026-08-15T10:00:00.000Z",
            seller_id: "seller-1",
          },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: [{ user_id: "seller-1", account_status: "active" }],
        error: null,
      });

      const routes = await sitemap();
      const listingRoute = routes.find((r) => r.url.includes("expired-item"));
      expect(listingRoute).toBeUndefined();
    });

    it("excludes active listing whose seller account is inactive/suspended", async () => {
      mockListingsSelect.mockResolvedValue({
        data: [
          {
            slug: "suspended-seller-item",
            updated_at: "2026-09-15T10:00:00.000Z",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            seller_id: "seller-suspended",
          },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: [{ user_id: "seller-suspended", account_status: "suspended" }],
        error: null,
      });

      const routes = await sitemap();
      const listingRoute = routes.find((r) => r.url.includes("suspended-seller-item"));
      expect(listingRoute).toBeUndefined();
    });

    it("excludes listing with missing or blank slug", async () => {
      mockListingsSelect.mockResolvedValue({
        data: [
          {
            slug: "",
            updated_at: "2026-09-15T10:00:00.000Z",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            seller_id: "seller-1",
          },
          {
            slug: "   ",
            updated_at: "2026-09-15T10:00:00.000Z",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            seller_id: "seller-1",
          },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: [{ user_id: "seller-1", account_status: "active" }],
        error: null,
      });

      const routes = await sitemap();
      const listingRoutes = routes.filter((r) => r.url.includes("/listings/"));
      expect(listingRoutes.length).toBe(0);
    });

    it("proves seller account status is fetched separately for all unique seller IDs", async () => {
      mockListingsSelect.mockResolvedValue({
        data: [
          { slug: "item-1", updated_at: "2026-09-15T00:00:00Z", expires_at: null, seller_id: "s1" },
          { slug: "item-2", updated_at: "2026-09-15T00:00:00Z", expires_at: null, seller_id: "s1" },
          { slug: "item-3", updated_at: "2026-09-15T00:00:00Z", expires_at: null, seller_id: "s2" },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: [
          { user_id: "s1", account_status: "active" },
          { user_id: "s2", account_status: "active" },
        ],
        error: null,
      });

      const routes = await sitemap();
      expect(mockAccountsSelect).toHaveBeenCalledWith("user_id", ["s1", "s2"]);
      expect(routes.filter((r) => r.url.includes("/listings/")).length).toBe(3);
    });
  });

  describe("3. Error Handling & Resilience", () => {
    it("handles listings query failure: logs server error and returns safe static routes", async () => {
      const { logger } = await import("@/lib/logger");
      mockListingsSelect.mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "Database failure" },
      });

      const routes = await sitemap();

      expect(logger.error).toHaveBeenCalledWith(
        "sitemap.listings_query_failed",
        expect.objectContaining({ error_code: "PGRST500" })
      );

      // Verify static routes are returned safely without error leaks
      expect(routes.length).toBeGreaterThanOrEqual(7);
      expect(routes.some((r) => r.url.endsWith("/search"))).toBe(true);
      expect(routes.some((r) => r.url.includes("Database failure"))).toBe(false);
    });

    it("handles user_accounts query failure: logs server error and returns safe static routes", async () => {
      const { logger } = await import("@/lib/logger");
      mockListingsSelect.mockResolvedValue({
        data: [
          {
            slug: "item-1",
            updated_at: "2026-09-15T00:00:00Z",
            expires_at: null,
            seller_id: "s1",
          },
        ],
        error: null,
      });

      mockAccountsSelect.mockResolvedValue({
        data: null,
        error: { code: "PGRST503", message: "Accounts table unavailable" },
      });

      const routes = await sitemap();

      expect(logger.error).toHaveBeenCalledWith(
        "sitemap.seller_accounts_query_failed",
        expect.objectContaining({ error_code: "PGRST503" })
      );

      expect(routes.some((r) => r.url.includes("/listings/item-1"))).toBe(false);
      expect(routes.some((r) => r.url.includes("Accounts table unavailable"))).toBe(false);
    });
  });
});
