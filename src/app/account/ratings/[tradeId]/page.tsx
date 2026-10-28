import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { TradeExperience } from "@/components/ratings/RatingUI";
import { ratingsCopy } from "@/lib/ratings/copy";
import { ratingsEnabled, ratingsSession, readTrade } from "@/lib/ratings/server";
import { ratingsRole } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate your trade — FairSwap", robots: { index: false, follow: false } };
export default async function TradeRatingPage({ params }: { params: Promise<{ tradeId: string }> }) {
  if (!ratingsEnabled()) notFound();
  const { tradeId } = await params; const locale = "en"; const t = ratingsCopy(locale);
  const session = await ratingsSession(); if (session.error === "unauthenticated") redirect("/auth/sign-in?next=/account/ratings");
  const trade = session.error ? null : await readTrade(tradeId);
  const role = trade?.data?.conversation_id ? await ratingsRole(tradeId) : null;
  return <AccountPageShell title={t.title} width="lg"><div lang={locale} className="space-y-5">
    <Link href={`/account/ratings`} className="underline">{t.back}</Link>
    {trade?.data ? <TradeExperience key={`${tradeId}:${session.userId}`} trade={trade.data} role={role?.data ?? null} locale={locale} /> : <p role="alert">{t.unavailable}</p>}
  </div></AccountPageShell>;
}
