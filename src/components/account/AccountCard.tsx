import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface AccountCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Optional real figure, for example "3 live · 1 in review". Omit when it cannot be loaded. */
  meta?: string | null;
  /** Full-width card on desktop, used for the last card so a three-column grid has no orphan. */
  wide?: boolean;
}

/**
 * One account destination as a single full-card link.
 *
 * Below 640px it is a compact row inside the grouped list (icon, title, optional badge, chevron;
 * the description is hidden). From 640px up it is a standalone card with the description.
 */
export function AccountCard({ href, title, description, icon: Icon, meta, wide = false }: AccountCardProps) {
  return (
    <Link
      href={href}
      className={`group flex h-full min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 sm:min-h-[132px] sm:flex-col sm:items-start sm:justify-start sm:gap-4 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-5 sm:shadow-xs sm:hover:border-action-600/40 sm:focus-visible:outline-offset-2 ${
        wide ? "lg:min-h-0 lg:flex-row lg:items-center lg:justify-start" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-action-50 text-action-700 dark:bg-action-900/40 dark:text-action-300 sm:h-11 sm:w-11 sm:rounded-xl">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <span className={`min-w-0 flex-1 sm:w-full ${wide ? "lg:w-auto" : "sm:flex-none"}`}>
        <span className="block text-sm font-semibold text-foreground sm:text-base">{title}</span>
        <span className="mt-0.5 hidden text-sm text-muted dark:text-neutral-300 sm:block">{description}</span>
      </span>

      {meta ? (
        <span className="shrink-0 rounded-full bg-action-50 px-2 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900/40 dark:text-action-200">
          {meta}
        </span>
      ) : null}

      <ChevronRight
        className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 dark:text-neutral-300 sm:hidden"
        aria-hidden="true"
      />
    </Link>
  );
}
