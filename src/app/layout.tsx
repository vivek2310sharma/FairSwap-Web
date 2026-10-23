import { AuthProvider } from "@/components/providers/AuthProvider";
import type { Metadata } from "next";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
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
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  openGraph: {
    images: [{ url: '/brand/og_image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/brand/og_image.png'],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
