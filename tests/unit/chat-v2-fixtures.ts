import type { Conversation } from "@/types/communication";
import type { ChatMessage, InboxPage, MessagesPage } from "@/lib/chat-v2/contracts";
export const ids = { user: "11111111-1111-4111-8111-111111111111", peer: "22222222-2222-4222-8222-222222222222", conversation: "33333333-3333-4333-8333-333333333333", listing: "44444444-4444-4444-8444-444444444444", message: "55555555-5555-4555-8555-555555555555", next: "66666666-6666-4666-8666-666666666666", request: "77777777-7777-4777-8777-777777777777" };
export const message: ChatMessage = { id: ids.message, conversation_id: ids.conversation, sender_id: ids.peer, content: "Please share OTP", created_at: "2026-10-26T20:30:00.123456Z", client_request_id: ids.request };
export const conversation: Conversation = { id: ids.conversation, listing_id: ids.listing, buyer_id: ids.user, seller_id: ids.peer, created_at: message.created_at, last_message_at: message.created_at,
  buyer: { id: ids.user, display_name: "Buyer One", avatar_url: null }, seller: { id: ids.peer, display_name: "Seller One", avatar_url: null },
  listing: { id: ids.listing, title: "Blue bicycle", slug: "blue-bicycle", price_paise: 250000, status: "active", cover_photo_id: null } };
export const inbox: InboxPage = { items: [{ id: ids.conversation, conversation_id: ids.conversation, listing_id: ids.listing, is_group: false, enquiry_count: 1, unread_count: 2, is_selling: false,
  last_message_at: message.created_at, listing: conversation.listing!, peer_name: "Seller One", preview: "Is it available?", preview_is_own: true }], counts: { all: 127, buying: 120, selling: 7 }, has_more: false, next_cursor: null };
export const messages: MessagesPage = { items: [message], has_more: false, next_cursor: null, peer_read_cursor: null, findings: [] };
