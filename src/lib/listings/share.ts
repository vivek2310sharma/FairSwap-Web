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
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

export function buildListingCanonicalUrl(slug: string, customSiteUrl?: string): string {
  const base = getBaseSiteUrl(customSiteUrl);
  const origin = base.startsWith("http://") || base.startsWith("https://") ? base : `https://${base}`;
  const url = new URL(`/listings/${encodeURIComponent(slug)}`, origin);
  return url.toString();
}

export function buildListingShareUrl(
  slug: string,
  customSiteUrl?: string,
  utmSource = "whatsapp"
): string {
  const urlString = buildListingCanonicalUrl(slug, customSiteUrl);
  const url = new URL(urlString);
  url.searchParams.set("utm_source", utmSource);
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
  const url = buildListingShareUrl(params.slug, params.siteUrl, "whatsapp");
  const priceText = params.price || "Price on request";

  return `Check out this ad on FairSwap!\n\n📦 ${params.title}\n💰 ${priceText}\n\n🔗 ${url}\n\nDiscover more on FairSwap.`;
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
