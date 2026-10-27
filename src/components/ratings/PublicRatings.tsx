import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicRatingsEnabled, publicReviews, publicSummary } from "@/lib/ratings/server";
import { cursorSchema, scoreLabel, type Cursor } from "@/lib/ratings/contracts";
import { ratingsCopy } from "@/lib/ratings/copy";
import type { AccountLocale } from "@/lib/account/copy";
import { RefreshRatings, ReviewCard } from "./RatingUI";

export async function PublicSummary({ userId, locale = "en", dimensions = false }: { userId: string; locale?: AccountLocale; dimensions?: boolean }) {
  if (!publicRatingsEnabled()) return null;
  const result = await publicSummary(userId); const t = ratingsCopy(locale);
  if (result.error || !result.data) return <p className="text-sm text-muted">{t.unavailable}</p>;
  const s = result.data;
  return <section lang={locale} aria-label={t.title} className="space-y-2 rounded-xl border border-border p-4">
    <Link className="font-bold underline" href={`/seller/${userId}?tab=ratings&lang=${locale}`}>{scoreLabel(s.score, t.noScore)}</Link>
    <p className="text-sm">{t.reviews}: {s.published_review_count} · {t.completed}: {s.completed_trades}</p>
    {dimensions && s.score !== null && <div className="text-sm"><p>{t.dimensions}</p><dl className="grid gap-2 sm:grid-cols-3">{[[t.communication, s.communication_average], [`${t.item} / ${t.payment}`, s.payment_item_average], [`${t.handover} / ${t.pickup}`, s.meetup_average]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl></div>}
  </section>;
}
export async function PublicRatings({ userId, locale = "en", cursor = null }: { userId: string; locale?: AccountLocale; cursor?: Cursor | null }) {
  const t = ratingsCopy(locale);
  if (!publicRatingsEnabled()) return <p>{t.unavailable}</p>;
  if (!cursorSchema.nullable().safeParse(cursor).success) return <p>{t.unavailable}</p>;
  const [result, auth] = await Promise.all([publicReviews(userId, cursor), (await createClient()).auth.getUser()]);
  return <div lang={locale} className="space-y-4"><nav aria-label="Language" className="flex gap-4"><Link href="?tab=ratings&lang=en" lang="en">English</Link><Link href="?tab=ratings&lang=hi" lang="hi">हिन्दी</Link></nav>
    <PublicSummary userId={userId} locale={locale} dimensions />
    <RefreshRatings locale={locale} />
    {result.error ? <p role="alert">{t.unavailable}</p> : <>{!result.data.items.length && <p>{t.empty}</p>}{result.data.items.map(review => <ReviewCard key={review.id} review={review} viewerId={auth.data.user?.id} locale={locale} />)}
      {result.data.next_cursor && <Link className="inline-flex min-h-11 items-center underline" href={`?tab=ratings&lang=${locale}&before_at=${encodeURIComponent(result.data.next_cursor.before_at)}&before_id=${encodeURIComponent(result.data.next_cursor.before_id)}`}>{t.more}</Link>}</>}
  </div>;
}
