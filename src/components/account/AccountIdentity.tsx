import Link from "next/link";
import { Calendar, Mail, MapPin } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { ACCOUNT_COPY } from "@/lib/account/copy";
import { formatMonthYear } from "@/lib/formatters";
import type { AccountOverview } from "@/lib/account/overview";

/**
 * Identity block: initials avatar, name, owner-only email, city, member-since and Sign out.
 *
 * Avatars are initials only. `profiles.avatar_url` is not rendered because ACC-01 has no
 * upload flow and the column accepts arbitrary text.
 * The email is read from the authenticated session and is never shown on public profiles.
 */
export function AccountIdentity({ overview }: { overview: AccountOverview }) {
  const memberSince = formatMonthYear(overview.memberSince);
  const location = [overview.city, overview.state].filter(Boolean).join(", ");
  // Another user's profile page is only served for active accounts (RLS), so hide the link otherwise.
  const canViewPublicProfile = overview.accountState === "active";

  return (
    <section
      aria-label="Account identity"
      className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-action-600 text-2xl font-bold text-white sm:h-20 sm:w-20 sm:text-3xl"
          >
            {overview.initial}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {overview.displayName ?? ACCOUNT_COPY.pageTitle}
            </h2>

            <ul className="mt-1.5 space-y-1 text-sm text-muted dark:text-neutral-300">
              {overview.email ? (
                <li className="flex items-center gap-1.5 break-all">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{overview.email}</span>
                </li>
              ) : null}
              {location ? (
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{location}</span>
                </li>
              ) : null}
              {memberSince ? (
                <li className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {ACCOUNT_COPY.memberSince} {memberSince}
                  </span>
                </li>
              ) : null}
            </ul>

            {canViewPublicProfile ? (
              <Link
                href={`/seller/${overview.userId}`}
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-link underline-offset-2 hover:underline sm:rounded-lg sm:border sm:border-border sm:px-3 sm:no-underline sm:hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {ACCOUNT_COPY.viewPublicProfile}
              </Link>
            ) : null}
          </div>
        </div>

        <form action={signOutAction} className="sm:shrink-0">
          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:w-auto"
          >
            {ACCOUNT_COPY.signOut}
          </button>
        </form>
      </div>
    </section>
  );
}
