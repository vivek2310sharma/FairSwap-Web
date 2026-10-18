import { Sparkles } from "lucide-react";

export function RecentListingsSkeleton() {
  return (
    <section className="border-t border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-link" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Recent Verified Listings
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl border border-border bg-card/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
