import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { Metadata } from "next";
import { type Notification } from "@/types/communication";
import { NotificationList } from "@/components/communication/NotificationList";

export const metadata: Metadata = {
  title: "Notifications — FairSwap",
  description: "Stay updated on your listings, messages, and account status.",
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/notifications");
  }

  const userId = userData.user.id;

  const { data: notifsData, error: notifsError } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (notifsError) {
    logger.error("notifications.list_failed", notifsError, {
      operation: "NotificationsPage",
      details: { rpc_error_code: notifsError.code || "QUERY_ERROR" },
    });
  }

  const notifications = (notifsData ?? []) as unknown as Notification[];

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
              <p className="mt-1 text-sm text-muted dark:text-neutral-300">
                Updates regarding your listings, conversations, reports, and support inquiries.
              </p>
            </div>
          </div>

          {notifsError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">We could not load your notifications.</p>
                <p className="mt-1">Your notifications are safe. Please refresh the page or try again shortly.</p>
              </div>
            </div>
          ) : (
            <NotificationList initialNotifications={notifications} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
