import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StaffSupportReplyForm } from "@/components/communication/StaffSupportReplyForm";
import { ChevronLeft, Lock, Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Ticket Detail — FairSwap Admin",
  description: "View and respond to support inquiries.",
};

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ticketId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect(`/auth/sign-in?next=/admin/support/${ticketId}`);
  }

  // Verify staff role
  const { data: staffData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!staffData || !["administrator", "support_agent"].includes(staffData.role)) {
    redirect("/admin");
  }

  // Fetch ticket
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(`
      id,
      ticket_number,
      user_id,
      category,
      subject,
      status,
      priority,
      assigned_to,
      created_at,
      updated_at
    `)
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    notFound();
  }

  // Fetch ticket submitter profile
  const { data: userObj } = await supabase
    .from("profiles")
    .select("id, display_name, account_status")
    .eq("id", ticket.user_id)
    .maybeSingle();

  // Fetch all messages (staff can see internal notes!)
  const { data: messages } = await supabase
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
        display_name
      )
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Support Queue
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 cols: Ticket Overview & Thread */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-700">
                  #{ticket.ticket_number}
                </span>
                <span className="rounded bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-700">
                  {ticket.category.replace("_", " ")}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Created {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>

            <h1 className="mt-3 text-xl font-bold text-gray-900">{ticket.subject}</h1>

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
              <div>
                User: <span className="font-semibold text-gray-900">{userObj?.display_name || "Deleted User"}</span>
              </div>
              <div>
                Account Status: <span className="font-semibold text-gray-900 uppercase">{userObj?.account_status || "unknown"}</span>
              </div>
              <div>
                User ID: <span className="font-mono text-gray-500">{ticket.user_id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4">
            {messages && messages.length > 0 ? (
              messages.map((m) => {
                const isInternal = m.is_internal_note;
                const isStaff = m.is_staff_reply;
                const senderObj = Array.isArray(m.sender) ? m.sender[0] : m.sender;
                const senderName = isStaff
                  ? senderObj?.display_name || "Staff Member"
                  : userObj?.display_name || "Customer";

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-5 shadow-xs transition-colors ${
                      isInternal
                        ? "border-amber-300 bg-amber-50/70"
                        : isStaff
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 text-xs">
                      <div className="flex items-center gap-2">
                        {isInternal ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                            <Lock className="h-3 w-3" />
                            Internal Note (Staff Only)
                          </span>
                        ) : isStaff ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                            <Shield className="h-3.5 w-3.5" />
                            {senderName} (Staff Reply)
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-800">
                            {senderName} (Customer)
                          </span>
                        )}
                      </div>

                      <span className="text-gray-500">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-3 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                      {m.content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-gray-500">
                No messages recorded on this ticket.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 col: Reply & Status Management */}
        <div>
          <StaffSupportReplyForm
            ticketId={ticket.id}
            currentStatus={ticket.status}
            currentPriority={ticket.priority}
          />
        </div>
      </div>
    </div>
  );
}
