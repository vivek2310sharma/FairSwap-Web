/**
 * WhatsApp and social sharing helper utilities for FairSwap listings.
 */

export interface FormatPriceInput {
  price_type?: string | null;
  price_paise?: number | null;
}

export function formatListingPrice(input: FormatPriceInput, customPrice?: string): string {
  if (customPrice) {
    return customPrice;
  }
  if (input.price_type === "free") {
    return "Free";
  }
  if (input.price_paise !== null && input.price_paise !== undefined) {
    return `₹${(input.price_paise / 100).toLocaleString("en-IN")}`;
  }
  return "Price on request";
}

export function getBaseSiteUrl(customSiteUrl?: string): string {
  if (customSiteUrl) {
    return customSiteUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return envUrl.replace(/\/+$/, "");
}

export function buildListingShareUrl(slug: string, customSiteUrl?: string): string {
  const base = getBaseSiteUrl(customSiteUrl);
  const origin = base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base}`;
  const url = new URL(`/listings/${encodeURIComponent(slug)}`, origin);
  url.searchParams.set("utm_source", "whatsapp");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "listing_share");
  return url.toString();
}

export function buildWhatsAppShareMessage(params: {
  title: string;
  price?: string;
  slug: string;
  siteUrl?: string;
}): string {
  const url = buildListingShareUrl(params.slug, params.siteUrl);
  const priceText = params.price || "Price on request";

  return `Check out this listing on FairSwap!\n\n📦 ${params.title}\n💰 ${priceText}\n\n🔗 ${url}\n\nDiscover more on FairSwap.`;
}

export function buildWhatsAppShareLink(params: {
  title: string;
  price?: string;
  slug: string;
  siteUrl?: string;
}): string {
  const message = buildWhatsAppShareMessage(params);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
