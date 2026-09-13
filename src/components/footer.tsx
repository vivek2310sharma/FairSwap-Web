export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-foreground">
              <span className="text-brand-600">Fair</span>Swap
              <span className="text-muted">.in</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              India&apos;s local classifieds marketplace
            </p>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-xs text-muted">
              &copy; {currentYear} FairSwap. Development foundation.
            </p>
            <p className="mt-1 text-xs text-muted">
              This is a development build. Not a live service.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
