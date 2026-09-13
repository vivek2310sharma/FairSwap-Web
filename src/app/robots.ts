import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SITE_URL?.includes("fairswap.in");

  if (!isProduction) {
    // Keep internal development and preview environments completely non-indexed
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
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fairswap.in"}/sitemap.xml`,
  };
}
