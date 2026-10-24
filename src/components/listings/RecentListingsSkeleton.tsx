import { Sparkles } from "lucide-react";

export function RecentListingsSkeleton() {
  return (
    <section className="border-t border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-link" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Recent Verified Ads
          </h2>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              <div className="flex flex-1 flex-col p-4 animate-pulse">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="h-6 w-20 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-16 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="h-4 w-full rounded-md bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-2/3 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="mt-auto pt-3 flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded-sm bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-3.5 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
