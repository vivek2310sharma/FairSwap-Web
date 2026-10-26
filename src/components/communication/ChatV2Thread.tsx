"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadChatMessages, loadChatFindings } from "@/lib/chat-v2/actions";
import { compareTuple, mergeMessages, messageSchema, type ChatError, type MessagesPage } from "@/lib/chat-v2/contracts";
import { chatCopy, type ChatLocale } from "@/lib/chat-v2/copy";
import { sendMessageAction, markConversationReadAction } from "@/app/account/messages/actions";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatChatDateTime, formatMessageTime } from "@/lib/formatters";
import type { Conversation } from "@/types/communication";
import { BlockDialog } from "./BlockDialog";
import { ReportDialog } from "./ReportDialog";
import { ChatV2Thumbnail } from "./ChatV2Thumbnail";
import { createClient } from "@/lib/supabase/client";

type Draft = { requestId: string; content: string; state: "pending" | "sent" | "failed"; redirectTo?: string };
const updateInbox = () => window.dispatchEvent(new Event("fairswap:chat-v2-inbox-refresh"));

export function ChatV2Thread({ conversation, initial, currentUserId, isBlockedInitial = false, locale = "en" }: {
  conversation: Conversation; initial: MessagesPage; currentUserId: string; isBlockedInitial?: boolean; locale?: ChatLocale;
}) {
  const copy = chatCopy(locale), { refreshUnreadCounts } = useAuth();
  const [messages, setMessages] = useState(initial.items), [peer, setPeer] = useState(initial.peer_read_cursor);
  const [findings, setFindings] = useState(initial.findings), [cursor, setCursor] = useState(initial.next_cursor);
  const [outbox, setOutbox] = useState<Draft[]>([]), [input, setInput] = useState("");
  const [error, setError] = useState<string>(), [olderBusy, setOlderBusy] = useState(false);
  const [accessError, setAccessError] = useState<ChatError>();
  const [readError, setReadError] = useState(false), [readRetry, setReadRetry] = useState(0);
  const [blocked, setBlocked] = useState(isBlockedInitial), [blockOpen, setBlockOpen] = useState(false);
  const [report, setReport] = useState<{ type: "user" | "message"; id: string }>();
  const [supabase] = useState(() => {
    // Kept browser-only; no privileged client is used by the thread.
    return createClient();
  });
  const stream = useRef<HTMLDivElement>(null), alive = useRef(true), refreshLock = useRef(false), olderLock = useRef(false);
  const sendLock = useRef(new Set<string>());
  const loadedInbound = useRef(initial.items.filter(row => row.sender_id !== currentUserId).map(row => row.id));
  const buyer = conversation.buyer_id === currentUserId;
  const other = buyer ? conversation.seller : conversation.buyer;
  const otherId = buyer ? conversation.seller_id : conversation.buyer_id;
  const closed = ["removed", "rejected"].includes(conversation.listing?.status ?? "");
  const integrate = useCallback((page: MessagesPage) => {
    loadedInbound.current = [...new Set([...loadedInbound.current, ...page.items.filter(row => row.sender_id !== currentUserId).map(row => row.id)])];
    setMessages(old => mergeMessages(old, page.items)); setPeer(page.peer_read_cursor);
    const ids = new Set(page.items.map(row => row.id));
    setFindings(old => [...old.filter(row => !ids.has(row.message_id)), ...page.findings]);
    setOutbox(old => old.filter(draft => !page.items.some(row => row.sender_id === currentUserId && row.client_request_id === draft.requestId)));
  }, [currentUserId]);
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    try {
      const result = await loadChatMessages({ conversationId: conversation.id, cursor: null });
      if (!alive.current) return;
      if (result.error) { setError(copy[result.error]); if (["forbidden", "unauthenticated", "disabled"].includes(result.error)) setAccessError(result.error); return; }
      integrate(result.data); setError(undefined); setAccessError(undefined);
      const freshIds = new Set(result.data.items.map(row => row.id));
      const olderIds = loadedInbound.current.filter(id => !freshIds.has(id));
      for (let start = 0; start < olderIds.length && alive.current; start += 100) {
        const ids = olderIds.slice(start, start + 100);
        const findings = await loadChatFindings({ conversationId: conversation.id, messageIds: ids });
        if (!alive.current) return;
        if (findings.error) { setError(copy[findings.error]); if (["forbidden", "unauthenticated", "disabled"].includes(findings.error)) setAccessError(findings.error); return; }
        setFindings(old => [...old.filter(row => !ids.includes(row.message_id)), ...findings.data]);
      }
    } catch { if (alive.current) setError(copy.unavailable); }
    finally { refreshLock.current = false; }
  }, [conversation.id, copy, integrate]);
  useEffect(() => {
    alive.current = true;
    const channel = supabase.channel(`chat-v2:${conversation.id}`).on("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}`,
    }, payload => {
      if (!alive.current) return;
      const row = messageSchema.safeParse(payload.new);
      if (!row.success || row.data.conversation_id !== conversation.id) { setError(copy.unavailable); return; }
      setMessages(old => mergeMessages(old, [row.data]));
      setOutbox(old => old.filter(draft => !(row.data.sender_id === currentUserId && row.data.client_request_id === draft.requestId)));
      updateInbox(); void refresh();
    }).subscribe();
    const update = () => { if (document.visibilityState === "visible") void refresh(); };
    // Findings and peer read states are eventually consistent; neither needs a new publication.
    const timer = window.setInterval(update, 15000); window.addEventListener("focus", update);
    return () => { alive.current = false; window.clearInterval(timer); window.removeEventListener("focus", update); void supabase.removeChannel(channel); };
  }, [conversation.id, currentUserId, copy, refresh, supabase]);
  const tail = messages.at(-1)?.id;
  const readAttempt = useRef<{ key: string; promise: ReturnType<typeof markConversationReadAction> } | null>(null);
  useEffect(() => {
    if (!tail) return;
    let active = true;
    const key = `${conversation.id}:${currentUserId}:${tail}:${readRetry}`;
    if (readAttempt.current?.key !== key) readAttempt.current = { key, promise: Promise.resolve().then(() => markConversationReadAction(conversation.id, tail)) };
    void readAttempt.current.promise.then(async result => {
      if (!active) return;
      setReadError(!result.success);
      if (result.success) { updateInbox(); await refreshUnreadCounts(); }
    }).catch(() => { if (active) setReadError(true); });
    return () => { active = false; };
  }, [conversation.id, currentUserId, tail, readRetry, refreshUnreadCounts]);
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [tail, outbox.length]);
  async function older() {
    if (!cursor || olderLock.current) return;
    olderLock.current = true; setOlderBusy(true); const previous = stream.current?.scrollHeight ?? 0;
    try {
      const result = await loadChatMessages({ conversationId: conversation.id, cursor });
      if (!alive.current) return;
      if (result.error) { setError(copy[result.error]); if (["forbidden", "unauthenticated", "disabled"].includes(result.error)) setAccessError(result.error); return; }
      integrate(result.data); setCursor(result.data.next_cursor); setError(undefined);
      requestAnimationFrame(() => { if (stream.current) stream.current.scrollTop += stream.current.scrollHeight - previous; });
    } catch { if (alive.current) setError(copy.unavailable); }
    finally { olderLock.current = false; if (alive.current) setOlderBusy(false); }
  }
  async function send(draft: Draft) {
    if (sendLock.current.has(draft.requestId) || blocked || closed || accessError) return;
    sendLock.current.add(draft.requestId);
    setOutbox(old => old.map(row => row.requestId === draft.requestId ? { ...row, state: "pending", redirectTo: undefined } : row));
    try {
      const result = await sendMessageAction(conversation.id, draft.content, draft.requestId);
      if (!alive.current) return;
      if (!result.success || !result.messageId) {
        setOutbox(old => old.map(row => row.requestId === draft.requestId ? { ...row, state: "failed", redirectTo: result.requiresPolicyReview ? result.redirectTo : undefined } : row));
        return;
      }
      // Acknowledged IDs have no invented timestamp or delivery receipt. Fetch canonical rows.
      setOutbox(old => old.map(row => row.requestId === draft.requestId ? { ...row, state: "sent" } : row));
      updateInbox(); await refresh();
    } catch { if (alive.current) setOutbox(old => old.map(row => row.requestId === draft.requestId ? { ...row, state: "failed" } : row)); }
    finally { sendLock.current.delete(draft.requestId); }
  }
  function submit(event?: React.FormEvent) {
    event?.preventDefault(); const content = input.trim(); if (!content || blocked || closed || accessError) return;
    const draft: Draft = { requestId: crypto.randomUUID(), content, state: "pending" };
    setOutbox(old => [...old, draft]); setInput(""); void send(draft);
  }
  if (accessError) return <section role="alert" className="p-5"><p>{copy[accessError]}</p><button className="mt-3 underline" onClick={() => void refresh()}>{copy.retry}</button></section>;
  return <section className="flex h-full min-h-0 flex-col bg-card" aria-label={other?.display_name ?? copy.deleted}>
    <header className="flex items-center justify-between gap-2 border-b border-border p-3">
      <h2 className="min-w-0 truncate font-semibold">{other?.display_name ?? copy.deleted} <span className="text-xs text-muted">{buyer ? copy.seller : copy.buyer}</span></h2>
      {otherId && <div className="flex gap-2"><button className="rounded-lg border border-border p-2 text-xs" onClick={() => setReport({ type: "user", id: otherId })}>{copy.reportUser}</button><button className="rounded-lg border border-border p-2 text-xs" onClick={() => setBlockOpen(true)}>{copy.blockUser}</button></div>}
    </header>
    {conversation.listing && <Link className="flex gap-3 border-b border-border p-3" href={`/listings/${conversation.listing.slug || conversation.listing.id}`}>
      <ChatV2Thumbnail key={conversation.listing.cover_photo_id} listingId={conversation.listing_id} photoId={conversation.listing.cover_photo_id} label={copy.noPhoto} />
      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{conversation.listing.title}</span><span className="block text-xs">{conversation.listing.price_paise === null ? "—" : `₹${(conversation.listing.price_paise / 100).toLocaleString("en-IN")}`} · {conversation.listing.status}</span><span className="text-xs underline">{copy.viewAd}</span></span>
    </Link>}
    <p className="border-b border-border bg-surface px-3 py-2 text-xs" aria-label={copy.safetyTitle}>{copy.safety}</p>
    {error && <div role="alert" className="border-b border-border p-3 text-sm">{error} <button className="underline" onClick={() => void refresh()}>{copy.retry}</button></div>}
    <div ref={stream} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-label={copy.messages} aria-busy={olderBusy}>
      {cursor && <button className="w-full rounded-xl border border-border p-2 text-sm" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? copy.loading : copy.older}</button>}
      {messages.length === 0 && outbox.length === 0 && <p className="text-sm text-muted">{copy.emptyThread}</p>}
      {messages.map((message, index) => {
        const own = message.sender_id === currentUserId;
        const date = formatChatDateTime(message.created_at, locale, true);
        const finding = !own ? findings.find(row => row.message_id === message.id && row.recipient_id === currentUserId) : undefined;
        const seen = own && peer && compareTuple({ at: message.created_at, id: message.id }, peer) <= 0;
        return <div key={message.id}>
          {(index === 0 || formatChatDateTime(messages[index - 1].created_at, locale, true) !== date) && <p className="my-3 text-center text-xs text-muted">{date}</p>}
          <div className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${own ? "bg-action-600 text-white" : "border border-border bg-surface"}`}>{message.content}</p>
            <span className="mt-1 text-[11px] text-muted"><time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>{own && ` · ${seen ? copy.seen : copy.sent}`}</span>
            {finding && <aside className="mt-1 max-w-[90%] rounded-xl border border-amber-400 bg-surface p-2 text-xs"><strong>{copy.warning}</strong><ul>{finding.rule_ids.map(rule => <li key={rule}>{copy[rule]}</li>)}</ul></aside>}
            {!own && <button className="mt-1 p-1 text-xs text-muted underline" onClick={() => setReport({ type: "message", id: message.id })}>{copy.reportMessage}</button>}
          </div>
        </div>;
      })}
      {outbox.map(draft => <div key={draft.requestId} className="flex flex-col items-end"><p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-action-600 px-3 py-2 text-sm text-white [overflow-wrap:anywhere]">{draft.content}</p><span role="status" className="text-xs text-muted">{copy[draft.state]}</span>
        {draft.state === "failed" && <div className="flex gap-3 text-sm">{draft.redirectTo && <Link href={draft.redirectTo} className="underline">{copy.policy}</Link>}<button className="p-2 underline" onClick={() => void send(draft)} disabled={blocked || closed}>{copy.retry}</button></div>}
      </div>)}
    </div>
    {readError && <div role="alert" className="px-3 py-2 text-xs">{copy.readError} <button className="underline" onClick={() => setReadRetry(value => value + 1)}>{copy.retry}</button></div>}
    {blocked || closed ? <p className="border-t border-border p-3 text-sm">{blocked ? copy.blocked : copy.closed}</p> : <form className="flex shrink-0 items-end gap-2 border-t border-border p-3" onSubmit={submit}>
      <textarea className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-card p-3 text-sm" aria-label={copy.placeholder} placeholder={copy.placeholder} rows={2} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} />
      <button type="submit" className="rounded-xl bg-action-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40" disabled={!input.trim()}>{copy.send}</button>
    </form>}
    <ReportDialog isOpen={!!report} onClose={() => setReport(undefined)} targetType={report?.type ?? "user"} targetId={report?.id ?? ""} />
    {otherId && <BlockDialog isOpen={blockOpen} onClose={() => setBlockOpen(false)} targetUserId={otherId} targetUserName={other?.display_name ?? copy.deleted} onBlocked={() => setBlocked(true)} />}
  </section>;
}
