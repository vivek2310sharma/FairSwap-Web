import { z } from "zod";

export const uuid = z.string().uuid();
export const timestamp = z.string().datetime({ offset: true });
export const cursorSchema = z.object({ before_at: timestamp, before_id: uuid }).strict();
export type Cursor = z.infer<typeof cursorSchema>;
export const stateSchema = z.enum(["pending_selection", "pending_buyer", "confirmed", "disputed", "unattributed", "expired_unconfirmed"]);
export const faceSchema = z.number().int().min(1).max(4);
export const contextSchema = z.object({ trade_id: uuid, listing_id: uuid.nullable(), listing_title: z.string(), sold_at: timestamp }).strict();
export const reviewSchema = z.object({
  id: uuid, author_id: uuid.nullable(), recipient_id: uuid.nullable(), reviewer_role: z.enum(["buyer", "seller"]),
  communication: faceSchema, payment_item: faceSchema, meetup: faceSchema, score: z.number().min(0).max(10),
  author_display_name: z.string().nullable(), recipient_display_name: z.string().nullable(), context: contextSchema,
  body: z.string().nullable(), tags: z.array(z.string()).max(5), submitted_at: timestamp, published_at: timestamp.nullable(),
  reply: z.object({ body: z.string(), created_at: timestamp }).strict().nullable(),
}).strict();
export type Review = z.infer<typeof reviewSchema>;
export const tradeSchema = z.object({ id: uuid, listing_id: uuid.nullable(), conversation_id: uuid.nullable(), state: stateSchema,
  deadline: timestamp, buyer_confirmed: z.boolean(), can_dispute: z.boolean(), my_review_id: uuid.nullable(),
  my_rating_status: z.enum(["submitted", "not_rated", "pending"]),
}).strict();
export type Trade = z.infer<typeof tradeSchema>;
export const pendingSchema = z.object({ id: uuid, listing_id: uuid.nullable(), sold_at: timestamp, deadline: timestamp,
  state: stateSchema, action: z.enum(["select_buyer", "confirm_and_rate", "rate"]),
}).strict();
export const candidateSchema = z.object({ id: uuid, buyer_id: uuid, display_name: z.string(), created_at: timestamp }).strict();
export const eventSchema = z.object({ id: uuid, trade_id: uuid, kind: z.enum(["buyer_selected", "pending_buyer", "confirmed", "rated_buyer", "rated_seller", "disputed", "expired"]), created_at: timestamp }).strict();
export const historySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("review"), id: uuid, at: timestamp, review: reviewSchema }).strict(),
  z.object({ kind: z.literal("not_rated"), id: uuid, at: timestamp, context: contextSchema, my_role: z.enum(["buyer", "seller"]) }).strict(),
]);
export const summarySchema = z.object({ user_id: uuid, published_review_count: z.number().int().nonnegative(), counted_review_count: z.number().int().nonnegative(),
  completed_trades: z.number().int().nonnegative(), score: z.number().min(0).max(10).nullable(),
  communication_average: z.number().min(1).max(4).nullable(), payment_item_average: z.number().min(1).max(4).nullable(), meetup_average: z.number().min(1).max(4).nullable(),
  display_state: z.enum(["rated", "no_rating_yet"]),
}).strict();
export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ items: z.array(item).max(20), has_more: z.boolean(), next_cursor: cursorSchema.nullable() }).strict()
    .refine(p => p.has_more === (p.next_cursor !== null), "Invalid cursor envelope");
}
const commonTags = ["on_time", "polite", "quick_replies", "did_not_show_up", "sent_payment_link"] as const;
export const tagsFor = (role: "buyer" | "seller") => role === "buyer"
  ? [...commonTags, "item_as_described", "accurate_photos", "smooth_handover", "item_not_as_described", "changed_price", "asked_advance_payment"]
  : [...commonTags, "paid_as_agreed", "easy_pickup", "delayed_payment"];
export const textSchema = z.string().transform(s => s.normalize("NFC").replace(/^ +| +$/g, ""))
  .refine(s => Array.from(s).length <= 500, "Maximum 500 characters")
  .refine(s => !/[\u0000-\u001f\u007f-\u009f<>\u202a-\u202e\u2066-\u2069\ufeff]/u.test(s), "Invalid text");
export const requiredTextSchema = textSchema.refine(s => Array.from(s).length >= 1, "Text required");
export const reasonSchema = textSchema.refine(s => Array.from(s).length >= 3, "At least 3 characters");
export const sellSchema = z.object({ listing_id: uuid, choice: z.enum(["select", "pending", "none"]), conversation_id: uuid.nullable() }).strict()
  .refine(v => (v.choice === "select") === (v.conversation_id !== null), "Select a conversation");
export const submissionSchema = z.object({ trade_id: uuid, communication: faceSchema, payment_item: faceSchema, meetup: faceSchema,
  body: textSchema.nullable(), tags: z.array(z.string().regex(/^[a-z_]{2,40}$/)).max(5).refine(t => new Set(t).size === t.length),
}).strict();
export const buyerActionSchema = z.object({ trade_id: uuid, action: z.enum(["confirm", "dispute"]) }).strict();
export const sellResultSchema = z.object({ trade_id: uuid, state: stateSchema, deadline: timestamp }).strict();
export const buyerResultSchema = z.object({ trade_id: uuid, state: z.enum(["confirmed", "disputed"]) }).strict();
export const scoreLabel = (score: number | null, empty: string) => score === null ? empty : `${score.toFixed(1)}/10`;
export const isExpired = (deadline: string, now = Date.now()) => Date.parse(deadline) <= now;
export type Result<T> = { data: T; error?: never } | { error: "disabled" | "invalid" | "unavailable" | "unauthenticated" | "forbidden" | "expired"; data?: never };
