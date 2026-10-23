"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  MessageSquare,
  Tag,
  AlertTriangle,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { type Notification } from "@/types/communication";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/account/notifications/actions";
import { formatNotificationDateTime } from "@/lib/formatters";

interface NotificationListProps {
  initialNotifications: Notification[];
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const { user, refreshUnreadCounts } = useAuth();
  const [readError, setReadError] = useState<string | null>(null);
  const [notificationRows, setNotifications] = useState<Notification[]>(initialNotifications);
  const notifications = user ? notificationRows.filter(n => n.user_id === user.id) : [];
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleMarkOneRead = async (id: string) => {
    try {
      const result = await markNotificationReadAction(id);
      if (!result.success) { setReadError("Unable to mark notification as read."); return; }
      setReadError(null);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      await refreshUnreadCounts();
    } catch { setReadError("Unable to mark notification as read."); }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const result = await markAllNotificationsReadAction();
      if (!result.success) { setReadError("Unable to mark notifications as read."); return; }
      setReadError(null);
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      await refreshUnreadCounts();
    } catch { setReadError("Unable to mark notifications as read."); }
    finally { setIsMarkingAll(false); }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message_received":
        return <MessageSquare className="h-5 w-5 text-amber-500" />;
      case "listing_approved":
        return <Tag className="h-5 w-5 text-emerald-500" />;
      case "listing_rejected":
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      case "support_reply":
        return <LifeBuoy className="h-5 w-5 text-blue-500" />;
      case "report_update":
        return <ShieldAlert className="h-5 w-5 text-amber-400" />;
      default:
        return <Bell className="h-5 w-5 text-stone-400" />;
    }
  };

  const getTargetLink = (n: Notification): string | null => {
    if (n.type === "message_received" && n.payload?.conversation_id) {
      return `/account/messages/${n.payload.conversation_id}`;
    }
    if (n.type === "listing_approved" && n.payload?.slug) {
      return `/listings/${n.payload.slug}`;
    }
    if (n.type === "listing_rejected" && n.payload?.listing_id) {
      return `/account/listings`;
    }
    if (n.type === "support_reply" && n.payload?.ticket_id) {
      return `/account/support/${n.payload.ticket_id}`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {readError && <p role="alert">{readError}</p>}
      <div className="flex items-center justify-between pb-2">
        <div className="text-sm text-stone-400">
          {unreadCount > 0 ? (
            <span>
              You have <span className="font-semibold text-amber-400">{unreadCount}</span> unread{" "}
              {unreadCount === 1 ? "notification" : "notifications"}
            </span>
          ) : (
            <span>All caught up! No unread notifications.</span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800/80 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-700 hover:text-white disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-stone-800/30 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-800 text-stone-500">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-stone-200">No notifications yet</h3>
          <p className="mt-1 text-sm text-stone-400">
            When you receive inquiries, messages, or moderation updates, they will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-800/60 rounded-2xl border border-stone-800/80 bg-stone-800/40">
          {notifications.map((n) => {
            const isUnread = !n.read_at;
            const targetLink = getTargetLink(n);

            return (
              <div
                key={n.id}
                className={`group flex items-start gap-4 p-5 transition-colors ${
                  isUnread ? "bg-amber-950/10 hover:bg-amber-950/20" : "hover:bg-stone-800/30"
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-800/80 border border-stone-700/50">
                  {getNotificationIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-sm ${
                        isUnread ? "font-semibold text-white" : "font-medium text-stone-300"
                      }`}
                    >
                      {n.title}
                    </h4>
                    <span className="text-xs text-stone-400 shrink-0">
                      {formatNotificationDateTime(n.created_at)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-stone-400 leading-relaxed">{n.body}</p>

                  <div className="mt-3 flex items-center gap-3">
                    {targetLink && (
                      <Link
                        href={targetLink}
                        onClick={() => {
                          if (isUnread) handleMarkOneRead(n.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}

                    {isUnread && (
                      <button
                        onClick={() => handleMarkOneRead(n.id)}
                        className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-300"
                      >
                        <Check className="h-3 w-3" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>
                </div>

                {isUnread && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
