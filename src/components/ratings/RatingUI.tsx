"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import type { AccountLocale } from "@/lib/account/copy";
import * as c from "@/lib/ratings/contracts";
import { ratingsCopy } from "@/lib/ratings/copy";
import { ratingsPageAction, ratingsReplyAction, ratingsReportAction, ratingsSellAction, ratingsBuyerAction, ratingsSubmitAction } from "@/app/account/ratings/actions";

export const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-action-600 disabled:opacity-50";
export function RefreshRatings({ locale }: { locale: AccountLocale }) {
  const router = useRouter(); const [pending, start] = useTransition(); const t = ratingsCopy(locale);
  return <button className={buttonClass} disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? t.loading : t.refresh}</button>;
}
export function Safety({ locale }: { locale: AccountLocale }) {
  const t = ratingsCopy(locale);
  return <aside className="rounded-xl border border-border bg-surface p-4 text-sm"><ul className="list-disc space-y-1 pl-5">{t.safety.map(s => <li key={s}>{s}</li>)}</ul><p className="mt-3">{t.direct}</p></aside>;
}
export function DateLabel({ value, locale }: { value: string; locale: AccountLocale }) {
  return <time dateTime={value}>{new Date(value).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</time>;
}
export function ReviewCard({ review, viewerId, locale }: { review: c.Review; viewerId?: string; locale: AccountLocale }) {
  const t = ratingsCopy(locale); const router = useRouter();
  const [mode, setMode] = useState<"reply" | "report" | null>(null); const [text, setText] = useState("");
  const [message, setMessage] = useState(""); const [pending, start] = useTransition();
  const published = review.published_at !== null;
  const labels = [t.communication, review.reviewer_role === "buyer" ? t.item : t.payment, review.reviewer_role === "buyer" ? t.handover : t.pickup];
  const faces = [review.communication, review.payment_item, review.meetup];
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h3 className="font-semibold">{review.context.listing_title}</h3>
    <p className="text-sm text-muted">{review.author_display_name ?? t.member} · {t[review.reviewer_role]} · <DateLabel value={review.submitted_at} locale={locale} /></p>
    <p className="font-bold">{c.scoreLabel(review.score, t.noScore)}</p>
    <dl className="grid gap-2 text-sm sm:grid-cols-3">{labels.map((label, i) => <div key={label}><dt>{label}</dt><dd>{t.faces[faces[i] - 1]} ({faces[i]}/4)</dd></div>)}</dl>
    {!!review.tags.length && <ul className="flex flex-wrap gap-2 text-sm">{review.tags.filter(tag => !["sent_payment_link", "asked_advance_payment"].includes(tag)).map(tag => <li className="rounded bg-surface px-2 py-1" key={tag}>{t.tagLabels[tag] ?? tag}</li>)}</ul>}
    {review.body && <p className="break-words whitespace-pre-wrap">{review.body}</p>}
    {!published && <p className="text-sm text-muted">{t.sealed}</p>}
    {published && review.reply && <blockquote className="border-l-2 border-border pl-3"><p className="text-sm font-semibold">{t.reply}</p><p className="break-words whitespace-pre-wrap">{review.reply.body}</p><DateLabel value={review.reply.created_at} locale={locale} /></blockquote>}
    {published && <div className="flex flex-wrap gap-2">
      {viewerId === review.recipient_id && review.body && !review.reply && <button className={buttonClass} onClick={() => { setMode("reply"); setText(""); }}>{t.reply}</button>}
      {viewerId && viewerId !== review.author_id && <button className={buttonClass} onClick={() => { setMode("report"); setText(""); }}>{t.report}</button>}
    </div>}
    {mode && <form className="space-y-2" onSubmit={e => { e.preventDefault(); setMessage(""); start(async () => {
      try {
        const result = mode === "reply" ? await ratingsReplyAction({ review_id: review.id, body: text }) : await ratingsReportAction({ review_id: review.id, reason: text });
        setMessage(result.error ? t.unavailable : t.saved); if (!result.error) { setMode(null); setText(""); router.refresh(); }
      } catch { setMessage(t.unavailable); }
    }); }}>
      <label className="block">{mode === "reply" ? t.replyWarning : t.reason}<textarea required value={text} onChange={e => setText(e.target.value)} className="mt-2 block min-h-24 w-full rounded-lg border border-border bg-background p-3" /></label>
      <p className="text-sm">{Array.from(text.normalize("NFC")).length}/500</p>
      {!c.textSchema.safeParse(text).success && <p role="alert">{t.invalidText}</p>}
      <button className={buttonClass} disabled={pending || !(mode === "reply" ? c.requiredTextSchema : c.reasonSchema).safeParse(text).success}>{pending ? t.loading : mode === "reply" ? t.reply : t.report}</button>
      <button className={buttonClass} type="button" disabled={pending} onClick={() => setMode(null)}>{t.cancel}</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </article>;
}
type Envelope<T> = { items: T[]; next_cursor: c.Cursor | null; has_more: boolean };
export function PagedList<T>({ initial, schema, load, render, locale }: { initial: Envelope<T>; schema: z.ZodType<T>; load: (cursor: c.Cursor) => Promise<unknown>; render: (row: T) => ReactNode; locale: AccountLocale }) {
  const [page, setPage] = useState(initial); const [error, setError] = useState(false); const [pending, start] = useTransition(); const t = ratingsCopy(locale);
  return <div className="space-y-4">{page.items.length ? page.items.map((row, i) => <div key={i}>{render(row)}</div>) : <p className="rounded-xl border border-border p-6">{t.empty}</p>}
    {error && <p role="alert">{t.unavailable}</p>}
    {page.next_cursor && <button className={buttonClass} disabled={pending} onClick={() => start(async () => {
      try {
        const result = z.object({ data: c.pageSchema(schema) }).safeParse(await load(page.next_cursor!));
        if (!result.success) { setError(true); return; }
        setPage(old => ({ ...result.data.data, items: [...old.items, ...result.data.data.items] })); setError(false);
      } catch { setError(true); }
    })}>{pending ? t.loading : t.more}</button>}
  </div>;
}
export function AccountRatingList({ tab, initial, viewerId, locale }: { tab: "pending" | "received" | "given"; initial: unknown; viewerId: string; locale: AccountLocale }) {
  const t = ratingsCopy(locale);
  if (tab === "pending") {
    const page = c.pageSchema(c.pendingSchema).safeParse(initial); if (!page.success) return <p role="alert">{t.unavailable}</p>;
    return <PagedList initial={page.data} schema={c.pendingSchema} locale={locale} load={cursor => ratingsPageAction("ratings_pending", { cursor })} render={row => <article className="rounded-xl border border-border bg-card p-4">
      <p>{t.states[row.state]}</p><p className="text-sm">{t.deadline}: <DateLabel value={row.deadline} locale={locale} /></p>
      <Link className={buttonClass} href={`/account/ratings/${row.id}?lang=${locale}`}>{row.action === "select_buyer" ? t.selectBuyer : row.action === "confirm_and_rate" ? t.confirm : t.rate}</Link>
    </article>} />;
  }
  if (tab === "received") {
    const page = c.pageSchema(c.reviewSchema).safeParse(initial); if (!page.success || page.data.items.some(r => !r.published_at)) return <p role="alert">{t.unavailable}</p>;
    return <PagedList initial={page.data} schema={c.reviewSchema.refine(r => r.published_at !== null)} locale={locale} load={cursor => ratingsPageAction("ratings_received", { cursor })} render={review => <ReviewCard review={review} viewerId={viewerId} locale={locale} />} />;
  }
  const page = c.pageSchema(c.historySchema).safeParse(initial); if (!page.success) return <p role="alert">{t.unavailable}</p>;
  return <PagedList initial={page.data} schema={c.historySchema} locale={locale} load={cursor => ratingsPageAction("ratings_given_history", { cursor })} render={row => row.kind === "review" ? <ReviewCard review={row.review} viewerId={viewerId} locale={locale} /> : <article className="rounded-xl border border-border p-4"><h3>{row.context.listing_title}</h3><p>{t.notRated} · {t[row.my_role]} · <DateLabel value={row.at} locale={locale} /></p><p>{t.expired}</p></article>} />;
}
export function BuyerSelection({ listingId, locale, onDone }: { listingId: string; locale: AccountLocale; onDone?: () => void }) {
  const t = ratingsCopy(locale); const router = useRouter();
  const [page, setPage] = useState<Envelope<z.infer<typeof c.candidateSchema>> | null>(null);
  const [choice, setChoice] = useState<string>("pending"); const [error, setError] = useState(false); const [pending, start] = useTransition();
  const load = async (cursor: c.Cursor | null = null) => {
    setError(false);
    try {
      const result = await ratingsPageAction("ratings_buyer_candidates", { id: listingId, cursor });
      const parsed = c.pageSchema(c.candidateSchema).safeParse(result.data);
      if (!parsed.success) { setError(true); return; }
      setPage(old => ({ ...parsed.data, items: cursor ? [...old?.items ?? [], ...parsed.data.items] : parsed.data.items }));
    } catch { setError(true); }
  };
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label={t.selectBuyer}>
    <h2 className="font-bold">{t.selectBuyer}</h2><p>{t.selectionInfo}</p>
    {!page && <button className={buttonClass} disabled={pending} onClick={() => start(() => load())}>{pending ? t.loading : t.selectBuyer}</button>}
    <fieldset disabled={pending} className="space-y-2"><legend className="sr-only">{t.selectBuyer}</legend>
      {page?.items.map(row => <label className="flex min-h-11 items-center gap-3" key={row.id}><input type="radio" name={`buyer-${listingId}`} checked={choice === row.id} onChange={() => setChoice(row.id)} />{row.display_name}</label>)}
      {(["pending", "none"] as const).map(value => <label className="flex min-h-11 items-center gap-3" key={value}><input type="radio" name={`buyer-${listingId}`} checked={choice === value} onChange={() => setChoice(value)} />{value === "pending" ? t.notNow : t.none}</label>)}
    </fieldset>
    {page && !page.items.length && <p>{t.empty}</p>}
    {page?.next_cursor && <button className={buttonClass} disabled={pending} onClick={() => start(() => load(page.next_cursor))}>{t.more}</button>}
    {error && <p role="alert">{t.unavailable}</p>}
    <button className={buttonClass} disabled={pending} onClick={() => start(async () => {
      setError(false);
      try {
        const selecting = choice !== "pending" && choice !== "none";
        const result = await ratingsSellAction({ listing_id: listingId, choice: selecting ? "select" : choice, conversation_id: selecting ? choice : null });
        if (result.error) setError(true); else { onDone?.(); router.push(`/account/ratings/${result.data.trade_id}?lang=${locale}`); router.refresh(); }
      } catch { setError(true); }
    })}>{pending ? t.loading : t.sold}</button>
    <Safety locale={locale} />
  </section>;
}
export function TradeExperience({ trade, role, locale }: { trade: c.Trade; role: "buyer" | "seller" | null; locale: AccountLocale }) {
  const t = ratingsCopy(locale); const router = useRouter(); const [confirmed, setConfirmed] = useState(false); const [disputing, setDisputing] = useState(false);
  const [pending, start] = useTransition(); const [error, setError] = useState(""); const [frozen, setFrozen] = useState(false);
  const expired = c.isExpired(trade.deadline);
  async function buyer(action: "confirm" | "dispute") {
    setError("");
    try {
      const result = await ratingsBuyerAction({ trade_id: trade.id, action });
      if (result.error) { setError(result.error === "expired" ? t.expired : t.unavailable); return; }
      if (action === "confirm") setConfirmed(true); else setFrozen(true);
      router.refresh();
    } catch { setError(t.unavailable); }
  }
  if (trade.state === "pending_selection" && trade.listing_id && !expired) return <BuyerSelection listingId={trade.listing_id} locale={locale} />;
  return <div className="space-y-4"><p>{t.states[trade.state]}</p><p>{t.deadline}: <DateLabel value={trade.deadline} locale={locale} /></p>
    {error && <p role="alert">{error}</p>}
    {expired ? <p>{t.expired}</p> : trade.state === "disputed" || frozen ? <p>{t.states.disputed}</p> : trade.my_rating_status === "submitted" ? <p>{t.submitted}</p> : role && ["pending_buyer", "confirmed"].includes(trade.state) ? <>
      {role === "buyer" && !confirmed ? <div className="space-y-3"><p>{t.confirmInfo}</p><button className={buttonClass} disabled={pending} onClick={() => start(() => buyer("confirm"))}>{pending ? t.loading : t.confirm}</button></div>
        : <ReviewWizard tradeId={trade.id} role={role} locale={locale} />}
    </> : null}
    {role === "buyer" && trade.can_dispute && !expired && !frozen && <div>
      {disputing ? <><p>{t.disputeWarning}</p><button className={buttonClass} disabled={pending} onClick={() => start(() => buyer("dispute"))}>{t.dispute}</button><button className={buttonClass} disabled={pending} onClick={() => setDisputing(false)}>{t.cancel}</button></>
        : <button className={buttonClass} disabled={pending} onClick={() => setDisputing(true)}>{t.dispute}</button>}
    </div>}
    <Safety locale={locale} />
  </div>;
}
export function ReviewWizard({ tradeId, role, locale }: { tradeId: string; role: "buyer" | "seller"; locale: AccountLocale }) {
  const t = ratingsCopy(locale); const router = useRouter();
  const [faces, setFaces] = useState([0, 0, 0]); const [body, setBody] = useState(""); const [tags, setTags] = useState<string[]>([]);
  const [preview, setPreview] = useState(false); const [message, setMessage] = useState(""); const [done, setDone] = useState(false); const [pending, start] = useTransition();
  const labels = [t.communication, role === "buyer" ? t.item : t.payment, role === "buyer" ? t.handover : t.pickup];
  const payload = { trade_id: tradeId, communication: faces[0], payment_item: faces[1], meetup: faces[2], body, tags };
  const valid = c.submissionSchema.safeParse(payload).success;
  if (done) return <p role="status">{t.submitted}</p>;
  return <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (!valid) { setMessage(t.required); return; } if (!preview) { setPreview(true); return; }
    start(async () => { try { const result = await ratingsSubmitAction(payload); if (result.error) setMessage(result.error === "expired" ? t.expired : t.unavailable); else { setDone(true); router.refresh(); } } catch { setMessage(t.unavailable); } });
  }}>
    {preview ? <section aria-label={t.preview} className="space-y-2 rounded-xl border border-border p-4"><h2 className="font-bold">{t.preview}</h2>{labels.map((label, i) => <p key={label}>{label}: {t.faces[faces[i] - 1]} ({faces[i]}/4)</p>)}<p>{((faces.reduce((a, b) => a + b, 0) / 3 - 1) / 3 * 10).toFixed(1)}/10</p><p className="break-words">{body}</p><p>{tags.map(tag => t.tagLabels[tag]).join(" · ")}</p><p className="font-semibold">{t.immutable}</p></section>
      : <><p>{t.required}</p>{labels.map((label, index) => <fieldset key={label} disabled={pending}><legend className="mb-2 font-semibold">{label}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{t.faces.map((face, i) => <label key={face} className={`${buttonClass} gap-2 ${faces[index] === i + 1 ? "bg-action-100 dark:bg-action-950" : ""}`}><input required type="radio" name={`face-${index}`} value={i + 1} checked={faces[index] === i + 1} onChange={() => setFaces(old => old.map((f, j) => j === index ? i + 1 : f))} /><span aria-hidden="true">{["☹", "😐", "🙂", "😊"][i]}</span>{i + 1} {face}</label>)}</div></fieldset>)}
        <fieldset disabled={pending}><legend>{t.tags}</legend><div className="flex flex-wrap gap-2">{c.tagsFor(role).map(tag => <label className={`${buttonClass} gap-2`} key={tag}><input type="checkbox" checked={tags.includes(tag)} disabled={!tags.includes(tag) && tags.length >= 5} onChange={() => setTags(old => old.includes(tag) ? old.filter(v => v !== tag) : [...old, tag])} />{t.tagLabels[tag]}</label>)}</div></fieldset>
        <label className="block">{t.comment}<textarea value={body} onChange={e => setBody(e.target.value)} className="mt-2 block min-h-28 w-full rounded-lg border border-border bg-background p-3" /></label><p>{Array.from(body.normalize("NFC")).length}/500</p>{!c.textSchema.safeParse(body).success && <p role="alert">{t.invalidText}</p>}</>}
    <p className="text-sm text-muted">{t.sealed}</p>{message && <p role="alert">{message}</p>}
    {preview && <button className={buttonClass} type="button" disabled={pending} onClick={() => setPreview(false)}>{t.cancel}</button>}
    <button className={buttonClass} disabled={pending || !valid}>{pending ? t.loading : preview ? t.submit : t.preview}</button>
  </form>;
}
