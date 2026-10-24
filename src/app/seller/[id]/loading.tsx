export default function SellerProfileLoading() {
  return (
    <main className="flex-1 bg-surface/20" aria-busy="true" aria-label="Loading seller profile">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-8">
          <div className="h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-3">
            <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-4 w-56 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
        <div className="mt-8 h-11 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-4/5 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
    </main>
  );
}
