import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ChevronLeft, Shield } from "lucide-react";
import type { Metadata } from "next";
import { type SupportMessage, type SupportTicket } from "@/types/communication";
import { SupportReplyForm } from "@/components/communication/SupportReplyForm";
import { SupportStatusBadge } from "@/components/communication/SupportStatusBadge";
import {
  SUPPORT_CATEGORY_LABELS,
  formatTicketReference,
  supportTicketIdSchema,
} from "@/lib/support/tickets";
import { formatNotificationDateTime } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Ticket Discussion — FairSwap Support",
  description: "View and reply to your support inquiry.",
};

type TicketRow = Pick<
  SupportTicket,
  "id" | "user_id" | "category" | "subject" | "status" | "priority" | "created_at" | "updated_at"
>;
type MessageRow = Pick<
  SupportMessage,
  "id" | "ticket_id" | "sender_id" | "is_internal_note" | "content" | "created_at"
>;

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = await params;

  if (!supportTicketIdSchema.safeParse(ticketId).success) {
    notFound();
  }

  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect(`/auth/sign-in?next=/account/support/${ticketId}`);
  }

  const userId = userData.user.id;

  // Filter by owner explicitly: staff accounts can read every ticket through RLS,
  // but this page only ever shows the signed-in customer's own tickets.
  const { data: ticketData, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, user_id, category, subject, status, priority, created_at, updated_at")
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();

  const loadFailed = Boolean(ticketError);
  if (ticketError) {
    logger.error("support.load_ticket_failed", ticketError, {
      operation: "SupportTicketPage",
      details: { rpc_error_code: ticketError.code || "QUERY_ERROR" },
    });
  }

  if (!loadFailed && !ticketData) {
    notFound();
  }

  const ticket = ticketData as TicketRow | null;

  // Account status decides whether replying is offered. The Backend RPC stays the authority: it
  // rejects non-appeal replies from suspended accounts regardless of what this page renders.
  let accountStatus: string = "unavailable";
  if (ticket) {
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("account_status")
      .eq("user_id", userId)
      .maybeSingle();
    if (!accountError && account) accountStatus = account.account_status;
  }
  const canReply =
    ticket !== null &&
    (accountStatus === "active" ||
      (accountStatus === "suspended" && ticket.category === "moderation_appeal"));

  let messages: MessageRow[] = [];
  let messagesFailed = false;

  if (ticket) {
    // RLS already hides internal notes from customers; the explicit filter is defence in depth.
    const { data: msgData, error: msgError } = await supabase
      .from("support_messages")
      .select("id, ticket_id, sender_id, is_internal_note, content, created_at")
      .eq("ticket_id", ticket.id)
      .eq("is_internal_note", false)
      .order("created_at", { ascending: true });

    if (msgError) {
      messagesFailed = true;
      logger.error("support.load_messages_failed", msgError, {
        operation: "SupportTicketPage",
        details: { rpc_error_code: msgError.code || "QUERY_ERROR" },
      });
    } else {
      messages = (msgData ?? []) as MessageRow[];
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/account/support"
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-brand-link hover:underline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back to Help &amp; safety
            </Link>
          </div>

          {loadFailed || !ticket ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
            >
              <p className="font-semibold">We could not load this ticket.</p>
              <p className="mt-1">Please refresh the page or try again shortly.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold text-muted dark:text-neutral-300">
                    #{formatTicketReference(ticket.id)}
                  </span>
                  <SupportStatusBadge status={ticket.status} />
                  <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted dark:text-neutral-300">
                    {SUPPORT_CATEGORY_LABELS[ticket.category] ?? ticket.category}
                  </span>
                  <span className="ml-auto text-xs text-muted dark:text-neutral-300">
                    Created {formatNotificationDateTime(ticket.created_at)}
                  </span>
                </div>

                <h1 className="mt-3 text-xl font-bold text-foreground">{ticket.subject}</h1>
              </div>

              {messagesFailed ? (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
                >
                  <p className="font-semibold">We could not load the messages for this ticket.</p>
                  <p className="mt-1">Please refresh the page or try again shortly.</p>
                </div>
              ) : (
                <ol className="mt-6 space-y-4">
                  {messages.map((m) => {
                    // Customers only ever receive their own messages and replies from staff on their
                    // ticket. A message from someone else is therefore a FairSwap reply, but a message
                    // with no sender (removed account) cannot be attributed and is never shown as staff.
                    const sender: "you" | "support" | "unknown" =
                      m.sender_id === userId ? "you" : m.sender_id === null ? "unknown" : "support";
                    return (
                      <li
                        key={m.id}
                        className={`rounded-2xl border p-5 ${
                          sender === "support"
                            ? "border-action-600/30 bg-action-50 dark:bg-action-900/20"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3 text-xs">
                          {sender === "support" ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-action-800 dark:text-action-200">
                              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                              FairSwap Support
                            </span>
                          ) : sender === "you" ? (
                            <span className="font-semibold text-foreground">You</span>
                          ) : (
                            <span className="font-semibold text-foreground">Unknown sender</span>
                          )}
                          <span className="text-muted dark:text-neutral-300">{formatNotificationDateTime(m.created_at)}</span>
                        </div>

                        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {m.content}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {ticket.status === "closed" ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4 text-center text-sm text-muted dark:text-neutral-300">
                  This ticket is closed. If you have a new issue, please submit a new inquiry.
                </div>
              ) : canReply ? (
                <div className="mt-6">
                  <SupportReplyForm ticketId={ticket.id} />
                </div>
              ) : (
                <div
                  role="status"
                  className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
                >
                  {accountStatus === "suspended"
                    ? "Your account is suspended, so you can only reply to moderation appeals."
                    : accountStatus === "unavailable"
                      ? "We could not verify your account status, so replies are unavailable right now. Please try again shortly."
                      : "Replies are not available for this account."}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
