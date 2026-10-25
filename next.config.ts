import type { NextConfig } from "next";

/** Public avatar bucket host, derived from the environment's Supabase URL (no hardcoded hostnames). */
function avatarRemotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const protocol = url.protocol === "http:" ? "http" : "https";
    return [
      {
        protocol,
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Admin URLs must reach the standard 404 without a slash redirect.
  skipTrailingSlashRedirect: true,
  async redirects() {
    // Restore Next.js's default slash removal for every other URL, including
    // assets and API routes that bypass Proxy. Query parameters are preserved.
    return [{
      source: "/:path((?!admin(?:/|$)).+)/",
      destination: "/:path",
      permanent: true,
    }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/sign/listing-derivatives/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/listings/**",
      },
      ...avatarRemotePatterns(),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/account/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
