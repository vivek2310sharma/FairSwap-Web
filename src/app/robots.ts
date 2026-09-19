import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const isProductionSite =
    process.env.NODE_ENV === "production" &&
    (siteUrl === "https://fairswap.in" || siteUrl === "https://www.fairswap.in");

  if (!isProductionSite) {
    // Keep local, staging, and preview environments completely non-indexed.
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/account/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
