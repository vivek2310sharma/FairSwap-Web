import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Clock, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import type { Metadata } from "next";
import { type SupportMessage } from "@/types/communication";
import { SupportReplyForm } from "@/components/communication/SupportReplyForm";

export const metadata: Metadata = {
  title: "Ticket Discussion — FairSwap Support",
  description: "View and reply to your support inquiry.",
};

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = await params;
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect(`/auth/sign-in?next=/account/support/${ticketId}`);
  }

  const userId = userData.user.id;

  // Fetch ticket details
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select(`
      id,
      ticket_number,
      user_id,
      category,
      subject,
      status,
      priority,
      created_at,
      updated_at
    `)
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket) {
    notFound();
  }

  // Ensure customer is ticket owner
  if (ticket.user_id !== userId) {
    redirect("/account/support");
  }

  // Fetch messages (RLS ensures customer ONLY receives is_internal_note = false)
  const { data: msgData } = await supabase
    .from("support_messages")
    .select(`
      id,
      ticket_id,
      sender_id,
      is_staff_reply,
      is_internal_note,
      content,
      created_at,
      sender:profiles (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq("ticket_id", ticketId)
  const messages: SupportMessage[] = (msgData || []).map((m) => {
    const rawSender = m.sender as unknown;
    const senderObj = (Array.isArray(rawSender) ? rawSender[0] : rawSender) as {
      id?: string;
      display_name?: string;
      avatar_url?: string | null;
    } | null;

    const sender = senderObj
      ? {
          id: senderObj.id,
          display_name: senderObj.display_name || "User",
          avatar_url: senderObj.avatar_url ?? null,
        }
      : null;

    return {
      id: m.id,
      ticket_id: m.ticket_id,
      sender_id: m.sender_id,
      is_staff_reply: m.is_staff_reply,
      is_internal_note: m.is_internal_note,
      content: m.content,
      created_at: m.created_at,
      sender,
    };
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
            <Clock className="h-3 w-3" />
            Open
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case "awaiting_user":
      case "waiting_customer":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20">
            <AlertCircle className="h-3 w-3" />
            Waiting for Your Reply
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case "closed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-700/30 px-2.5 py-0.5 text-xs font-medium text-stone-400 border border-stone-700/50">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-stone-900 text-stone-100">
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/account/support"
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-500 hover:text-amber-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Support Inquiries
            </Link>
          </div>

          {/* Ticket Header */}
          <div className="rounded-2xl border border-stone-800 bg-stone-800/40 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-bold text-amber-500">
                #{ticket.ticket_number}
              </span>
              {getStatusBadge(ticket.status)}
              <span className="rounded bg-stone-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                {ticket.category.replace("_", " ")}
              </span>
              <span className="text-xs text-stone-400 ml-auto">
                Created {new Date(ticket.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="mt-3 text-xl font-bold text-white">{ticket.subject}</h1>
          </div>

          {/* Message Thread */}
          <div className="mt-6 space-y-4">
            {messages.map((m) => {
              const isStaff = m.is_staff_reply;
              const senderDisplayName = isStaff
                ? "FairSwap Support"
                : m.sender?.display_name || "You";

              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-5 ${
                    isStaff
                      ? "border-amber-500/20 bg-amber-950/10 text-stone-200"
                      : "border-stone-800 bg-stone-800/50 text-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      {isStaff ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                          <Shield className="h-3.5 w-3.5" />
                          {senderDisplayName}
                        </span>
                      ) : (
                        <span className="font-semibold text-stone-200">{senderDisplayName}</span>
                      )}
                    </div>
                    <span className="text-stone-400">
                      {new Date(m.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {ticket.status !== "closed" ? (
            <div className="mt-6">
              <SupportReplyForm ticketId={ticket.id} />
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-stone-800 bg-stone-800/20 p-4 text-center text-sm text-stone-400">
              This ticket is closed. If you have a new issue, please submit a new inquiry.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
