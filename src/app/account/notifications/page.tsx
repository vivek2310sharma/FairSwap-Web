import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: notifsData } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (notifsData || []) as unknown as Notification[];

  return (
    <div className="flex-1 bg-stone-900 text-stone-100">
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-100">Notifications</h1>
              <p className="mt-1 text-sm text-stone-400">
                Updates regarding your listings, conversations, reports, and support inquiries.
              </p>
            </div>
          </div>

          <NotificationList initialNotifications={notifications} />
        </div>
      </main>
    </div>
  );
}
