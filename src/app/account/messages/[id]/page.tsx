import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/communication/ChatThread";
import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { type Conversation, type Message } from "@/types/communication";

export const metadata: Metadata = {
  title: "Conversation — FairSwap",
  description: "Chat with buyer or seller on FairSwap.",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = await params;
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect(`/auth/sign-in?next=/account/messages/${conversationId}`);
  }

  const userId = userData.user.id;

  // Fetch conversation with listing details
  const { data: convData, error: convError } = await supabase
    .from("conversations")
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      last_message_at,
      created_at,
      listing:listings (
        id,
        title,
        slug,
        status,
        price_paise,
        cover_photo_id
      )
    `)
    .eq("id", conversationId)
    .single();

  if (convError || !convData) {
    notFound();
  }

  // Ensure current user is a participant
  if (convData.buyer_id !== userId && convData.seller_id !== userId) {
    redirect("/account/messages");
  }

  // Fetch initial messages (ordered deterministically by created_at, id)
  const { data: messageData } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, client_request_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);

  const initialMessages: Message[] = (messageData || []) as Message[];

  // Determine counterparty ID
  const counterpartyId = convData.buyer_id === userId ? convData.seller_id : convData.buyer_id;

  // Check if either user has blocked the other
  let isBlocked = false;
  if (counterpartyId) {
    const { data: blockRows } = await supabase
      .from("user_blocks")
      .select("id")
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${counterpartyId}),and(blocker_id.eq.${counterpartyId},blocked_id.eq.${userId})`)
      .limit(1);

    if (blockRows && blockRows.length > 0) {
      isBlocked = true;
    }
  }

  // Fetch profiles safely
  const userIdsToFetch = [convData.buyer_id, convData.seller_id].filter(Boolean) as string[];
  const { data: profileRows } = userIdsToFetch.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIdsToFetch)
    : { data: [] };

  const profileMap = new Map((profileRows || []).map((p) => [p.id, p]));
  const buyerObj = convData.buyer_id ? profileMap.get(convData.buyer_id) || { id: convData.buyer_id, display_name: "Buyer", avatar_url: null } : null;
  const sellerObj = convData.seller_id ? profileMap.get(convData.seller_id) || { id: convData.seller_id, display_name: "Seller", avatar_url: null } : null;
  const listingObj = Array.isArray(convData.listing) ? convData.listing[0] : convData.listing;

  const conversation: Conversation = {
    id: convData.id,
    listing_id: convData.listing_id,
    buyer_id: convData.buyer_id,
    seller_id: convData.seller_id,
    last_message_at: convData.last_message_at,
    created_at: convData.created_at,
    listing: listingObj,
    buyer: buyerObj || undefined,
    seller: sellerObj || undefined,
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/account/messages"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Inbox
          </Link>

          {conversation.listing && (
            <Link
              href={`/listings/${conversation.listing.slug || conversation.listing.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <span>View Listing: <span className="font-semibold text-foreground">{conversation.listing.title}</span></span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="h-[calc(100vh-14rem)] min-h-[520px] max-h-[750px] overflow-hidden rounded-2xl">
          <ChatThread
            conversation={conversation}
            initialMessages={initialMessages}
            currentUserId={userId}
            isBlockedInitial={isBlocked}
          />
        </div>
      </div>
    </main>
  );
}
