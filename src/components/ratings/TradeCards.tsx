import Link from "next/link";
import { ratingsEnabled, readPage, readTrade } from "@/lib/ratings/server";
import { ratingsCopy } from "@/lib/ratings/copy";
import { DateLabel } from "./RatingUI";
import { TradeEventList } from "./TradeEventList";
import type { AccountLocale } from "@/lib/account/copy";

export async function TradeCards({ conversationId, locale = "en" }: { conversationId: string; locale?: AccountLocale }) {
  if (!ratingsEnabled()) return null;
  const t = ratingsCopy(locale); const trade = await readTrade(conversationId, true);
  if (trade.error) return <aside className="p-3 text-sm">{t.unavailable}</aside>;
  if (!trade.data) return null;
  const events = await readPage("ratings_events", { id: trade.data.id });
  return <aside lang={locale} aria-label={t.title} className="space-y-2 border-b border-border bg-surface p-3 text-sm">
    <p className="font-semibold">FairSwap · {t.states[trade.data.state]}</p>
    <p>{t.deadline}: <DateLabel value={trade.data.deadline} locale={locale} /></p>
    {events.error ? <p>{t.unavailable}</p> : <TradeEventList tradeId={trade.data.id} initial={events.data} locale={locale} />}
    <Link className="inline-flex min-h-11 items-center underline" href={`/account/ratings/${trade.data.id}`}>{t.title}</Link>
  </aside>;
}
