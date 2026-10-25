import { Sparkles } from "lucide-react";

export function RecentListingsSkeleton() {
  return (
    <section className="border-t border-border py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Recently Approved Ads
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-subtle motion-safe:animate-pulse" />
              <div className="flex flex-1 flex-col p-4 motion-safe:animate-pulse">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="h-6 w-20 rounded-md bg-border" />
                  <div className="h-4 w-16 rounded-md bg-border" />
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="h-4 w-full rounded-md bg-border" />
                  <div className="h-4 w-2/3 rounded-md bg-border" />
                </div>
                <div className="mt-auto pt-3 flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded-sm bg-border" />
                  <div className="h-3.5 w-24 rounded-md bg-border" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
