"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BellRing, Handshake, Heart, LifeBuoy, Lock, MessageSquare, Settings, ShoppingBag, Sprout, Star, UserRound } from "lucide-react";
import { AccountIdentity } from "@/components/account/AccountIdentity";
import { AccountTile } from "@/components/account/AccountTile";
import { ComingSoonDialog } from "@/components/account/ComingSoonDialog";
import { VerificationBanner } from "@/components/account/VerificationBanner";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getAccountCopy, type PreviewKey } from "@/lib/account/copy";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

interface AccountOverviewProps {
  displayName: string | null;
  email: string | null;
  city: string | null;
  memberSince: string | null;
  canEdit: boolean;
  publicProfileHref: string | null;
  showVerification: boolean;
  isRestricted: boolean;
  notices?: ReactNode;
}

const badgeClass =
  "rounded-full bg-action-100 px-2 py-0.5 text-xs font-semibold text-action-800 dark:bg-action-900 dark:text-action-100";

export function AccountOverview({
  displayName,
  email,
  city,
  memberSince,
  canEdit,
  publicProfileHref,
  showVerification,
  isRestricted,
  notices,
}: AccountOverviewProps) {
  const copy = getAccountCopy();
  const [preview, setPreview] = useState<PreviewKey | null>(null);
  // Remember the last preview so its copy stays rendered while the dialog closes.
  const [lastPreview, setLastPreview] = useState<PreviewKey>("verification");

  const open = (key: PreviewKey) => {
    setLastPreview(key);
    setPreview(key);
  };

  const t = copy.tiles;
  const comingSoon = <span className={badgeClass}>{copy.comingSoon}</span>;
  const linkClass =
    "inline-flex min-h-[44px] items-center rounded font-semibold text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 dark:text-action-300";

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {notices}

      <AccountIdentity
        displayName={displayName}
        email={email}
        city={city}
        memberSince={memberSince}
        canEdit={canEdit}
        publicProfileHref={publicProfileHref}
        onOpenRatings={() => open("ratings")}
      />

      {showVerification && <VerificationBanner onOpen={() => open("verification")} />}

      <nav aria-label="Account options">
        <ul className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card max-sm:divide-y max-sm:divide-border sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-3">
          <li>
            <AccountTile icon={UserRound} href="/account/profile" title={t.profile.title} description={t.profile.description} />
          </li>
          <li>
            <AccountTile icon={ShoppingBag} href="/account/listings" title={t.listings.title} description={t.listings.description} />
          </li>
          <li>
            <AccountTile icon={Handshake} href="/account/trades" title={t.trades.title} description={t.trades.description} badge={comingSoon} />
          </li>
          <li>
            <AccountTile icon={MessageSquare} href="/account/messages" title={t.chats.title} description={t.chats.description} />
          </li>
          <li>
            <AccountTile icon={Heart} href="/account/favourites" title={t.favourites.title} description={t.favourites.description} />
          </li>
          <li>
            <AccountTile
              icon={BellRing}
              onClick={() => open("savedSearches")}
              title={t.savedSearches.title}
              description={t.savedSearches.description}
              badge={comingSoon}
            />
          </li>
          <li>
            <AccountTile
              icon={Star}
              onClick={() => open("ratings")}
              title={t.ratings.title}
              description={t.ratings.description}
              badge={comingSoon}
            />
          </li>
          <li>
            <AccountTile
              icon={Sprout}
              onClick={() => open("fairseeds")}
              title={t.fairseeds.title}
              description={t.fairseeds.description}
              badge={comingSoon}
            />
          </li>
          <li>
            <AccountTile icon={Settings} href="/account/settings" title={t.settings.title} description={t.settings.description} />
          </li>
          <li>
            <AccountTile icon={Lock} href="/account/privacy" title={t.privacy.title} description={t.privacy.description} />
          </li>
          <li className="lg:col-span-2">
            <AccountTile
              icon={LifeBuoy}
              href="/account/support"
              title={t.help.title}
              description={isRestricted ? copy.helpRestrictedDescription : t.help.description}
            />
          </li>
        </ul>
      </nav>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl border border-border bg-card px-5 py-2 text-sm">
        <Link href="/account/security" className={linkClass}>
          Security settings
        </Link>
        <Link href="/account/notifications" className={linkClass}>
          Notifications
        </Link>
        <Link href="/safety" className={linkClass}>
          {copy.readSafetyTips}
        </Link>
        <a href={HELP_CENTRE_URL} className={linkClass}>
          Help Centre
        </a>
      </div>

      <SignOutButton className="sm:order-first sm:self-end" />

      <ComingSoonDialog
        open={preview !== null}
        title={copy.previews[lastPreview].title}
        body={copy.previews[lastPreview].body}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
