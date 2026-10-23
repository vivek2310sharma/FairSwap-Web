"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Notification } from "@/types/communication";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/account/notifications/actions";
import { formatMessageDate } from "@/lib/formatters";

interface NotificationBellProps {
  userId?: string;
  initialNotifications?: Notification[];
}

export function NotificationBell({ userId: propUserId, initialNotifications = [] }: NotificationBellProps) {
  const { user, unreadNotificationsCount: unreadCount, refreshUnreadCounts } = useAuth();
  const currentUserId = user?.id;
  const [supabase] = useState(createClient);
  const [snapshot, setSnapshot] = useState<{ userId?: string; rows: Notification[] }>({
    userId: propUserId, rows: initialNotifications,
  });
  const notifications = snapshot.userId === currentUserId ? snapshot.rows : [];
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const latestUserId = useRef(currentUserId);
  useEffect(() => { latestUserId.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !isOpen) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.from("notifications")
          .select("id, user_id, type, title, body, link, read_at, created_at")
          .eq("user_id", currentUserId).order("created_at", { ascending: false }).limit(20);
        if (!active) return;
        if (error) { setError("Unable to load notifications. Please try again."); return; }
        setSnapshot({ userId: currentUserId, rows: (data ?? []) as Notification[] });
        setError(null);
      } catch { if (active) setError("Unable to load notifications. Please try again."); }
    })();
    return () => { active = false; };
  }, [currentUserId, isOpen, supabase, unreadCount]);

  const markRead = async (id?: string) => {
    const owner = currentUserId;
    try {
      const result = id ? await markNotificationReadAction(id) : await markAllNotificationsReadAction();
      if (latestUserId.current !== owner) return;
      if (!result.success) { setError("Unable to mark notifications as read. Please try again."); return; }
      setSnapshot(prev => ({ ...prev, rows: prev.rows.map(n => !id || n.id === id
        ? { ...n, read_at: n.read_at || new Date().toISOString() } : n) }));
      setError(null);
      await refreshUnreadCounts();
    } catch { if (latestUserId.current === owner) setError("Unable to mark notifications as read. Please try again."); }
  };
  const handleMarkRead = (id: string) => markRead(id);
  const handleMarkAllRead = () => markRead();
  if (!currentUserId) return null;

  return (
    <div className="relative" onKeyDown={event => { if (event.key === "Escape") { setIsOpen(false); trigger.current?.focus(); } }}>
      <button
        ref={trigger}
        aria-expanded={isOpen}
        aria-controls="header-notifications"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${(unreadCount ?? 0) > 0 ? `(${unreadCount} unread)` : ""}`}
        className="relative rounded-full p-2 text-muted hover:bg-surface hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-action-500"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-action-600 text-[10px] font-bold text-white">
            {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
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
          <div id="header-notifications" className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {(unreadCount ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-link hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {error && <p role="alert" className="py-2 text-xs">{error}</p>}
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
                        {formatMessageDate(n.created_at)}
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
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-link hover:underline"
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
                className="text-xs font-semibold text-brand-link hover:underline"
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
