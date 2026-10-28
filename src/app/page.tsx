import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HomeDiscovery } from "@/components/listings/HomeDiscovery";
import { RecentListingsSection } from "@/components/listings/RecentListingsSection";
import { RecentListingsSkeleton } from "@/components/listings/RecentListingsSkeleton";
import { getPublicCategories } from "@/lib/discovery/queries";
import { NeighbourhoodMapIntro } from "@/components/home/NeighbourhoodMapIntro";
import { IntroGate } from "@/components/home/IntroGate";
import { SafetyBand } from "@/components/home/SafetyBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { searchFiltersSchema } from "@/types/listing";
import { resolvePublicArea } from "@/lib/location/public-areas";
import { z } from "zod";

export const metadata = {
  title: "FairSwap.in — India's Local Classifieds Marketplace",
  description: "Discover useful finds from people around you. Buy, sell and explore locally, with approved ads by category and public area on FairSwap.",
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
    <IntroGate />
    <Header />
    <main className="flex-1">
      <HomeDiscovery key={JSON.stringify(params)} categories={categories.map(({ id, slug, name }) => ({ id, slug, name }))} initialArea={area} initialFilters={filters} restoreSaved={!hasExplicitLocation} />
      <Suspense key={area ? `${area.city}:${area.locality ?? ""}` : "all-india"} fallback={<RecentListingsSkeleton />}><RecentListingsSection area={area} /></Suspense>
      <SafetyBand />
      <HowItWorks />
    </main>
    <Footer />
    <NeighbourhoodMapIntro />
  </>;
}
