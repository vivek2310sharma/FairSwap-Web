import { describe, expect, it } from "vitest";
import * as c from "@/lib/ratings/contracts";
import { ratingsCopy } from "@/lib/ratings/copy";
import { at, context, envelope, ids, review } from "./ratings-fixtures";

describe("Ratings canonical consumer contract", () => {
  it("distinguishes a new NULL score from an earned numeric zero", () => {
    expect(c.scoreLabel(null, "No ratings yet")).toBe("No ratings yet");
    expect(c.scoreLabel(0, "No ratings yet")).toBe("0.0/10");
    const stats = { user_id: ids.user, published_review_count: 0, counted_review_count: 0, completed_trades: 0, score: null, communication_average: null, payment_item_average: null, meetup_average: null, display_state: "no_rating_yet" };
    expect(c.summarySchema.parse(stats).score).toBeNull();
    expect(c.summarySchema.parse({ ...stats, score: 0, counted_review_count: 3, published_review_count: 3, display_state: "rated" }).score).toBe(0);
  });
  it("accepts conversation selection and rejects arbitrary buyer keys", () => {
    expect(c.sellSchema.safeParse({ listing_id: ids.listing, choice: "select", conversation_id: ids.conversation }).success).toBe(true);
    expect(c.sellSchema.safeParse({ listing_id: ids.listing, choice: "select", buyer_id: ids.peer }).success).toBe(false);
    expect(c.sellSchema.safeParse({ listing_id: ids.listing, choice: "pending", conversation_id: ids.conversation }).success).toBe(false);
  });
  it("uses the 14-day boundary without waiting for the publisher", () => {
    const deadline = Date.parse(at) + 14 * 86400000;
    expect(c.isExpired(new Date(deadline).toISOString(), deadline - 1)).toBe(false);
    expect(c.isExpired(new Date(deadline).toISOString(), deadline)).toBe(true);
    expect(c.historySchema.parse({ kind: "not_rated", id: ids.trade, at, context, my_role: "seller" }).kind).toBe("not_rated");
    expect(c.historySchema.safeParse({ kind: "not_rated", id: ids.trade, at, context, my_role: "seller", review }).success).toBe(false);
  });
  it("validates codepoints, NFC, control characters and exact faces", () => {
    expect(c.textSchema.parse(" e\u0301 ")).toBe("é");
    expect(c.textSchema.safeParse("😊".repeat(500)).success).toBe(true);
    expect(c.textSchema.safeParse("😊".repeat(501)).success).toBe(false);
    for (const s of ["<b>", "a\nb", "\u202etest", "\ufefftext"]) expect(c.textSchema.safeParse(s).success).toBe(false);
    expect(c.faceSchema.safeParse(1.5).success).toBe(false);
    expect(c.tagsFor("buyer")).not.toContain("paid_as_agreed");
    expect(c.tagsFor("seller")).not.toContain("accurate_photos");
  });
  it("bounds pages at 20 and preserves a complete timestamp/UUID cursor", () => {
    expect(c.pageSchema(c.reviewSchema).safeParse(envelope(Array(21).fill(review))).success).toBe(false);
    expect(c.cursorSchema.safeParse({ before_at: at }).success).toBe(false);
    expect(c.pageSchema(c.reviewSchema).parse({ items: [review], has_more: true, next_cursor: { before_at: at, before_id: ids.review } }).next_cursor?.before_id).toBe(ids.review);
  });
  it("accepts only authentic typed event DTOs", () => {
    expect(c.eventSchema.safeParse({ id: ids.review, trade_id: ids.trade, kind: "confirmed", created_at: at }).success).toBe(true);
    expect(c.eventSchema.safeParse({ id: ids.review, trade_id: ids.trade, kind: "confirmed", created_at: at, content: "Pay me" }).success).toBe(false);
    expect(c.eventSchema.safeParse({ id: ids.review, trade_id: ids.trade, kind: "system_trade", created_at: at }).success).toBe(false);
  });
  it("provides English and Hindi labels and role-specific tags", () => {
    expect(ratingsCopy("hi").faces).toHaveLength(4);
    expect(ratingsCopy("hi").immutable).not.toBe(ratingsCopy("en").immutable);
    for (const locale of ["en", "hi"] as const) for (const role of ["buyer", "seller"] as const)
      for (const tag of c.tagsFor(role)) expect(ratingsCopy(locale).tagLabels[tag]).toBeTruthy();
  });
});
