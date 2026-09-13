import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DevelopmentNotice } from "@/components/development-notice";
import { ShoppingBag, Search, MessageSquare, Shield, Tag, BookOpen } from "lucide-react";

const categories = [
  { name: "Electronics", icon: ShoppingBag, description: "Phones, laptops, accessories" },
  { name: "Furniture", icon: Tag, description: "Tables, chairs, home decor" },
  { name: "Books", icon: BookOpen, description: "Textbooks, novels, academic" },
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Development notice */}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <DevelopmentNotice />
        </div>

        {/* Hero section */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Buy &amp; sell locally on{" "}
              <span className="text-brand-600">FairSwap</span>
              <span className="text-muted">.in</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
              India&apos;s classifieds marketplace for your city. Find great deals
              on electronics, furniture, books, and more from people near you.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-y border-border bg-surface"
        >
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
                      className="h-6 w-6 text-brand-600"
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

        {/* Category preview */}
        <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground">
            Browse Categories
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Categories will be populated when listings are implemented.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="rounded-lg border border-border p-6 text-center transition-colors hover:border-brand-300"
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
                  <cat.icon
                    className="h-5 w-5 text-brand-600"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {cat.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{cat.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety section */}
        <section
          id="safety"
          className="border-t border-border bg-surface"
        >
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
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
