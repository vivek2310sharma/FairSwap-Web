import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HomeDiscovery } from "@/components/listings/HomeDiscovery";
import { RecentListingsSection } from "@/components/listings/RecentListingsSection";
import { RecentListingsSkeleton } from "@/components/listings/RecentListingsSkeleton";
import { getPublicCategories } from "@/lib/discovery/queries";
import Link from "next/link";
import { Search, MessageSquare, Shield } from "lucide-react";
import { searchFiltersSchema } from "@/types/listing";
import { resolvePublicArea } from "@/lib/location/public-areas";
import { z } from "zod";

export const metadata = {
  title: "FairSwap.in — India's Local Classifieds Marketplace",
  description: "Buy and sell pre-loved items across India. Discover approved ads by category and public area on FairSwap.",
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
// Next infers the final overload's required props object; direct callers retain
// the existing no-argument default without widening generated PageProps.
export default function HomePage(): Promise<React.JSX.Element>;
export default function HomePage(props: HomePageProps): Promise<React.JSX.Element>;
export default async function HomePage({ searchParams }: HomePageProps = {}) {
  const params = await searchParams || {};
  const parsed = searchFiltersSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : searchFiltersSchema.parse({});
  const hasExplicitLocation = Object.hasOwn(params, "city") || Object.hasOwn(params, "locality");
  const validIds = z.object({ city: z.string().uuid(), locality: z.string().uuid().optional() }).safeParse({ city: filters.city, locality: filters.locality || undefined });
  const [categories, area] = await Promise.all([
    getPublicCategories(),
    validIds.success ? resolvePublicArea(validIds.data.city, validIds.data.locality).catch(() => null) : Promise.resolve(null),
  ]);
  return <>
    <Header />
    <main className="flex-1">
      <HomeDiscovery key={JSON.stringify(params)} categories={categories.map(({ id, slug, name }) => ({ id, slug, name }))} initialArea={area} initialFilters={filters} restoreSaved={!hasExplicitLocation} />
      <Suspense fallback={<RecentListingsSkeleton />}><RecentListingsSection /></Suspense>
      <section id="safety" className="border-y border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-start gap-3 text-sm text-foreground">
          <Shield className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p><strong>Stay safe on FairSwap.</strong> Inspect before paying. Never share an OTP or scan a QR code to receive money. <Link href="/safety" className="font-semibold text-link underline">Safety tips</Link></p>
        </div>
      </section>
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground">How It Works</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {[
            { icon: Search, title: "Browse", text: "Choose a category and public area to discover approved ads." },
            { icon: MessageSquare, title: "Connect", text: "Message sellers directly to ask questions." },
            { icon: Shield, title: "Exchange", text: "Meet in a public place, inspect the item, and agree on payment directly." },
          ].map(step => <div key={step.title} className="flex items-start gap-3">
            <step.icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div><h3 className="text-sm font-semibold text-foreground">{step.title}</h3><p className="mt-1 text-sm text-muted">{step.text}</p></div>
          </div>)}
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
