import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  parseMyAdsTab,
  getStatusesForTab,
  fetchMyListingCounts,
  MY_ADS_TABS,
  MyListingCounts,
} from "@/lib/listings/my-ads";
import { MyAdsStatusTabs } from "@/components/account/MyAdsStatusTabs";
import ListingsDashboardPage from "@/app/account/listings/page";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

describe("ADS-01 — My Ads Status Tabs Domain Logic & UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseMyAdsTab", () => {
    it("returns valid tab key when provided a valid string", () => {
      expect(parseMyAdsTab("active")).toBe("active");
      expect(parseMyAdsTab("pending_review")).toBe("pending_review");
      expect(parseMyAdsTab("draft")).toBe("draft");
      expect(parseMyAdsTab("rejected")).toBe("rejected");
      expect(parseMyAdsTab("paused")).toBe("paused");
      expect(parseMyAdsTab("sold")).toBe("sold");
      expect(parseMyAdsTab("expired")).toBe("expired");
      expect(parseMyAdsTab("all")).toBe("all");
    });

    it("defaults to 'all' when status is missing, empty, or undefined", () => {
      expect(parseMyAdsTab(undefined)).toBe("all");
      expect(parseMyAdsTab(null)).toBe("all");
      expect(parseMyAdsTab("")).toBe("all");
    });

    it("safely falls back to 'all' when provided an invalid status parameter", () => {
      expect(parseMyAdsTab("invalid_status")).toBe("all");
      expect(parseMyAdsTab("hacked")).toBe("all");
    });

    it("extracts and parses the first element when status is an array", () => {
      expect(parseMyAdsTab(["draft", "active"])).toBe("draft");
      expect(parseMyAdsTab(["unknown"])).toBe("all");
    });
  });

  describe("getStatusesForTab", () => {
    it("returns null for 'all' tab so query fetches all seller statuses", () => {
      expect(getStatusesForTab("all")).toBeNull();
    });

    it("groups 'reserved' under 'active' status tab", () => {
      expect(getStatusesForTab("active")).toEqual(["active", "reserved"]);
    });

    it("maps 'Needs action' tab key ('rejected') to ['rejected']", () => {
      expect(getStatusesForTab("rejected")).toEqual(["rejected"]);
    });

    it("returns single-element status array for specific status tabs", () => {
      expect(getStatusesForTab("pending_review")).toEqual(["pending_review"]);
      expect(getStatusesForTab("draft")).toEqual(["draft"]);
      expect(getStatusesForTab("paused")).toEqual(["paused"]);
      expect(getStatusesForTab("sold")).toEqual(["sold"]);
      expect(getStatusesForTab("expired")).toEqual(["expired"]);
    });
  });

  describe("MyAdsStatusTabs Component", () => {
    const sampleCounts: MyListingCounts = {
      all: 12,
      active: 5,
      pending_review: 2,
      draft: 3,
      rejected: 1,
      paused: 0,
      sold: 1,
      expired: 0,
    };

    it("renders all 8 approved status tabs with exact labels and counts", () => {
      render(<MyAdsStatusTabs activeTab="all" counts={sampleCounts} />);

      const expectedLabels = [
        "All",
        "Active",
        "Under review",
        "Drafts",
        "Needs action",
        "Paused",
        "Expired",
        "Sold",
      ];

      for (let i = 0; i < MY_ADS_TABS.length; i++) {
        const tab = MY_ADS_TABS[i];
        expect(tab.label).toBe(expectedLabels[i]);

        const tabEl = screen.getByRole("link", { name: new RegExp(tab.label, "i") });
        expect(tabEl).toBeInTheDocument();
        expect(tabEl).toHaveTextContent(String(sampleCounts[tab.key]));
      }
    });

    it("marks only the current navigation link with aria-current", () => {
      render(<MyAdsStatusTabs activeTab="active" counts={sampleCounts} />);

      const activeTabElement = screen.getByRole("link", { name: /Active/i });
      expect(activeTabElement).toHaveAttribute("aria-current", "page");

      const draftTabElement = screen.getByRole("link", { name: /Drafts/i });
      expect(draftTabElement).not.toHaveAttribute("aria-current");
    });

    it("generates correct URL links for each tab", () => {
      render(<MyAdsStatusTabs activeTab="all" counts={sampleCounts} />);

      expect(screen.getByRole("link", { name: /All/i })).toHaveAttribute("href", "/account/listings");
      expect(screen.getByRole("link", { name: /Active/i })).toHaveAttribute("href", "/account/listings?status=active");
      expect(screen.getByRole("link", { name: /Needs action/i })).toHaveAttribute("href", "/account/listings?status=rejected");
      expect(screen.getByRole("link", { name: /Drafts/i })).toHaveAttribute("href", "/account/listings?status=draft");
    });
  });

  describe("fetchMyListingCounts", () => {
    it("uses owner-scoped exact counts without calling the unaudited RPC", async () => {
      const mockSupabase = {
        rpc: vi.fn(async () => ({ data: null, error: { message: "RPC function not found" } })),
        from: vi.fn(() => {
          const result = { count: 4, error: null };
          const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
            in: vi.fn((_column: string, statuses: string[]) => Promise.resolve({ count: statuses.includes("active") ? 2 : statuses.includes("draft") || statuses.includes("rejected") ? 1 : 0, error: null })),
            then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
          return q;
        }),
      };

      const counts = await fetchMyListingCounts(
        mockSupabase as unknown as SupabaseClient<Database>,
        "user-123"
      );
      expect(counts!.all).toBe(4);
      expect(counts!.active).toBe(2); // active + reserved
      expect(counts!.draft).toBe(1);
      expect(counts!.rejected).toBe(1);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe("ListingsDashboardPage Server Filtering & Badges", () => {
    it("fetches listings with status filter and displays reserved listing under Active tab with Reserved badge", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "seller-1" } } });

      const mockListingsData = [
        {
          id: "listing-1",
          seller_id: "seller-1",
          slug: "active-item",
          title: "Active Item",
          price_type: "fixed",
          price_paise: 50000,
          status: "active",
          revision: 1,
          renewal_count: 0,
          updated_at: new Date().toISOString(),
          categories: { name: "Electronics", slug: "electronics" },
          cities: { name: "Mumbai" },
        },
        {
          id: "listing-2",
          seller_id: "seller-1",
          slug: "reserved-item",
          title: "Reserved Item",
          price_type: "fixed",
          price_paise: 80000,
          status: "reserved",
          revision: 1,
          renewal_count: 0,
          updated_at: new Date().toISOString(),
          categories: { name: "Electronics", slug: "electronics" },
          cities: { name: "Mumbai" },
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn(async () => ({
          data: mockListingsData,
          count: 2,
          error: null,
        })),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);
      mockRpc.mockResolvedValue({
        data: {
          all: 2,
          active: 2,
          pending_review: 0,
          draft: 0,
          rejected: 0,
          paused: 0,
          sold: 0,
          expired: 0,
        },
        error: null,
      });

      const pageComponent = await ListingsDashboardPage({
        searchParams: Promise.resolve({ status: "active" }),
      });

      render(pageComponent);

      expect(mockQueryBuilder.in).toHaveBeenCalledWith("status", ["active", "reserved"]);
      expect(screen.getByText("Active Item")).toBeInTheDocument();
      expect(screen.getByText("Reserved Item")).toBeInTheDocument();
      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
      expect(screen.getByText("Reserved")).toBeInTheDocument();
    });

    it("renders empty state tab message when seller has no listings in filtered status", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "seller-1" } } });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn(async () => ({
          data: [],
          count: 0,
          error: null,
        })),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);
      mockRpc.mockResolvedValue({
        data: {
          all: 5,
          active: 5,
          pending_review: 0,
          draft: 0,
          rejected: 0,
          paused: 0,
          sold: 0,
          expired: 0,
        },
        error: null,
      });

      const pageComponent = await ListingsDashboardPage({
        searchParams: Promise.resolve({ status: "draft" }),
      });

      render(pageComponent);

      expect(screen.getByText(/No draft listings/i)).toBeInTheDocument();
      expect(screen.getByText("View All Listings")).toBeInTheDocument();
    });
  });
});
