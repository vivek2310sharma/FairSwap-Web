import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { GuestFavouritesView } from "@/components/favourites/GuestFavouritesView";

export const metadata: Metadata = {
  title: "Saved on this device — FairSwap",
  description: "Ads you saved in this browser. No account needed.",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <GuestFavouritesView />
      </main>
      <Footer />
    </>
  );
}
