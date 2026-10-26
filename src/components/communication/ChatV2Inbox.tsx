"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadChatInbox } from "@/lib/chat-v2/actions";
import { chatHref, mergeInbox, type InboxPage, type InboxRequest, type Result } from "@/lib/chat-v2/contracts";
import { chatCopy, type ChatLocale } from "@/lib/chat-v2/copy";
import { formatChatDateTime } from "@/lib/formatters";
import { ChatV2Thumbnail } from "./ChatV2Thumbnail";

export function ChatV2Inbox({ initial, request, selectedId, locale = "en" }: { initial: Result<InboxPage>; request: InboxRequest; selectedId?: string; locale?: ChatLocale }) {
  const copy = chatCopy(locale), router = useRouter();
  const [page, setPage] = useState(initial.data), [error, setError] = useState(initial.error);
  const [busy, setBusy] = useState(false), [query, setQuery] = useState(request.query);
  const lock = useRef(false), generation = useRef(0);
  const mounted = useRef(true);
  async function refresh(append = false) {
    if (lock.current) { if (!append) generation.current++; return; }
    lock.current = true; setBusy(true); const current = generation.current;
    try {
      const result = await loadChatInbox({ ...request, cursor: append ? page?.next_cursor ?? null : null });
      if (!mounted.current) return;
      if (result.error) { setError(result.error); if (["forbidden", "unauthenticated", "disabled"].includes(result.error)) setPage(undefined); return; }
      setError(undefined);
      // A refresh always replaces the window and cursor. Group representatives can change.
      setPage(old => append && old && current === generation.current
        ? { ...result.data, items: mergeInbox(old.items, result.data.items, request.listingId !== null) }
        : result.data);
    } catch { if (mounted.current) setError("unavailable"); }
    finally { lock.current = false; if (mounted.current) { setBusy(false); if (current !== generation.current) void refresh(); } }
  }
  useEffect(() => {
    mounted.current = true;
    let active = true;
    const update = () => { if (active && document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("fairswap:chat-v2-inbox-refresh", update); window.addEventListener("focus", update);
    return () => { mounted.current = false; active = false; window.clearInterval(timer); window.removeEventListener("fairswap:chat-v2-inbox-refresh", update); window.removeEventListener("focus", update); };
    // Parent keys this component by the complete route/filter identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);
  return <section aria-label={copy.messages} className="flex h-full min-h-0 flex-col">
    <h1 className="px-4 pt-4 text-xl font-bold">{copy.messages}</h1>
    <nav aria-label={copy.messages} className="flex gap-1 p-3">
      {(["all", "buying", "selling"] as const).map(tab => <Link key={tab} href={chatHref({ ...request, tab, listingId: null, cursor: null })} aria-current={request.tab === tab ? "page" : undefined}
        className={`flex-1 rounded-xl px-2 py-2 text-center text-sm font-semibold ${request.tab === tab ? "bg-action-600 text-white" : "bg-surface text-foreground"}`}>
        {copy[tab]} {page ? `(${page.counts[tab]})` : ""}
      </Link>)}
    </nav>
    {request.listingId && <Link className="px-4 text-sm text-action-600 underline" href={chatHref({ ...request, listingId: null })}>{copy.groupBack}</Link>}
    <form className="space-y-2 border-b border-border p-3" onSubmit={event => { event.preventDefault(); router.push(chatHref({ ...request, query, cursor: null })); }}>
      <div className="flex gap-2"><input aria-label={copy.search} placeholder={copy.search} value={query} onChange={event => setQuery(event.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm" />
        <button className="rounded-xl border border-border px-3 text-sm" type="submit">{copy.searchButton}</button></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={request.unread} onChange={event => router.push(chatHref({ ...request, query, unread: event.target.checked, cursor: null }))} />{copy.unread}</label>
      {request.unread && <p className="text-xs text-muted">{copy.countsHint}</p>}
    </form>
    <div aria-busy={busy} className="min-h-0 flex-1 overflow-y-auto p-3">
      {error && <div role="alert" className="mb-3 rounded-xl border border-border p-3 text-sm"><p>{copy[error]}</p><button className="mt-2 underline" onClick={() => void refresh()} disabled={busy}>{copy.retry}</button></div>}
      {!error && page?.items.length === 0 && <p className="p-4 text-sm text-muted">{request.query || request.unread || request.listingId ? copy.emptyFiltered : request.tab === "buying" ? copy.emptyBuying : request.tab === "selling" ? copy.emptySelling : copy.emptyAll}</p>}
      <ul className="space-y-2">{page?.items.map(row => <li key={row.is_group ? `listing:${row.listing_id}` : row.id}>
        <Link href={row.is_group ? chatHref({ ...request, tab: "selling", listingId: row.listing_id, cursor: null }) : chatHref(request, row.conversation_id!)}
          aria-current={selectedId === row.conversation_id ? "page" : undefined}
          className={`flex gap-3 rounded-xl border p-3 ${selectedId === row.conversation_id ? "border-action-600 bg-surface" : "border-border bg-card"}`}>
          <ChatV2Thumbnail key={row.listing.cover_photo_id} listingId={row.listing_id} photoId={row.listing.cover_photo_id} label={copy.noPhoto} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{row.is_group ? row.listing.title : row.peer_name || copy.deleted}</span>
            <span className="block truncate text-xs">{row.is_group ? `${row.enquiry_count} ${copy.enquiries}` : `${row.is_selling ? copy.buyer : copy.seller} · ${row.listing.title}`}</span>
            <span className="block truncate text-xs text-muted">{row.preview_is_own ? copy.own : ""}{row.preview ?? copy.noPreview}</span>
            <span className="block text-xs">{row.listing.price_paise === null ? "—" : `₹${(row.listing.price_paise / 100).toLocaleString("en-IN")}`} · {row.listing.status}</span>
            <time dateTime={row.last_message_at} className="text-[11px] text-muted">{formatChatDateTime(row.last_message_at, locale)}</time>
          </span>
          {row.unread_count > 0 && <span className="h-fit rounded-full bg-action-600 px-2 py-1 text-xs text-white" aria-label={`${row.unread_count} ${copy.unreadMessages}`}>{row.unread_count}</span>}
        </Link>
      </li>)}</ul>
      {page?.has_more && <button disabled={busy} className="mt-3 w-full rounded-xl border border-border p-3 text-sm" onClick={() => void refresh(true)}>{busy ? copy.loading : copy.loadMore}</button>}
      <span role="status" className="sr-only">{busy ? copy.loading : ""}</span>
    </div>
  </section>;
}
