import type { Review, Trade } from "@/lib/ratings/contracts";
export const ids = { user: "10000000-0000-4000-8000-000000000001", peer: "10000000-0000-4000-8000-000000000002", trade: "10000000-0000-4000-8000-000000000003", conversation: "10000000-0000-4000-8000-000000000004", listing: "10000000-0000-4000-8000-000000000005", review: "10000000-0000-4000-8000-000000000006" };
export const at = "2026-10-26T10:00:00+05:30";
export const context = { trade_id: ids.trade, listing_id: ids.listing, listing_title: "Used chair", sold_at: at };
export const review: Review = { id: ids.review, author_id: ids.user, recipient_id: ids.peer, reviewer_role: "buyer", communication: 1, payment_item: 1, meetup: 1, score: 0, author_display_name: "Member", recipient_display_name: "Seller", context, body: "Useful feedback", tags: ["polite"], submitted_at: at, published_at: null, reply: null };
export const trade: Trade = { id: ids.trade, listing_id: ids.listing, conversation_id: ids.conversation, state: "pending_buyer", deadline: "2099-11-09T10:00:00+05:30", buyer_confirmed: false, can_dispute: true, my_review_id: null, my_rating_status: "pending" };
export const envelope = <T>(items: T[]) => ({ items, has_more: false, next_cursor: null });
