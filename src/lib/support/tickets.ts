import { z } from "zod";

/**
 * Canonical support-ticket contract shared by every Web support surface.
 *
 * Values mirror `public.support_ticket_category_enum` in FairSwap-Backend
 * (migration 20260914000013) and the generated `src/types/database.ts`.
 * Do not add values here without a matching Backend migration; iOS and Android
 * decode the same enum.
 */
export const SUPPORT_TICKET_CATEGORIES = [
  "general",
  "account",
  "moderation_appeal",
  "safety",
  "bug",
] as const;

export const supportTicketCategorySchema = z.enum(SUPPORT_TICKET_CATEGORIES, {
  errorMap: () => ({ message: "Please choose a valid support category." }),
});

export type SupportTicketCategory = z.infer<typeof supportTicketCategorySchema>;

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  general: "General question",
  account: "Account & privacy",
  moderation_appeal: "Moderation appeal",
  safety: "Safety & scam concern",
  bug: "Report a problem with the site",
};

/** Categories a customer can pick in the general support form. */
export const CUSTOMER_SELECTABLE_CATEGORIES: readonly SupportTicketCategory[] = [
  "general",
  "account",
  "safety",
  "bug",
  "moderation_appeal",
];

/** Limits enforced by `public.support_tickets` / `public.support_messages` CHECK constraints. */
export const SUPPORT_LIMITS = {
  subjectMin: 3,
  subjectMax: 150,
  messageMin: 1,
  messageMax: 3000,
} as const;

const subjectSchema = z
  .string({ required_error: "Subject is required." })
  .trim()
  .min(SUPPORT_LIMITS.subjectMin, `Subject must be at least ${SUPPORT_LIMITS.subjectMin} characters.`)
  .max(SUPPORT_LIMITS.subjectMax, `Subject cannot exceed ${SUPPORT_LIMITS.subjectMax} characters.`);

const messageSchema = (min: number) =>
  z
    .string({ required_error: "Message is required." })
    .trim()
    .min(min, min > 1 ? `Please describe the issue in at least ${min} characters.` : "Message is required.")
    .max(SUPPORT_LIMITS.messageMax, `Message cannot exceed ${SUPPORT_LIMITS.messageMax} characters.`);

export const createSupportTicketInputSchema = z.object({
  category: supportTicketCategorySchema,
  subject: subjectSchema,
  message: messageSchema(SUPPORT_LIMITS.messageMin),
});

/**
 * The "Report a scam" form deliberately has no category field: the server fixes
 * it to `safety`, so a tampered client cannot change where the ticket lands.
 */
export const SCAM_REPORT_MESSAGE_MIN = 20;

export const scamReportInputSchema = z.object({
  subject: subjectSchema,
  message: messageSchema(SCAM_REPORT_MESSAGE_MIN),
});

export const supportTicketIdSchema = z.string().uuid();

/** Short, human-friendly reference derived from the ticket UUID (the table has no ticket_number). */
export function formatTicketReference(ticketId: string): string {
  return ticketId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Converts raw `create_support_ticket` / reply RPC failures into customer-safe text.
 * Raw database messages are never returned.
 */
export function mapSupportRpcError(message: string | undefined | null): string {
  const text = message ?? "";
  if (text.includes("RATE_LIMIT_EXCEEDED")) {
    return "You have reached the limit of 3 support tickets in 24 hours. Please try again later or reply to an existing ticket.";
  }
  if (text.includes("Suspended accounts may only submit moderation appeals")) {
    return "Your account is suspended. You can only submit a moderation appeal.";
  }
  if (text.includes("Account restricted")) {
    return "Your account cannot create support tickets right now.";
  }
  if (text.includes("Not authenticated")) {
    return "Please sign in to continue.";
  }
  return "We could not submit your request. Please try again shortly.";
}

/** Shown when a create request may or may not have produced a ticket. Never invites an immediate retry. */
export const SUPPORT_UNCERTAIN_MESSAGE =
  "We could not confirm that your request was submitted. Please check your tickets before trying again, so you do not send it twice.";

/** Safe fallback for failed reply or lookup calls; raw exception text is never shown to users. */
export const SUPPORT_GENERIC_NETWORK_MESSAGE =
  "We could not complete that request. Please check your connection and try again.";

/**
 * True when the error came from the database or PostgREST (a SQLSTATE such as `P0001` or a
 * `PGRST…` code), meaning the call was processed and rejected. Errors without such a code, such
 * as network failures, leave the outcome unknown because the write may have committed.
 */
export function isDefinitiveRpcFailure(error: { code?: string | null } | null | undefined): boolean {
  const code = error?.code;
  return typeof code === "string" && /^([0-9A-Z]{5}|PGRST\d{3})$/.test(code);
}
