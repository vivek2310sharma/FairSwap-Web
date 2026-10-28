import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { AccountRatingList, RefreshRatings, Safety } from "@/components/ratings/RatingUI";
import { ratingsCopy } from "@/lib/ratings/copy";
import { pendingCount, ratingsEnabled, ratingsSession, readPage } from "@/lib/ratings/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ratings — FairSwap", robots: { index: false, follow: false } };
export default async function RatingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; lang?: string }> }) {
  if (!ratingsEnabled()) notFound();
  const query = await searchParams; const locale = "en"; const t = ratingsCopy(locale);
  const session = await ratingsSession(); if (session.error === "unauthenticated") redirect("/auth/sign-in?next=/account/ratings");
  const tab = query.tab === "received" || query.tab === "given" ? query.tab : "pending";
  const [result, count] = session.error ? [null, null] : await Promise.all([readPage(tab === "pending" ? "ratings_pending" : tab === "given" ? "ratings_given_history" : "ratings_received", {}), pendingCount()]);
  return <AccountPageShell title={t.title} width="lg"><div lang={locale} className="space-y-6">
    <nav aria-label={t.title} className="flex flex-wrap gap-3">{(["pending", "received", "given"] as const).map(value => <Link key={value} aria-current={value === tab ? "page" : undefined} className="min-h-11 rounded-lg border border-border px-3 py-3" href={`?tab=${value}`}>{t[value]}{value === "pending" && count?.data !== undefined ? ` (${count.data})` : ""}</Link>)}</nav>
    <RefreshRatings locale={locale} />
    {session.error || result?.error || !result ? <p role="alert">{t.unavailable}</p> : <AccountRatingList key={`${session.userId}:${tab}:${JSON.stringify(result.data)}`} tab={tab} initial={result.data} viewerId={session.userId} locale={locale} />}
    <Safety locale={locale} />
  </div></AccountPageShell>;
}
