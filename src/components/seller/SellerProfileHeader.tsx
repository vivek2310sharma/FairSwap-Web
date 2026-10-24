import Image from "next/image";
import { Calendar } from "lucide-react";
import type { PublicSellerProfile } from "@/types/account";
import { formatMemberSince, getAccountCopy } from "@/lib/account/copy";
import { ShareProfileButton } from "./ShareProfileButton";

interface SellerProfileHeaderProps {
  profile: PublicSellerProfile;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "F";
  const first = Array.from(parts[0])[0] ?? "F";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function SellerProfileHeader({ profile }: SellerProfileHeaderProps) {
  const copy = getAccountCopy("en");
  const name = profile.display_name || copy.memberFallback;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-8" aria-labelledby="seller-name">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={80}
              height={80}
              unoptimized
              className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-900 dark:bg-brand-950 dark:text-brand-300"
            >
              {initialsOf(name)}
            </div>
          )}
          <div className="min-w-0">
            <h1 id="seller-name" className="wrap-break-word text-2xl font-bold text-foreground">
              {name}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{formatMemberSince(profile.created_at)}</span>
            </p>
          </div>
        </div>

        <ShareProfileButton
          title={`${name} — ${copy.seller.shareTitle}`}
          label={copy.seller.share}
          copiedLabel={copy.seller.linkCopied}
          failedLabel={copy.seller.shareFailed}
        />
      </div>

      {profile.bio && (
        <div className="mt-6 border-t border-border/60 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{copy.seller.aboutSeller}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
        </div>
      )}
    </section>
  );
}
