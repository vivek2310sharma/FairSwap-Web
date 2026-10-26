import { TradeCards } from "@/components/ratings/TradeCards";
import { ratingsLocale } from "@/lib/ratings/copy";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { readInbox, readMessages } from "@/lib/chat-v2/server";
import { chatHref, inboxRequestSchema, uuid, timestamp, type ChatError } from "@/lib/chat-v2/contracts";
import { chatCopy } from "@/lib/chat-v2/copy";
import { ChatV2Inbox } from "./ChatV2Inbox";
import { ChatV2Thread } from "./ChatV2Thread";
import { ChatV2Failure } from "./ChatV2Failure";
import type { Conversation } from "@/types/communication";

const conversationSchema = z.object({ id: uuid, listing_id: uuid, buyer_id: uuid.nullable(), seller_id: uuid.nullable(),
  last_message_at: timestamp, created_at: timestamp,
  listing: z.object({ id: uuid, title: z.string(), slug: z.string(), status: z.string(), price_paise: z.number().nullable(), cover_photo_id: uuid.nullable() }).nullable(),
});
export type ChatSearchParams = { tab?: string; q?: string; unread?: string; listing_id?: string; lang?: string };

async function conversationDetails(id: string, userId: string): Promise<{ conversation: Conversation; blocked: boolean } | { error: ChatError }> {
  if (!uuid.safeParse(id).success) return { error: "invalid" };
  try {
    const db = await createClient();
    const result = await db.from("conversations").select("id,listing_id,buyer_id,seller_id,last_message_at,created_at,listing:listings(id,title,slug,status,price_paise,cover_photo_id)").eq("id", id).single();
    if (result.error) return { error: result.error.code === "PGRST116" || result.error.code === "42501" ? "forbidden" : "unavailable" };
    const parsed = conversationSchema.safeParse(result.data);
    if (!parsed.success) return { error: "unavailable" };
    const row = parsed.data;
    if (row.buyer_id !== userId && row.seller_id !== userId) return { error: "forbidden" };
    const ids = [row.buyer_id, row.seller_id].filter((value): value is string => !!value);
    const profiles = await db.from("profiles").select("id,display_name,avatar_url").in("id", ids);
    if (profiles.error) return { error: "unavailable" };
    const profileSchema = z.object({ id: uuid, display_name: z.string().nullable(), avatar_url: z.string().nullable() });
    const validProfiles = profileSchema.array().safeParse(profiles.data);
    if (!validProfiles.success) return { error: "unavailable" };
    const profile = (id: string | null) => {
      const p = validProfiles.data.find(p => p.id === id);
      return id ? { id, display_name: p?.display_name ?? chatCopy().deleted, avatar_url: p?.avatar_url ?? null } : undefined;
    };
    const peerId = row.buyer_id === userId ? row.seller_id : row.buyer_id;
    let blocked = false;
    if (peerId) {
      const blocks = await db.from("user_blocks").select("id")
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${userId})`).limit(1);
      if (blocks.error) return { error: "unavailable" };
      blocked = !!blocks.data?.length;
    }
    return { conversation: { ...row, listing: row.listing ?? undefined, buyer: profile(row.buyer_id), seller: profile(row.seller_id) }, blocked };
  } catch { return { error: "unavailable" }; }
}
export async function ChatV2Page({ conversationId, searchParams }: { conversationId?: string; searchParams?: Promise<ChatSearchParams> }) {
  const copy = chatCopy();
  const db = await createClient(); const auth = await db.auth.getUser();
  if (auth.error || !auth.data.user) redirect(`/auth/sign-in?next=${encodeURIComponent(`/account/messages${conversationId ? `/${conversationId}` : ""}`)}`);
  const params = await searchParams ?? {};
  const parsed = inboxRequestSchema.safeParse({ tab: params.tab ?? "all", query: params.q ?? "", unread: params.unread === "true", listingId: params.listing_id ?? null });
  if (!parsed.success || (params.unread !== undefined && !["true", "false"].includes(params.unread))) return <main className="p-5"><ChatV2Failure error="invalid" /></main>;
  const request = parsed.data;
  const inbox = await readInbox(request);
  let thread: React.ReactNode;
  if (conversationId) {
    const details = await conversationDetails(conversationId, auth.data.user.id);
    if ("error" in details) thread = <ChatV2Failure error={details.error} />;
    else {
      const messages = await readMessages({ conversationId });
      thread = messages.error ? <ChatV2Failure error={messages.error} /> : <ChatV2Thread key={`${auth.data.user.id}:${conversationId}`} conversation={details.conversation} initial={messages.data} currentUserId={auth.data.user.id} isBlockedInitial={details.blocked} />;
    }
  }
  return <main className="min-w-0 flex-1 bg-surface/20 px-0 py-2 sm:px-4 sm:py-4">
    <div className="mx-auto grid h-[calc(100dvh-11rem)] min-h-[480px] max-w-7xl overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[380px_minmax(0,1fr)]">
      <div data-testid="chat-v2-inbox-pane" className={`min-h-0 min-w-0 lg:border-r lg:border-border ${conversationId ? "hidden lg:block" : "block"}`}>
        <ChatV2Inbox key={`${auth.data.user.id}:${JSON.stringify(request)}`} initial={inbox} request={request} selectedId={conversationId} />
      </div>
      <div data-testid="chat-v2-thread-pane" className={`min-h-0 min-w-0 flex-col ${conversationId ? "flex" : "hidden lg:flex"}`}>
        {conversationId ? <><Link href={chatHref(request)} className="border-b border-border px-3 py-2 text-sm text-action-600 underline">{copy.back}</Link><TradeCards conversationId={conversationId} locale={ratingsLocale(params.lang)} /><div className="min-h-0 flex-1">{thread}</div></> : <p className="m-auto p-6 text-sm text-muted">{copy.select}</p>}
      </div>
    </div>
  </main>;
}
