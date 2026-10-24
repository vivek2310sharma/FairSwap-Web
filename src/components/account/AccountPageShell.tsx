import Link from "next/link";
import type { ReactNode } from "react";
import { getAccountCopy } from "@/lib/account/copy";

interface AccountPageShellProps {
  title: string;
  description?: string;
  /** Narrow forms use "md"; wider pages use "lg". */
  width?: "md" | "lg";
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}

const widths = { md: "max-w-2xl", lg: "max-w-4xl" } as const;

/** Shared header, spacing and semantic tokens for account sub-pages. */
export function AccountPageShell({
  title,
  description,
  width = "md",
  backHref = "/account",
  backLabel,
  children,
}: AccountPageShellProps) {
  const copy = getAccountCopy();
  return (
    <div className={`mx-auto w-full ${widths[width]} px-4 py-6 sm:px-6 sm:py-10`}>
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <Link
          href={backHref}
          className="hidden min-h-[44px] shrink-0 items-center rounded sm:inline-flex text-sm font-semibold text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300"
        >
          {backLabel ?? copy.backToAccount}
        </Link>
      </div>
      {children}
    </div>
  );
}
