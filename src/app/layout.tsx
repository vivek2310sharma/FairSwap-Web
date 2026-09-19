import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProductionSite =
  process.env.NODE_ENV === "production" &&
  (siteUrl === "https://fairswap.in" || siteUrl === "https://www.fairswap.in");

export const metadata: Metadata = {
  metadataBase: isProductionSite ? new URL(siteUrl) : undefined,
  title: "FairSwap.in — Local Classifieds Marketplace",
  description:
    "FairSwap.in is India's local classifieds marketplace. Buy and sell electronics, furniture, books, bicycles and more in your city.",
  alternates: isProductionSite ? { canonical: "/" } : undefined,
  robots: isProductionSite
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
