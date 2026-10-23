import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  baseUrl?: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  searchParams: Record<string, string | undefined>;
}

export function Pagination({
  baseUrl = "/search",
  currentPage,
  totalPages,
  totalCount,
  perPage,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
    params.set("page", page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalCount);

  // Generate page numbers array with ellipsis
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Pagination Navigation"
      className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row"
    >
      <p className="text-xs text-muted">
        Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
        <span className="font-semibold text-foreground">{endItem}</span> of{" "}
        <span className="font-semibold text-foreground">{totalCount}</span> results
      </p>

      <div className="flex items-center gap-1">
        {/* Previous Page Link */}
        {currentPage > 1 ? (
          <Link
            href={createPageUrl(currentPage - 1)}
            aria-label="Go to previous page"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted/50 cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </span>
        )}

        {/* Numeric Page Links */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted">
                  &hellip;
                </span>
              );
            }

            const pageNum = Number(p);
            const isCurrent = pageNum === currentPage;

            return (
              <Link
                key={pageNum}
                href={createPageUrl(pageNum)}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`min-w-8 rounded-lg px-2.5 py-1.5 text-center text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-action-600 font-semibold text-white"
                    : "border border-border text-foreground hover:bg-surface"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* Next Page Link */}
        {currentPage < totalPages ? (
          <Link
            href={createPageUrl(currentPage + 1)}
            aria-label="Go to next page"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted/50 cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
