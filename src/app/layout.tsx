import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairSwap.in — Local Classifieds Marketplace",
  description:
    "FairSwap.in is India's local classifieds marketplace. Buy and sell electronics, furniture, books, bicycles and more in your city.",
  robots: { index: false, follow: false },
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
