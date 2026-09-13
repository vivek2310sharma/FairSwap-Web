import { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = createServiceRoleClient();

  // 1. Static high-value routes
  const routes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/safety`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  // 2. Active categories
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true)
    .limit(50);

  if (categories) {
    for (const cat of categories) {
      routes.push({
        url: `${siteUrl}/search?category=${encodeURIComponent(cat.slug)}`,
        lastModified: new Date(cat.updated_at),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // 3. Active public listings (strictly visible, bounded to 1000 items)
  const { data: listings } = await supabase
    .from("listings")
    .select("slug, updated_at, expires_at, seller_id, user_accounts!listings_seller_id_fkey(account_status)")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1000);

  interface ListingSitemapRow {
    slug: string;
    updated_at: string;
    expires_at: string | null;
    seller_id: string;
    user_accounts: { account_status: string } | null;
  }

  const now = new Date();
  if (listings) {
    for (const rawListing of listings) {
      const l = rawListing as unknown as ListingSitemapRow;
      const isSellerActive = l.user_accounts?.account_status === "active";
      const isNotExpired = !l.expires_at || new Date(l.expires_at) > now;
      if (isSellerActive && isNotExpired && l.slug) {
        routes.push({
          url: `${siteUrl}/listings/${encodeURIComponent(l.slug)}`,
          lastModified: new Date(l.updated_at),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  }

  return routes;
}
