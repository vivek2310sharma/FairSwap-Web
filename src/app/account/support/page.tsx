import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { LifeBuoy, Clock, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { type SupportTicket } from "@/types/communication";
import { CreateTicketDialog } from "@/components/communication/CreateTicketDialog";

export const metadata: Metadata = {
  title: "Support & Help — FairSwap",
  description: "Get assistance from the FairSwap team or submit moderation appeals.",
};

export default async function SupportPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/support");
  }

  const userId = userData.user.id;

  // Check account status to show banner if suspended
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .single();

  const isSuspended = profile?.account_status === "suspended";

  // Fetch customer's tickets
  const { data: ticketsData } = await supabase
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
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const tickets = (ticketsData || []) as unknown as SupportTicket[];

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
            Action Required
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
    <div className="flex min-h-screen flex-col bg-stone-900 text-stone-100">
      <Header />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {isSuspended && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-5 w-5 text-rose-400" />
                <span>Account Suspended</span>
              </div>
              <p className="mt-1 text-sm text-rose-300/80">
                Your account is currently suspended from marketplace actions. You may submit an appeal using the support form below.
              </p>
            </div>
          )}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-100">Help & Support</h1>
              <p className="mt-1 text-sm text-stone-400">
                Have questions or need assistance with an issue? Contact our support staff.
              </p>
            </div>

            <CreateTicketDialog isSuspended={isSuspended} />
          </div>

          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-stone-800/30 p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-800 text-stone-500">
                  <LifeBuoy className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-200">No support tickets</h3>
                <p className="mt-1 text-sm text-stone-400">
                  You have not submitted any inquiries yet. Click &quot;New Inquiry&quot; if you need help.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-800/60 rounded-2xl border border-stone-800/80 bg-stone-800/40">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/account/support/${t.id}`}
                    className="flex items-center justify-between p-5 transition-colors hover:bg-stone-800/50"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-amber-500">
                          #{t.ticket_number}
                        </span>
                        {getStatusBadge(t.status)}
                        <span className="rounded bg-stone-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
                          {t.category.replace("_", " ")}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-semibold text-stone-200 truncate">
                        {t.subject}
                      </h3>

                      <p className="mt-1 text-xs text-stone-400">
                        Updated {new Date(t.updated_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-stone-500 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
