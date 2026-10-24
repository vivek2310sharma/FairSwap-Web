import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

interface AccountTileProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
}

const tileClass =
  "group flex min-h-[64px] w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action-500 dark:hover:bg-brand-800/50 " +
  "sm:h-full sm:flex-col sm:items-start sm:gap-3 sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:p-6 sm:shadow-sm sm:focus-visible:ring-inset";

/** One primary destination: a real link for navigation or a real button for a preview dialog. */
export function AccountTile({ icon: Icon, title, description, href, external, onClick, badge }: AccountTileProps) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action-100 text-action-800 dark:bg-action-900 dark:text-action-100 sm:h-11 sm:w-11">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-foreground sm:text-lg">{title}</span>
          {badge}
        </span>
        <span className="mt-0.5 block break-words text-sm text-muted max-sm:hidden">{description}</span>
        <span className="sr-only sm:hidden">{description}</span>
      </span>
    </>
  );

  if (href) {
    return external ? (
      <a href={href} className={tileClass}>
        {content}
      </a>
    ) : (
      <Link href={href} className={tileClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className={tileClass}>
      {content}
    </button>
  );
}
