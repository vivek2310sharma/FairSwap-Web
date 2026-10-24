import Link from "next/link";
import { MapPin } from "lucide-react";
import { getAccountCopy } from "@/lib/account/copy";

interface AccountIdentityProps {
  displayName: string | null;
  email: string | null;
  city: string | null;
  memberSince: string | null;
  canEdit: boolean;
  publicProfileHref: string | null;
  onOpenRatings: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => Array.from(part)[0] ?? "");
  return letters.join("").toUpperCase();
}

export function AccountIdentity({
  displayName,
  email,
  city,
  memberSince,
  canEdit,
  publicProfileHref,
  onOpenRatings,
}: AccountIdentityProps) {
  const copy = getAccountCopy();
  const name = displayName?.trim() || copy.memberFallback;
  const initials = displayName?.trim() ? initialsOf(displayName) : "";

  const actionClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-action-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300 dark:hover:bg-brand-800";

  return (
    <section aria-label={name} className="flex items-center gap-4 sm:gap-6">
      <div
        aria-hidden="true"
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-brand-50 text-2xl font-bold text-brand-700 dark:bg-brand-800 dark:text-brand-100 sm:h-28 sm:w-28 sm:text-4xl"
      >
        {initials || <span className="text-brand-400">FS</span>}
      </div>
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-4xl">{name}</h1>
        {email && <p className="mt-1 break-all text-sm text-muted sm:text-base">{email}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {city}
            </span>
          )}
          {memberSince && (
            <span>
              {copy.memberSince} {memberSince}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenRatings}
            aria-haspopup="dialog"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded font-semibold text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300"
          >
            {copy.ratings}
            <span className="rounded-full bg-action-100 px-2 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100">
              {copy.comingSoon}
            </span>
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {canEdit && (
            <Link href="/account/profile" className={actionClass}>
              {copy.editProfile}
            </Link>
          )}
          {publicProfileHref && (
            <Link href={publicProfileHref} className={actionClass}>
              {copy.viewPublicProfile}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
