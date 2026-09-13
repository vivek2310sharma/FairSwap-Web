"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Notification } from "@/types/communication";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/account/notifications/actions";

interface NotificationBellProps {
  userId?: string;
  initialNotifications?: Notification[];
}

export function NotificationBell({ userId: propUserId, initialNotifications = [] }: NotificationBellProps) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(propUserId);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!propUserId) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setCurrentUserId(data.user.id);
          // Fetch initial notifications if none were passed
          if (initialNotifications.length === 0) {
            supabase
              .from("notifications")
              .select("id, user_id, type, title, body, link, read_at, created_at")
              .eq("user_id", data.user.id)
              .order("created_at", { ascending: false })
              .limit(20)
              .then(({ data: nData }) => {
                if (nData) setNotifications(nData as unknown as Notification[]);
              });
          }
        }
      });
    }
  }, [propUserId, supabase, initialNotifications.length]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!currentUserId) return;

    // Subscribe to real-time notification events
    const channel = supabase
      .channel(`user-notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    await markNotificationReadAction(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    await markAllNotificationsReadAction();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        className="relative rounded-full p-2 text-muted hover:bg-surface hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-brand-500"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  No notifications yet.
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`py-3 px-2 rounded-lg transition-colors ${
                      !n.read_at ? "bg-brand-50/50 dark:bg-brand-950/20" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground">{n.title}</h4>
                      <span className="text-[10px] text-muted whitespace-nowrap">
                        {new Date(n.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.read_at) handleMarkRead(n.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          <span>View</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span />
                      )}
                      {!n.read_at && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-muted hover:text-foreground"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 border-t border-border pt-2 text-center">
              <Link
                href="/account/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View all notifications &rarr;
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
