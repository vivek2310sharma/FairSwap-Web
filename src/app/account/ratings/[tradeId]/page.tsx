import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { TradeExperience } from "@/components/ratings/RatingUI";
import { ratingsCopy, ratingsLocale } from "@/lib/ratings/copy";
import { ratingsEnabled, ratingsSession, readTrade } from "@/lib/ratings/server";
import { ratingsRole } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate your trade — FairSwap", robots: { index: false, follow: false } };
export default async function TradeRatingPage({ params, searchParams }: { params: Promise<{ tradeId: string }>; searchParams: Promise<{ lang?: string }> }) {
  if (!ratingsEnabled()) notFound();
  const { tradeId } = await params; const locale = ratingsLocale((await searchParams).lang); const t = ratingsCopy(locale);
  const session = await ratingsSession(); if (session.error === "unauthenticated") redirect("/auth/sign-in?next=/account/ratings");
  const trade = session.error ? null : await readTrade(tradeId);
  const role = trade?.data?.conversation_id ? await ratingsRole(tradeId) : null;
  return <AccountPageShell title={t.title} width="lg"><div lang={locale} className="space-y-5">
    <Link href={`/account/ratings?lang=${locale}`} className="underline">{t.back}</Link>
    <nav aria-label="Language" className="flex gap-4"><Link href="?lang=en" lang="en">English</Link><Link href="?lang=hi" lang="hi">हिन्दी</Link></nav>
    {trade?.data ? <TradeExperience key={`${tradeId}:${session.userId}`} trade={trade.data} role={role?.data ?? null} locale={locale} /> : <p role="alert">{t.unavailable}</p>}
  </div></AccountPageShell>;
}
