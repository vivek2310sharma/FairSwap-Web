import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RecentListingsSection } from "@/components/listings/RecentListingsSection";
import { RecentListingsSkeleton } from "@/components/listings/RecentListingsSkeleton";
import Link from "next/link";
import Form from "next/form";
import Image from "next/image";
import {
  ShoppingBag,
  Search,
  MessageSquare,
  Shield,
  Tag,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const categories = [
  { name: "Electronics", slug: "electronics", icon: ShoppingBag, description: "Phones, laptops, accessories" },
  { name: "Furniture", slug: "furniture", icon: Tag, description: "Tables, chairs, home decor" },
  { name: "Books", slug: "books", icon: BookOpen, description: "Textbooks, novels, academic" },
];

export const metadata = {
  title: "FairSwap.in — India's Local Classifieds Marketplace",
  description:
    "Buy & sell locally on FairSwap.in. India's local classifieds marketplace for peer-to-peer exchanges.",
};

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero section with Search */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 text-center">
          <h1 className="sr-only">Buy &amp; sell locally on FairSwap.in</h1>
          <div className="flex flex-col items-center justify-center rounded-xl bg-transparent dark:bg-white/90 p-4">
            <Image src="/brand/logo with tagline for web.png" alt="FairSwap - Give. Get. Grow Together." width={400} height={120} className="mx-auto max-w-full h-auto max-h-24 sm:max-h-32 object-contain drop-shadow-sm" priority />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            India&apos;s classifieds marketplace for your city. Find great deals
            on electronics, furniture, books, and more from people near you.
          </p>

          {/* Quick Search Bar */}
          <div className="mx-auto mt-8 max-w-2xl">
            <Form
              action="/search"
              className="flex items-center rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500"
            >
              <Search className="ml-3 h-5 w-5 text-muted" aria-hidden="true" />
              <input
                type="search"
                name="q"
                placeholder="Search items, categories, or keywords..."
                aria-label="Search items"
                className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-action-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-action-700"
              >
                <span>Search</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </Form>
          </div>
        </section>

        {/* Recent Approved Listings */}
        <Suspense fallback={<RecentListingsSkeleton />}>
          <RecentListingsSection />
        </Suspense>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-border bg-surface scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-foreground">
              How It Works
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Browse",
                  text: "Find items in your city from local sellers.",
                },
                {
                  icon: MessageSquare,
                  title: "Connect",
                  text: "Message sellers directly to ask questions.",
                },
                {
                  icon: Shield,
                  title: "Exchange",
                  text: "Arrange payment and pickup independently.",
                },
              ].map((step) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
                    <step.icon
                      className="h-6 w-6 text-action-600"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browse Categories preview */}
        <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 scroll-mt-16">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Browse Categories
            </h2>
            <Link
              href="/search"
              className="text-xs font-semibold text-brand-link hover:underline"
            >
              All Categories &rarr;
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted">
            Select a category to browse active verified advertisements.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/search?category=${cat.slug}`}
                className="group rounded-lg border border-border p-6 text-center transition-all hover:border-brand-300 hover:shadow-xs"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-link transition-transform group-hover:scale-110 dark:bg-brand-900">
                  <cat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-brand-link">
                  {cat.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{cat.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Safety section */}
        <section id="safety" className="border-t border-border bg-surface scroll-mt-16">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">
                Your Safety Matters
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">
                FairSwap is a classifieds platform. Buyers and sellers arrange
                payment and exchange independently. Always meet in public, verify
                items in person, and use payment methods you trust. We do not
                verify transactions or guarantee purchases.
              </p>
              <div className="mt-6">
                <Link
                  href="/safety"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface"
                >
                  Read Safety Guidelines &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
