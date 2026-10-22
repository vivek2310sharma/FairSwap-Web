import {
  UserRound,
  ShoppingBag,
  MessageCircle,
  Heart,
  Settings,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";
import { ACCOUNT_COPY } from "@/lib/account/copy";
import type { AccountOverview as AccountOverviewData } from "@/lib/account/overview";
import { AccountCard } from "./AccountCard";
import { AccountIdentity } from "./AccountIdentity";
import { AccountStatusNotice } from "./AccountStatusNotice";
import { ReportScamStrip } from "./ReportScamStrip";

/** Builds the "3 live · 1 in review" line from real counts only; null counts are omitted. */
export function formatListingMeta(counts: AccountOverviewData["counts"]): string | null {
  const parts: string[] = [];
  if (counts.activeListings !== null) parts.push(`${counts.activeListings} live`);
  if (counts.pendingReviewListings !== null) parts.push(`${counts.pendingReviewListings} in review`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AccountOverview({ overview }: { overview: AccountOverviewData }) {
  const isActive = overview.accountState === "active";
  const cards = ACCOUNT_COPY.cards;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="sr-only">{ACCOUNT_COPY.pageTitle}</h1>
      <AccountIdentity overview={overview} />
      <AccountStatusNotice state={overview.accountState} />

      <nav aria-label="Account sections">
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid sm:grid-cols-2 sm:gap-4 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none lg:grid-cols-3">
          <li>
            <AccountCard
              href="/account/profile"
              icon={UserRound}
              title={cards.profile.title}
              description={isActive ? cards.profile.description : cards.profile.descriptionRestricted}
            />
          </li>
          <li>
            <AccountCard
              href="/account/listings"
              icon={ShoppingBag}
              title={cards.listings.title}
              description={cards.listings.description}
              meta={isActive ? formatListingMeta(overview.counts) : null}
            />
          </li>
          <li>
            <AccountCard
              href="/account/messages"
              icon={MessageCircle}
              title={cards.chats.title}
              description={cards.chats.description}
            />
          </li>
          <li>
            <AccountCard
              href="/account/favourites"
              icon={Heart}
              title={cards.favourites.title}
              description={cards.favourites.description}
            />
          </li>
          <li>
            <AccountCard
              href="/account/settings"
              icon={Settings}
              title={cards.settings.title}
              description={cards.settings.description}
            />
          </li>
          <li>
            <AccountCard
              href="/account/privacy"
              icon={ShieldCheck}
              title={cards.privacy.title}
              description={cards.privacy.description}
            />
          </li>
          <li className="sm:col-span-2 lg:col-span-3">
            <AccountCard
              wide
              href="/account/support"
              icon={LifeBuoy}
              title={isActive ? cards.help.title : cards.help.titleRestricted}
              description={isActive ? cards.help.description : cards.help.descriptionRestricted}
            />
          </li>
        </ul>
      </nav>

      {isActive ? <ReportScamStrip /> : null}
    </div>
  );
}
