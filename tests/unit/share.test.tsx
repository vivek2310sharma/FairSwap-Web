import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import React from "react";
import {
  formatListingPrice,
  buildListingCanonicalUrl,
  buildListingShareUrl,
  buildWhatsAppShareMessage,
  buildWhatsAppShareLink,
} from "@/lib/listings/share";
import { ShareButton } from "@/components/listings/ShareButton";
import ListingsDashboardPage from "@/app/account/listings/page";

type Draft = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  status: string;
  revision: number;
  price_type: string;
  price_paise: number;
  renewal_count: number;
  rejection_reason: string | null;
  removal_reason: string | null;
  cover_photo_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  categories: { name?: string; slug?: string } | null;
  cities: { name: string } | null;
};

const mockListings: Draft[] = [
  {
    id: "active-goods",
    category_id: "goods-cat",
    slug: "active-goods-1",
    title: "Active Public Goods",
    status: "active",
    revision: 1,
    price_type: "fixed",
    price_paise: 100000,
    renewal_count: 0,
    rejection_reason: null,
    removal_reason: null,
    cover_photo_id: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
    categories: { name: "Electronics", slug: "electronics" },
    cities: { name: "Mumbai" },
  },
  {
    id: "active-property",
    category_id: "property-cat",
    slug: "active-property-2",
    title: "Active Property Flat",
    status: "active",
    revision: 1,
    price_type: "fixed",
    price_paise: 5000000,
    renewal_count: 0,
    rejection_reason: null,
    removal_reason: null,
    cover_photo_id: null,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
    categories: { name: "Apartments", slug: "rental-apartments" },
    cities: { name: "Mumbai" },
  },
  {
    id: "expired-goods",
    category_id: "goods-cat",
    slug: "expired-goods-3",
    title: "Expired Active Listing",
    status: "active",
    revision: 1,
    price_type: "fixed",
    price_paise: 200000,
    renewal_count: 0,
    rejection_reason: null,
    removal_reason: null,
    cover_photo_id: null,
    expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired
    created_at: "2026-09-01",
    updated_at: "2026-09-01",
    categories: { name: "Electronics", slug: "electronics" },
    cities: { name: "Mumbai" },
  },
  {
    id: "draft-item",
    category_id: "goods-cat",
    slug: "draft-item-4",
    title: "Draft Item",
    status: "draft",
    revision: 1,
    price_type: "fixed",
    price_paise: 50000,
    renewal_count: 0,
    rejection_reason: null,
    removal_reason: null,
    cover_photo_id: null,
    expires_at: null,
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
    categories: { name: "Electronics", slug: "electronics" },
    cities: { name: "Mumbai" },
  },
];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "seller-123" } } }),
    },
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: async () => ({ data: mockListings, error: null }),
        in: async () => ({ data: [], error: null }),
      };
      return q;
    },
  }),
}));

vi.mock("@/app/account/listings/actions", () => ({
  submitListingAction: vi.fn(),
  transitionListingAction: vi.fn(),
}));

vi.mock("@/lib/listings/property/server", () => ({
  isPropertyEnabled: () => true,
}));

vi.mock("@/lib/listings/two-wheeler/server", () => ({
  isTwoWheelerEnabled: () => true,
  isCarsEnabled: () => true,
}));

describe("WhatsApp & Social Sharing Utilities (LIST-03)", () => {
  describe("formatListingPrice", () => {
    it("formats free price correctly", () => {
      expect(formatListingPrice({ price_type: "free", price_paise: 0 })).toBe("Free");
    });

    it("formats INR price_paise correctly in en-IN locale", () => {
      expect(formatListingPrice({ price_type: "fixed", price_paise: 150000 })).toBe("₹1,500");
      expect(formatListingPrice({ price_type: "negotiable", price_paise: 999900 })).toBe("₹9,999");
    });

    it("returns 'Price on request' when price_paise is null or missing", () => {
      expect(formatListingPrice({ price_type: "fixed", price_paise: null })).toBe("Price on request");
      expect(formatListingPrice({})).toBe("Price on request");
    });

    it("uses custom price when provided", () => {
      expect(formatListingPrice({ price_type: "fixed", price_paise: 1000 }, "INR 500 / month")).toBe("INR 500 / month");
    });
  });

  describe("buildListingCanonicalUrl & buildListingShareUrl", () => {
    it("builds clean canonical URL without WhatsApp UTM parameters for Copy Link", () => {
      const canonical = buildListingCanonicalUrl("vintage-royal-enfield-123", "https://fairswap.in");
      const url = new URL(canonical);

      expect(url.origin).toBe("https://fairswap.in");
      expect(url.pathname).toBe("/listings/vintage-royal-enfield-123");
      expect(url.searchParams.get("utm_source")).toBeNull();
    });

    it("generates valid URL with WhatsApp UTM parameters for social sharing", () => {
      const urlString = buildListingShareUrl("vintage-royal-enfield-123", "https://fairswap.in", "whatsapp");
      const url = new URL(urlString);

      expect(url.origin).toBe("https://fairswap.in");
      expect(url.pathname).toBe("/listings/vintage-royal-enfield-123");
      expect(url.searchParams.get("utm_source")).toBe("whatsapp");
      expect(url.searchParams.get("utm_medium")).toBe("social");
      expect(url.searchParams.get("utm_campaign")).toBe("listing_share");
    });

    it("prioritizes NEXT_PUBLIC_SITE_URL environment variable over window.location if provided", () => {
      const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_SITE_URL = "https://fairswap.in";
      try {
        const canonical = buildListingCanonicalUrl("iphone-15-pro");
        expect(canonical.startsWith("https://fairswap.in/listings/iphone-15-pro")).toBe(true);
      } finally {
        process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
      }
    });

    it("encodes special characters in listing slug", () => {
      const urlString = buildListingShareUrl("iphone-15-pro-hindi-test", "https://fairswap.in");
      expect(urlString).toContain("/listings/iphone-15-pro-hindi-test");
    });
  });

  describe("buildWhatsAppShareMessage & buildWhatsAppShareLink", () => {
    it("builds concise, formatted share message with emojis, Hindi text, title and price", () => {
      const message = buildWhatsAppShareMessage({
        title: "IPhone 14 - शानदार स्थिति",
        price: "₹45,000",
        slug: "iphone-14-123",
        siteUrl: "https://fairswap.in",
      });

      expect(message).toContain("Check out this listing on FairSwap!");
      expect(message).toContain("📦 IPhone 14 - शानदार स्थिति");
      expect(message).toContain("💰 ₹45,000");
      expect(message).toContain("https://fairswap.in/listings/iphone-14-123?utm_source=whatsapp&utm_medium=social&utm_campaign=listing_share");
      expect(message).toContain("Discover more on FairSwap.");
    });

    it("builds valid wa.me link with encoded URI text", () => {
      const waLink = buildWhatsAppShareLink({
        title: "Honda Activa 6G",
        price: "₹65,000",
        slug: "honda-activa-6g-456",
        siteUrl: "https://fairswap.in",
      });

      expect(waLink.startsWith("https://wa.me/?text=")).toBe(true);
      const decodedText = decodeURIComponent(waLink.replace("https://wa.me/?text=", ""));
      expect(decodedText).toContain("📦 Honda Activa 6G");
      expect(decodedText).toContain("💰 ₹65,000");
    });
  });
});

describe("ShareButton Component (LIST-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders WhatsApp share link and copy link button in inline variant", () => {
    render(
      <ShareButton
        slug="samsung-galaxy-s23-789"
        title="Samsung Galaxy S23"
        price_type="fixed"
        price_paise={5000000}
        variant="inline"
        siteUrl="https://fairswap.in"
      />
    );

    const whatsappLink = screen.getByRole("link", { name: /share listing on whatsapp/i });
    expect(whatsappLink).toBeInTheDocument();
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink.getAttribute("href")).toContain("https://wa.me/?text=");
    expect(whatsappLink.getAttribute("href")).toContain("utm_source%3Dwhatsapp");

    const copyButton = screen.getByRole("button", { name: /copy listing link/i });
    expect(copyButton).toBeInTheDocument();
  });

  it("copies clean canonical link to clipboard without WhatsApp attribution and shows polite status feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ShareButton
        slug="samsung-galaxy-s23-789"
        title="Samsung Galaxy S23"
        price_type="fixed"
        price_paise={5000000}
        variant="inline"
        siteUrl="https://fairswap.in"
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy listing link/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toBe("https://fairswap.in/listings/samsung-galaxy-s23-789");
    expect(copiedText).not.toContain("utm_source=whatsapp");

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveTextContent("Copied");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
  });

  it("handles clipboard API failure gracefully and displays error status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ShareButton
        slug="samsung-galaxy-s23-789"
        title="Samsung Galaxy S23"
        price_type="fixed"
        price_paise={5000000}
        variant="inline"
        siteUrl="https://fairswap.in"
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy listing link/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    const statusElement = screen.getByRole("status");
    expect(statusElement).toHaveTextContent("Failed to copy");
    expect(statusElement).toHaveAttribute("aria-live", "polite");
    consoleSpy.mockRestore();
  });
});

describe("My Ads Dashboard Public Visibility & Lifecycle Actions (LIST-03)", () => {
  afterEach(cleanup);

  it("preserves Pause, Mark Reserved, and Mark Sold buttons for ALL active listings including property", async () => {
    render(await ListingsDashboardPage());

    const activeGoodsHeading = screen.getByRole("heading", { name: "Active Public Goods" });
    const activeGoodsCard = activeGoodsHeading.closest(".rounded-lg")!;
    expect(activeGoodsCard).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Pause" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Mark Reserved" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Mark Sold" })).toHaveLength(3);
  });

  it("renders Share button ONLY for publicly visible active listings and omits it for expired or draft items", async () => {
    render(await ListingsDashboardPage());

    const activeGoodsHeading = screen.getByRole("heading", { name: "Active Public Goods" });
    const activeGoodsCard = activeGoodsHeading.closest(".rounded-lg")!;
    const whatsappLinksInGoodsCard = activeGoodsCard.querySelectorAll("a[href^='https://wa.me/']");
    expect(whatsappLinksInGoodsCard.length).toBe(1);

    const expiredGoodsHeading = screen.getByRole("heading", { name: "Expired Active Listing" });
    const expiredGoodsCard = expiredGoodsHeading.closest(".rounded-lg")!;
    const whatsappLinksInExpiredCard = expiredGoodsCard.querySelectorAll("a[href^='https://wa.me/']");
    expect(whatsappLinksInExpiredCard.length).toBe(0);

    const draftItemHeading = screen.getByRole("heading", { name: "Draft Item" });
    const draftItemCard = draftItemHeading.closest(".rounded-lg")!;
    const whatsappLinksInDraftCard = draftItemCard.querySelectorAll("a[href^='https://wa.me/']");
    expect(whatsappLinksInDraftCard.length).toBe(0);
  });
});
