import { redirect } from "next/navigation";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { LifeBuoy, AlertCircle, ChevronRight, ShieldAlert, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { type SupportTicket } from "@/types/communication";
import { CreateTicketDialog } from "@/components/communication/CreateTicketDialog";
import { SupportStatusBadge } from "@/components/communication/SupportStatusBadge";
import { SCAM_REPORT_HREF } from "@/components/account/ReportScamStrip";
import { SUPPORT_CATEGORY_LABELS, formatTicketReference } from "@/lib/support/tickets";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import { formatNotificationDateTime } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Help & safety — FairSwap",
  description: "Get assistance from the FairSwap team, report a scam or submit moderation appeals.",
};

type TicketRow = Pick<
  SupportTicket,
  "id" | "category" | "subject" | "status" | "priority" | "created_at" | "updated_at"
>;

export default async function SupportPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/support");
  }

  const userId = userData.user.id;

  // Account status lives on user_accounts (profiles has no such column).
  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("account_status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = accountError || !account ? "unavailable" : account.account_status;
  const isActive = status === "active";
  const isSuspended = status === "suspended";
  // RLS only exposes tickets to active or suspended accounts.
  const canReadTickets = isActive || isSuspended;

  let tickets: TicketRow[] = [];
  let ticketsFailed = false;

  if (canReadTickets) {
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("support_tickets")
      .select("id, category, subject, status, priority, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (ticketsError) {
      ticketsFailed = true;
      logger.error("support.list_tickets_failed", ticketsError, {
        operation: "SupportPage",
        details: { rpc_error_code: ticketsError.code || "QUERY_ERROR" },
      });
    } else {
      tickets = (ticketsData ?? []) as TicketRow[];
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {isSuspended && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <span>Account suspended</span>
              </div>
              <p className="mt-1 text-sm">
                Your account is suspended from marketplace actions. You can submit a moderation appeal below.
              </p>
            </div>
          )}

          {!canReadTickets && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <span>Support tickets are unavailable</span>
              </div>
              <p className="mt-1 text-sm">
                {status === "unavailable"
                  ? "We could not verify your account status right now. Please try again shortly."
                  : "Support tickets are not available for this account."}
              </p>
            </div>
          )}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Help &amp; safety</h1>
              <p className="mt-1 text-sm text-muted dark:text-neutral-300">
                Contact FairSwap support, report a scam or follow up on an existing ticket.
              </p>
            </div>

            {canReadTickets ? <CreateTicketDialog isSuspended={isSuspended} /> : null}
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {isActive ? (
              <Link
                href={SCAM_REPORT_HREF}
                className="flex min-h-[56px] items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
              >
                <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
                Report a scam
              </Link>
            ) : null}
            <a
              href={`${HELP_CENTRE_URL}/articles/avoid-upi-scams`}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-semibold text-foreground hover:bg-surface"
            >
              <ExternalLink className="h-5 w-5 shrink-0" aria-hidden="true" />
              Safety tips (Help Centre)
            </a>
            <Link
              href="/grievance"
              className="flex min-h-[56px] items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-semibold text-foreground hover:bg-surface"
            >
              <LifeBuoy className="h-5 w-5 shrink-0" aria-hidden="true" />
              Grievance Officer
            </Link>
          </div>

          <h2 className="mb-3 text-lg font-bold text-foreground">Your tickets</h2>

          {ticketsFailed ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
            >
              <p className="font-semibold">We could not load your support tickets.</p>
              <p className="mt-1">Your tickets are safe. Please refresh the page or try again shortly.</p>
            </div>
          ) : !canReadTickets ? null : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-muted dark:text-neutral-300">
                <LifeBuoy className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No support tickets</h3>
              <p className="mt-1 text-sm text-muted dark:text-neutral-300">
                You have not submitted any inquiries yet. Choose &quot;New inquiry&quot; if you need help.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/account/support/${t.id}`}
                    className="flex min-h-[44px] items-center justify-between p-4 transition-colors hover:bg-surface sm:p-5"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-muted dark:text-neutral-300">
                          #{formatTicketReference(t.id)}
                        </span>
                        <SupportStatusBadge status={t.status} />
                        <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted dark:text-neutral-300">
                          {SUPPORT_CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      </div>

                      <h3 className="mt-2 truncate text-base font-semibold text-foreground">{t.subject}</h3>

                      <p className="mt-1 text-xs text-muted dark:text-neutral-300">
                        Updated {formatNotificationDateTime(t.updated_at)}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 shrink-0 text-muted dark:text-neutral-300" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
