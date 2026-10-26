"use client";
import { ratingsPageAction } from "@/app/account/ratings/actions";
import { eventSchema, pageSchema } from "@/lib/ratings/contracts";
import { ratingsCopy } from "@/lib/ratings/copy";
import { DateLabel, PagedList } from "./RatingUI";
import type { AccountLocale } from "@/lib/account/copy";
export function TradeEventList({ tradeId, initial, locale = "en" }: { tradeId: string; initial: unknown; locale?: AccountLocale }) {
  const t = ratingsCopy(locale); const page = pageSchema(eventSchema).safeParse(initial);
  if (!page.success) return <p>{t.unavailable}</p>;
  return <details><summary className="min-h-11 cursor-pointer">{t.title}</summary><PagedList key={JSON.stringify(page.data)} initial={page.data} schema={eventSchema.refine(e => e.trade_id === tradeId)} locale={locale} load={cursor => ratingsPageAction("ratings_events", { id: tradeId, cursor })} render={event => <p>{t.events[event.kind]} · <DateLabel value={event.created_at} locale={locale} /></p>} /></details>;
}
