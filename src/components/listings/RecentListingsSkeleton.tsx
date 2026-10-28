export function RecentListingsSkeleton() {
  return (
    <section aria-label="Loading recently approved ads" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-3 motion-safe:animate-pulse lg:col-span-3">
          <div className="h-3 w-20 rounded-md bg-border" />
          <div className="h-8 w-3/4 rounded-md bg-border" />
          <div className="h-4 w-full rounded-md bg-border" />
          <div className="h-12 w-32 rounded-full bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-9 lg:grid-cols-3 lg:gap-5">
          <div className="col-span-2 min-h-80 rounded-3xl bg-subtle motion-safe:animate-pulse sm:min-h-[26rem] lg:row-span-2" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-3xl bg-card ring-1 ring-border motion-safe:animate-pulse">
              <div className="aspect-4/5 w-full bg-subtle lg:aspect-square" />
              <div className="space-y-2 p-3 sm:p-4">
                <div className="h-6 w-20 rounded-md bg-border" />
                <div className="h-4 w-full rounded-md bg-border" />
                <div className="h-3.5 w-24 rounded-md bg-border" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
