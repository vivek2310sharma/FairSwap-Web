import { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://fairswap.in"
      : "http://localhost:3000");

  // Always return the core public routes, even if dynamic sitemap enrichment fails.
  const routes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/safety`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const supabase = createServiceRoleClient();

    // 1. Active categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("slug, updated_at")
      .eq("is_active", true)
      .limit(50);

    if (categoriesError) {
      logger.error("sitemap.categories_query_failed", {
        error_code: categoriesError.code,
        message: categoriesError.message,
      });
    } else if (categories) {
      for (const cat of categories) {
        routes.push({
          url: `${siteUrl}/search?category=${encodeURIComponent(cat.slug)}`,
          lastModified: new Date(cat.updated_at),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    // 2. Active public listings (strictly visible, bounded to 1000 items)
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("slug, updated_at, expires_at, seller_id")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (listingsError) {
      logger.error("sitemap.listings_query_failed", {
        error_code: listingsError.code,
        message: listingsError.message,
      });
      return routes;
    }

    if (!listings || listings.length === 0) {
      return routes;
    }

    const sellerIds = Array.from(
      new Set(
        listings
          .map((l) => l.seller_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    let sellerStatusMap = new Map<string, string>();
    if (sellerIds.length > 0) {
      const { data: accounts, error: accountsError } = await supabase
        .from("user_accounts")
        .select("user_id, account_status")
        .in("user_id", sellerIds);

      if (accountsError) {
        logger.error("sitemap.seller_accounts_query_failed", {
          error_code: accountsError.code,
          message: accountsError.message,
        });
        return routes;
      }

      if (accounts) {
        sellerStatusMap = new Map(
          accounts.map((a) => [a.user_id, a.account_status])
        );
      }
    }

    const now = new Date();
    for (const listing of listings) {
      const isSellerActive =
        listing.seller_id &&
        sellerStatusMap.get(listing.seller_id) === "active";
      const isNotExpired =
        !listing.expires_at || new Date(listing.expires_at) > now;
      const hasValidSlug =
        typeof listing.slug === "string" && listing.slug.trim().length > 0;

      if (isSellerActive && isNotExpired && hasValidSlug) {
        routes.push({
          url: `${siteUrl}/listings/${encodeURIComponent(listing.slug.trim())}`,
          lastModified: new Date(listing.updated_at),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    logger.error("sitemap.dynamic_enrichment_failed", {
      message: error instanceof Error ? error.message : "Unknown sitemap error",
    });
  }

  return routes;
}
